import { z } from "zod";
import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { generateText } from "ai";
import dedent from "dedent";
import { authed, withUser } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { gateway } from "../lib/gateway";
import { putPublic } from "../lib/s3";
import { COSTS, FREE_MAX_SECONDS, ensureAccount, spendCredits } from "../lib/billing";
import { PROVIDER_INFO, decryptSecret, generateWith, type ProviderSecret } from "../lib/song-engines";
import type { Provider } from "../database/schema";

export const PAD_TRACKS = ["kick", "snare", "clap", "hat", "openhat", "perc", "bass", "stab"] as const;

const patternSchema = z.object({
  bpm: z.number().min(60).max(200),
  swing: z.number().min(0).max(0.6),
  steps: z.number(),
  tracks: z.array(
    z.object({
      id: z.string(),
      steps: z.array(z.boolean()),
      volume: z.number().min(0).max(1),
      muted: z.boolean(),
      note: z.array(z.number()).optional(),
    }),
  ),
});

function normalize(raw: unknown) {
  const r = raw as { bpm?: number; swing?: number; tracks?: Record<string, { steps?: (number | boolean)[]; notes?: number[] }> ; name?: string };
  const bpm = Math.min(200, Math.max(60, Math.round(Number(r.bpm) || 128)));
  const swing = Math.min(0.6, Math.max(0, Number(r.swing) || 0));
  const tracks = PAD_TRACKS.map((id) => {
    const src = r.tracks?.[id];
    const steps = Array.from({ length: 16 }, (_, i) => !!src?.steps?.[i]);
    const note = Array.from({ length: 16 }, (_, i) => Math.max(-12, Math.min(12, Math.round(Number(src?.notes?.[i]) || 0))));
    return { id, steps, volume: 0.8, muted: false, note };
  });
  return { name: typeof r.name === "string" ? r.name.slice(0, 40) : "AI Pattern", pattern: { bpm, swing, steps: 16, tracks } };
}

