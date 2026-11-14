import { z } from "zod";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { AD_DAILY_LIMIT, AD_SECONDS, COSTS, FREE_CREDITS, FREE_MAX_SECONDS, MEMBERSHIPS, PACKS, autumn, ensureAccount, grantCredits, siteOrigin } from "../lib/billing";
import { PROVIDER_INFO, encryptSecret, validateKey } from "../lib/song-engines";

const startOfDay = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

async function adsClaimedToday(userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(s.adViews)
    .where(and(eq(s.adViews.userId, userId), isNotNull(s.adViews.claimedAt), gte(s.adViews.claimedAt, startOfDay())));
  return Number(r?.n ?? 0);
}

async function pendingCredits(userId: string) {
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${s.aiSongs.credits}), 0)` })
    .from(s.aiSongs)
    .where(and(eq(s.aiSongs.userId, userId), eq(s.aiSongs.status, "pending")));
  return Number(r?.n ?? 0);
}

export async function listKeys(userId: string) {
  return db
    .select({ provider: s.providerKeys.provider, hint: s.providerKeys.hint, createdAt: s.providerKeys.createdAt })
    .from(s.providerKeys)
    .where(eq(s.providerKeys.userId, userId));
}

const backUrl = (origin: string | undefined, backPath: string, extra: string) => {
  const back = backPath.startsWith("/") ? backPath : "/credits";
  return `${siteOrigin(origin)}${back}${back.includes("?") ? "&" : "?"}${extra}`;
};

const checkoutInput = z.object({ origin: z.string().url().optional(), backPath: z.string().max(200).default("/credits") });

export const credits = {
  /** Everything the credits screen needs. Also grants the 3 free credits on first call. */
  status: authed.handler(async ({ context }) => {
    const acct = await ensureAccount(context.user);
    const [ads, pending, keys] = await Promise.all([adsClaimedToday(context.user.id), pendingCredits(context.user.id), listKeys(context.user.id)]);
    return {
      balance: acct.balance,
      available: Math.max(0, acct.balance - pending),
      plan: acct.plan,
      renewsAt: acct.renewsAt,
      canceling: acct.canceling,
      ads: { today: ads, limit: AD_DAILY_LIMIT, seconds: AD_SECONDS, left: Math.max(0, AD_DAILY_LIMIT - ads) },
      keys: keys.map((k) => ({ ...k, ...PROVIDER_INFO[k.provider] })),
      providers: s.PROVIDERS.map((id) => ({ id, ...PROVIDER_INFO[id] })),
      costs: COSTS,
      freeCredits: FREE_CREDITS,
      freeMaxSeconds: FREE_MAX_SECONDS,
      packs: PACKS,
      memberships: MEMBERSHIPS,
      platformEngine: !!process.env.ELEVENLABS_API_KEY,
    };
  }),

  /** Stripe checkout for a credit pack or a membership. */
  checkout: authed
    .input(checkoutInput.extend({ item: z.enum(["pack_10", "pack_25", "pack_60", "pro", "pro_byok"]) }))
    .handler(async ({ input, context }) => {
      const acct = await ensureAccount(context.user);
      const successUrl = backUrl(input.origin, input.backPath, `paid=${input.item}`);
      const pack = PACKS.find((p) => p.id === input.item);
      if (pack) {
        const res = await autumn.billing.attach({
          customerId: context.user.id,
          planId: pack.id,
          featureQuantities: [{ featureId: "song_credits", quantity: pack.credits }],
          successUrl,
        });
        return { paymentUrl: res.paymentUrl ?? null };
      }
      if (acct.plan === input.item) throw new ORPCError("BAD_REQUEST", { message: "You're already on this membership." });
      if (input.item === "pro_byok") {
        const keys = await listKeys(context.user.id);
        if (!keys.length) throw new ORPCError("PRECONDITION_FAILED", { message: "Connect your own AI music key first to get the $4.20 membership." });
      }
      const res = await autumn.billing.attach({ customerId: context.user.id, planId: input.item, successUrl });
      if (!res.paymentUrl) await ensureAccount(context.user);
      return { paymentUrl: res.paymentUrl ?? null };
    }),

  /** Stripe billing portal: cancel or change the membership, update the card, see invoices. */
  portal: authed.input(checkoutInput).handler(async ({ input, context }) => {
    await ensureAccount(context.user);
    const r = await autumn.billing.openCustomerPortal({ customerId: context.user.id, returnUrl: backUrl(input.origin, input.backPath, "portal=1") });
    return { url: r.url };
  }),

  connectKey: authed
    .input(z.object({ provider: z.enum(s.PROVIDERS), key: z.string().trim().min(8).max(400), customerId: z.string().trim().max(200).optional() }))
    .handler(async ({ input, context }) => {
      const secret = { key: input.key, customerId: input.customerId || undefined };
      try {
        await validateKey(input.provider, secret);
      } catch (e) {
        throw new ORPCError("BAD_REQUEST", { message: e instanceof Error ? e.message : "That key didn't work." });
      }
      const row = { secret: encryptSecret(JSON.stringify(secret)), hint: `…${input.key.slice(-4)}`, createdAt: new Date() };
      await db
        .insert(s.providerKeys)
        .values({ userId: context.user.id, provider: input.provider, ...row })
        .onConflictDoUpdate({ target: [s.providerKeys.userId, s.providerKeys.provider], set: row });
      return { provider: input.provider, hint: row.hint };
    }),

  removeKey: authed.input(z.object({ provider: z.enum(s.PROVIDERS) })).handler(async ({ input, context }) => {
    await db.delete(s.providerKeys).where(and(eq(s.providerKeys.userId, context.user.id), eq(s.providerKeys.provider, input.provider)));
    return { ok: true };
  }),

  /** Starts a rewarded sponsored spot: a promoted Earbass track plays for AD_SECONDS. */
  adStart: authed.handler(async ({ context }) => {
    if ((await adsClaimedToday(context.user.id)) >= AD_DAILY_LIMIT) {
      throw new ORPCError("TOO_MANY_REQUESTS", { message: `You've watched ${AD_DAILY_LIMIT} ads today. Come back tomorrow.` });
    }
    const [t] = await db
      .select({
        id: s.tracks.id,
        title: s.tracks.title,
        coverUrl: s.tracks.coverUrl,
        audioUrl: s.tracks.audioUrl,
        genre: s.tracks.genre,
        artistName: s.profiles.artistName,
        userId: s.tracks.userId,
      })
      .from(s.tracks)
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(eq(s.profiles.approved, true))
      .orderBy(sql`random()`)
      .limit(1);
    const [v] = await db.insert(s.adViews).values({ userId: context.user.id, trackId: t?.id ?? null, startedAt: new Date() }).returning();
    return { viewId: v.id, seconds: AD_SECONDS, track: t ?? null };
  }),

  adClaim: authed.input(z.object({ viewId: z.number() })).handler(async ({ input, context }) => {
    const [v] = await db.select().from(s.adViews).where(and(eq(s.adViews.id, input.viewId), eq(s.adViews.userId, context.user.id)));
    if (!v) throw new ORPCError("NOT_FOUND");
    if (v.claimedAt) throw new ORPCError("BAD_REQUEST", { message: "Already claimed." });
    if (Date.now() - v.startedAt.getTime() < AD_SECONDS * 1000 - 500) throw new ORPCError("BAD_REQUEST", { message: "Watch the whole ad to earn the credit." });
    if ((await adsClaimedToday(context.user.id)) >= AD_DAILY_LIMIT) throw new ORPCError("TOO_MANY_REQUESTS", { message: "Daily ad limit reached." });
    const flipped = await db
      .update(s.adViews)
      .set({ claimedAt: new Date() })
      .where(and(eq(s.adViews.id, v.id), sql`${s.adViews.claimedAt} is null`))
      .returning();
    if (!flipped.length) throw new ORPCError("BAD_REQUEST", { message: "Already claimed." });
    await ensureAccount(context.user);
    await grantCredits(context.user.id, 1);
    return { granted: 1 };
  }),

  /** Recent songs across engines — for "used X credits" history. */
  history: authed.handler(({ context }) =>
    db
      .select({ id: s.aiSongs.id, provider: s.aiSongs.provider, seconds: s.aiSongs.seconds, credits: s.aiSongs.credits, status: s.aiSongs.status, createdAt: s.aiSongs.createdAt })
      .from(s.aiSongs)
      .where(eq(s.aiSongs.userId, context.user.id))
      .orderBy(desc(s.aiSongs.createdAt))
      .limit(20),
  ),
};
