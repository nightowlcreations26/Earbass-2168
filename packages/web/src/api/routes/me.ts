import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { publicUrl, s3 } from "../lib/s3";
import { APPROVAL_RULES, GENRE_IDS } from "../lib/genres";
import { pointsFor } from "../lib/points";
import { computeLeaderboard } from "./leaderboard";
import { trackSelect } from "./catalog";

const linksSchema = z.object({
  spotify: z.string().optional(),
  soundcloud: z.string().optional(),
  appleMusic: z.string().optional(),
  youtube: z.string().optional(),
  suno: z.string().optional(),
  udio: z.string().optional(),
  bandcamp: z.string().optional(),
});

async function ensureProfile(user: { id: string; name: string; image?: string | null }) {
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.userId, user.id));
  if (p) return p;
  const [created] = await db
    .insert(s.profiles)
    .values({ userId: user.id, artistName: user.name || "New Artist", avatarUrl: user.image ?? null })
    .returning();
  return created;
}

async function status(userId: string) {
  const mine = await db.select({ origin: s.tracks.origin }).from(s.tracks).where(eq(s.tracks.userId, userId));
  const ai = mine.filter((t) => t.origin === "ai").length;
  const original = mine.filter((t) => t.origin === "original").length;
  return { ai, original, total: mine.length, qualifies: ai >= APPROVAL_RULES.ai || original >= APPROVAL_RULES.original };
}

async function syncApproval(userId: string) {
  const st = await status(userId);
  const [p] = await db.select().from(s.profiles).where(eq(s.profiles.userId, userId));
  if (p && st.qualifies && !p.approved) {
    await db.update(s.profiles).set({ approved: true, approvedAt: new Date() }).where(eq(s.profiles.userId, userId));
    return { ...st, justApproved: true };
  }
  return { ...st, justApproved: false };
}

export const me = {
  get: authed.handler(async ({ context }) => {
    const profile = await ensureProfile(context.user);
    const st = await status(context.user.id);
    const { ranked, champion } = await computeLeaderboard();
    const mine = ranked.find((r) => r.userId === context.user.id);
    return {
      user: { id: context.user.id, email: context.user.email, name: context.user.name },
      profile,
      approval: { ...st, rules: APPROVAL_RULES },
      points: { ...pointsFor(st.total), rank: mine?.rank ?? null },
      isChampion: champion?.userId === context.user.id,
    };
  }),

  update: authed
    .input(z.object({ artistName: z.string().min(1).max(60), bio: z.string().max(500), avatarUrl: z.string().nullable().optional(), links: linksSchema }))
    .handler(async ({ input, context }) => {
      await ensureProfile(context.user);
      const [p] = await db
        .update(s.profiles)
        .set({ artistName: input.artistName, bio: input.bio, links: input.links, ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}) })
        .where(eq(s.profiles.userId, context.user.id))
        .returning();
      return p;
    }),

  presign: authed
    .input(z.object({ filename: z.string(), contentType: z.string(), kind: z.enum(["audio", "cover", "avatar"]) }))
    .handler(async ({ input, context }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const key = `${input.kind}/${context.user.id}/${Date.now()}-${safe}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: input.contentType, ACL: "public-read" }),
        { expiresIn: 900, signableHeaders: new Set(["x-amz-acl"]) },
      );
      return { url, key, publicUrl: publicUrl(key) };
    }),

  createTrack: authed
    .input(
      z.object({
        title: z.string().min(1).max(100),
        genre: z.enum(GENRE_IDS),
        origin: z.enum(["ai", "original"]),
        aiTool: z.string().max(40).optional(),
        description: z.string().max(1000).optional(),
        audioUrl: z.string().min(1),
        coverUrl: z.string().optional(),
        bpm: z.number().int().min(40).max(250).optional(),
        durationSec: z.number().int().optional(),
        links: linksSchema.optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      await ensureProfile(context.user);
      const before = pointsFor((await status(context.user.id)).total);
      const [t] = await db
        .insert(s.tracks)
        .values({ ...input, description: input.description ?? "", links: input.links ?? {}, userId: context.user.id })
        .returning();
      const approval = await syncApproval(context.user.id);
      const after = pointsFor(approval.total);
      return { track: t, approval, pointsEarned: after.points - before.points, points: after };
    }),

  tracks: authed.handler(async ({ context }) =>
    db
      .select(trackSelect)
      .from(s.tracks)
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(eq(s.tracks.userId, context.user.id))
      .orderBy(desc(s.tracks.createdAt)),
  ),

  deleteTrack: authed.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    const res = await db
      .delete(s.tracks)
      .where(and(eq(s.tracks.id, input.id), eq(s.tracks.userId, context.user.id)))
      .returning();
    if (!res.length) throw new ORPCError("NOT_FOUND");
    return { ok: true };
  }),
};
