import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { Autumn } from "autumn-js";
import { base } from "../__core/app";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";

const autumn = new Autumn();

export const PLATFORM_ID = "earbass";
export const PLATFORM_FUND = {
  name: "Earbass",
  goal: 5000,
  pitch: "Keep Earbass free for every bedroom producer: storage, streaming and the AI studio.",
};
const FEATURE = "donation_dollars";
const PLAN = "donation";

async function summarize(recipientId: string) {
  const paid = and(eq(s.donations.recipientId, recipientId), eq(s.donations.status, "paid"));
  const [agg] = await db
    .select({
      raised: sql<number>`coalesce(sum(${s.donations.amount}), 0)`,
      supporters: sql<number>`count(distinct ${s.donations.donorId})`,
      count: sql<number>`count(*)`,
    })
    .from(s.donations)
    .where(paid);
  const recent = await db
    .select({
      id: s.donations.id,
      donorName: s.donations.donorName,
      amount: s.donations.amount,
      message: s.donations.message,
      source: s.donations.source,
      paidAt: s.donations.paidAt,
    })
    .from(s.donations)
    .where(paid)
    .orderBy(desc(s.donations.paidAt))
    .limit(5);
  return { raised: Number(agg?.raised ?? 0), supporters: Number(agg?.supporters ?? 0), count: Number(agg?.count ?? 0), recent };
}

/** Settles a pending donation if Autumn shows the donor's purchased dollars. Idempotent. */
async function settle(donationId: number, donorId: string) {
  const [d] = await db.select().from(s.donations).where(eq(s.donations.id, donationId));
  if (!d || d.donorId !== donorId) throw new ORPCError("NOT_FOUND");
  if (d.status === "paid") return { status: "paid" as const, amount: d.amount, recipientId: d.recipientId };
  const customer = await autumn.customers.getOrCreate({ customerId: donorId });
  const remaining = customer.balances?.[FEATURE]?.remaining ?? 0;
  if (remaining < d.amount) return { status: "pending" as const, amount: d.amount, recipientId: d.recipientId };
  // Flip status first so a concurrent confirm can't double-consume the balance.
  const flipped = await db
    .update(s.donations)
    .set({ status: "paid", paidAt: new Date() })
    .where(and(eq(s.donations.id, d.id), eq(s.donations.status, "pending")))
    .returning();
  if (flipped.length) await autumn.track({ customerId: donorId, featureId: FEATURE, value: d.amount });
  return { status: "paid" as const, amount: d.amount, recipientId: d.recipientId };
}

export const donations = {
  /** Donation bar data for an artist (userId) or the platform fund ("earbass"). */
  summary: base.input(z.object({ recipientId: z.string() })).handler(async ({ input }) => {
    const stats = await summarize(input.recipientId);
    if (input.recipientId === PLATFORM_ID) {
      return { recipientId: PLATFORM_ID, name: PLATFORM_FUND.name, goal: PLATFORM_FUND.goal, pitch: PLATFORM_FUND.pitch, ...stats };
    }
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.userId, input.recipientId));
    if (!p) throw new ORPCError("NOT_FOUND");
    return { recipientId: p.userId, name: p.artistName, goal: p.donationGoal, pitch: p.donationPitch, ...stats };
  }),

  checkout: authed
    .input(
      z.object({
        recipientId: z.string(),
        trackId: z.number().optional(),
        amount: z.number().int().min(1).max(1000),
        message: z.string().max(140).default(""),
        source: z.enum(["web", "app"]).default("web"),
        origin: z.string().url().optional(),
        backPath: z.string().max(200).default("/"),
      }),
    )
    .handler(async ({ input, context }) => {
      if (input.recipientId === context.user.id) throw new ORPCError("BAD_REQUEST", { message: "You can't donate to yourself." });
      if (input.recipientId !== PLATFORM_ID) {
        const [p] = await db.select({ id: s.profiles.userId }).from(s.profiles).where(eq(s.profiles.userId, input.recipientId));
        if (!p) throw new ORPCError("NOT_FOUND");
      }
      const [me] = await db.select({ name: s.profiles.artistName }).from(s.profiles).where(eq(s.profiles.userId, context.user.id));
      const [d] = await db
        .insert(s.donations)
        .values({
          recipientId: input.recipientId,
          trackId: input.trackId ?? null,
          donorId: context.user.id,
          donorName: me?.name || context.user.name || "A listener",
          amount: input.amount,
          message: input.message.trim(),
          source: input.source,
        })
        .returning();

      await autumn.customers.getOrCreate({ customerId: context.user.id, name: context.user.name, email: context.user.email });
      const origin = (input.origin && /^https?:\/\//.test(input.origin) ? input.origin : process.env.WEBSITE_URL ?? "").replace(/\/$/, "");
      const back = input.backPath.startsWith("/") ? input.backPath : "/";
      const successUrl = `${origin}/donate/thanks?d=${d.id}&back=${encodeURIComponent(back)}`;
      const res = await autumn.billing.attach({
        customerId: context.user.id,
        planId: PLAN,
        featureQuantities: [{ featureId: FEATURE, quantity: input.amount }],
        successUrl,
      });
      if (res.paymentUrl) return { donationId: d.id, paymentUrl: res.paymentUrl, status: "pending" as const };
      // Saved card charged straight away — settle now.
      const settled = await settle(d.id, context.user.id);
      return { donationId: d.id, paymentUrl: null, status: settled.status };
    }),

  confirm: authed.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    const r = await settle(input.id, context.user.id);
    const name =
      r.recipientId === PLATFORM_ID
        ? PLATFORM_FUND.name
        : ((await db.select({ n: s.profiles.artistName }).from(s.profiles).where(eq(s.profiles.userId, r.recipientId)))[0]?.n ?? "the artist");
    return { ...r, recipientName: name };
  }),

  setGoal: authed
    .input(z.object({ goal: z.number().int().min(10).max(1_000_000).nullable(), pitch: z.string().max(200) }))
    .handler(async ({ input, context }) => {
      const [p] = await db
        .update(s.profiles)
        .set({ donationGoal: input.goal, donationPitch: input.pitch.trim() })
        .where(eq(s.profiles.userId, context.user.id))
        .returning();
      if (!p) throw new ORPCError("NOT_FOUND", { message: "Create your profile first." });
      return { goal: p.donationGoal, pitch: p.donationPitch };
    }),

  /** Donations the signed-in artist received. */
  received: authed.handler(async ({ context }) => {
    return summarize(context.user.id);
  }),
};