export const studio = {
  generatePattern: withUser.input(z.object({ prompt: z.string().min(2).max(300) })).handler(async ({ input }) => {
    const { text } = await generateText({
      model: gateway("anthropic/claude-haiku-4.5"),
      prompt: dedent`
        You are a producer programming a 16-step drum machine + bass + synth stab.
        Genres you know deeply: EDM, techno, drum and bass (174bpm, half-time feel uses kick on 1 and 11, snare on 5 and 13), melodic techno, mextech (latin tech house percussion), house, night bass (swung UKG-ish), bass boosted, breakbeats.
        Tracks: ${PAD_TRACKS.join(", ")}. Each has "steps": 16 values of 1 or 0.
        "bass" and "stab" also have "notes": 16 semitone offsets from the root (-12..12) used on active steps.
        Respect the genre's real tempo and groove. swing 0..0.6 (0 = straight, 0.25 = UKG shuffle).
        Request: "${input.prompt}"
        Reply with ONLY JSON: {"name": string, "bpm": number, "swing": number, "tracks": {"kick": {"steps": [...]}, ..., "bass": {"steps": [...], "notes": [...]}, "stab": {"steps": [...], "notes": [...]}}}
      `,
    });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new ORPCError("BAD_GATEWAY", { message: "AI returned no pattern" });
    try {
      return normalize(JSON.parse(match[0]));
    } catch {
      throw new ORPCError("BAD_GATEWAY", { message: "AI pattern was malformed, try again" });
    }
  }),

  saveBeat: authed.input(z.object({ name: z.string().min(1).max(60), pattern: patternSchema })).handler(async ({ input, context }) => {
    const [b] = await db.insert(s.beats).values({ userId: context.user.id, name: input.name, pattern: input.pattern }).returning();
    return b;
  }),

  beats: authed.handler(({ context }) =>
    db.select().from(s.beats).where(eq(s.beats.userId, context.user.id)).orderBy(desc(s.beats.createdAt)),
  ),

  deleteBeat: authed.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    await db.delete(s.beats).where(and(eq(s.beats.id, input.id), eq(s.beats.userId, context.user.id)));
    return { ok: true };
  }),

  songEngine: withUser.handler(() => ({ available: !!process.env.ELEVENLABS_API_KEY })),

  generateSong: authed
    .input(
      z.object({
        prompt: z.string().trim().min(3).max(600),
        seconds: z.union([z.literal(30), z.literal(60), z.literal(120), z.literal(180)]),
        engine: z.enum(["earbass", ...s.PROVIDERS]).default("earbass"),
      }),
    )
    .handler(async ({ input, context }) => {
      const uid = context.user.id;
      const acct = await ensureAccount(context.user);
      if (input.seconds > FREE_MAX_SECONDS && acct.plan === "free") {
        throw new ORPCError("FORBIDDEN", { message: "Songs longer than 1 minute need an Earbass membership." });
      }
      const inFlight = await db.select({ id: s.aiSongs.id }).from(s.aiSongs).where(and(eq(s.aiSongs.userId, uid), eq(s.aiSongs.status, "pending")));
      if (inFlight.length >= 2) throw new ORPCError("TOO_MANY_REQUESTS", { message: "Two songs are already composing. Wait for one to finish." });

      let secret: ProviderSecret;
      let cost = 0;
      if (input.engine === "earbass") {
        const key = process.env.ELEVENLABS_API_KEY;
        if (!key) throw new ORPCError("PRECONDITION_FAILED", { message: "The Earbass engine is offline. Connect your own key to keep creating." });
        cost = COSTS[input.seconds];
        const [p] = await db
          .select({ n: sql<number>`coalesce(sum(${s.aiSongs.credits}), 0)` })
          .from(s.aiSongs)
          .where(and(eq(s.aiSongs.userId, uid), eq(s.aiSongs.status, "pending")));
        if (acct.balance - Number(p?.n ?? 0) < cost) {
          throw new ORPCError("PAYMENT_REQUIRED", { message: `This song needs ${cost} credit${cost > 1 ? "s" : ""}. Watch an ad, buy a pack, or use your own key.` });
        }
        secret = { key };
      } else {
        const [k] = await db.select().from(s.providerKeys).where(and(eq(s.providerKeys.userId, uid), eq(s.providerKeys.provider, input.engine)));
        if (!k) throw new ORPCError("PRECONDITION_FAILED", { message: `Connect your ${PROVIDER_INFO[input.engine].name} key first.` });
        secret = JSON.parse(decryptSecret(k.secret)) as ProviderSecret;
      }

      const [row] = await db
        .insert(s.aiSongs)
        .values({ userId: uid, prompt: input.prompt, audioUrl: "", provider: input.engine, seconds: input.seconds, credits: cost, status: "pending" })
        .returning();

      // Compose in the background; the client polls `songs`.
      const provider: Provider = input.engine === "earbass" ? "elevenlabs" : input.engine;
      void (async () => {
        try {
          const buf = await generateWith(provider, secret, input.prompt, input.seconds);
          const url = await putPublic(`ai-songs/${uid}/${row.id}-${Date.now()}.mp3`, buf, "audio/mpeg");
          if (cost) await spendCredits(uid, cost);
          await db.update(s.aiSongs).set({ audioUrl: url, status: "ready" }).where(eq(s.aiSongs.id, row.id));
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Generation failed.";
          console.error("[ai-song]", row.id, msg);
          await db.update(s.aiSongs).set({ status: "failed", error: msg.slice(0, 300) }).where(eq(s.aiSongs.id, row.id));
        }
      })();
      return row;
    }),

  songs: authed.handler(async ({ context }) => {
    // Anything stuck pending for 12+ minutes (e.g. server restart) is marked failed, uncharged.
    await db
      .update(s.aiSongs)
      .set({ status: "failed", error: "Generation was interrupted. You weren't charged." })
      .where(and(eq(s.aiSongs.userId, context.user.id), eq(s.aiSongs.status, "pending"), lt(s.aiSongs.createdAt, new Date(Date.now() - 12 * 60_000))));
    return db.select().from(s.aiSongs).where(eq(s.aiSongs.userId, context.user.id)).orderBy(desc(s.aiSongs.createdAt));
  }),

  deleteSong: authed.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    await db.delete(s.aiSongs).where(and(eq(s.aiSongs.id, input.id), eq(s.aiSongs.userId, context.user.id), ne(s.aiSongs.status, "pending")));
    return { ok: true };
  }),
};
