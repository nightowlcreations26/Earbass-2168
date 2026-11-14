import { Autumn } from "autumn-js";
import { eq } from "drizzle-orm";
import { db } from "../database";
import * as s from "../database/schema";

export const autumn = new Autumn();

export const CREDITS = "song_credits";
export const FREE_CREDITS = 3;
export const AD_SECONDS = 15;
export const AD_DAILY_LIMIT = 5;
/** Song length (seconds) → credits. */
export const COSTS: Record<number, number> = { 30: 1, 60: 2, 120: 4, 180: 6 };
export const FREE_MAX_SECONDS = 60;

export const PACKS = [
  { id: "pack_10", credits: 10, price: 5 },
  { id: "pack_25", credits: 25, price: 10 },
  { id: "pack_60", credits: 60, price: 20 },
] as const;
export const MEMBERSHIPS = [
  { id: "pro", name: "Earbass Pro", price: 10, monthlyCredits: 40, needsKey: false },
  { id: "pro_byok", name: "Pro with your own key", price: 4.2, monthlyCredits: 0, needsKey: true },
] as const;
export type PlanId = "free" | "pro" | "pro_byok";

type User = { id: string; name: string; email: string };

/** Creates the Autumn customer, grants the one-time free credits, and mirrors the membership to the profile. */
export async function ensureAccount(user: User) {
  let customer = await autumn.customers.getOrCreate({ customerId: user.id, name: user.name, email: user.email });
  const granted = await db
    .insert(s.creditAccounts)
    .values({ userId: user.id, freeGrantedAt: new Date() })
    .onConflictDoNothing()
    .returning();
  if (granted.length) {
    try {
      await autumn.balances.create({ customerId: user.id, featureId: CREDITS, includedGrant: FREE_CREDITS });
      customer = await autumn.customers.getOrCreate({ customerId: user.id });
    } catch (e) {
      await db.delete(s.creditAccounts).where(eq(s.creditAccounts.userId, user.id));
      throw e;
    }
  }
  const active = (customer.subscriptions ?? []).filter((x) => x.status === "active").map((x) => x.planId);
  const plan: PlanId = active.includes("pro") ? "pro" : active.includes("pro_byok") ? "pro_byok" : "free";
  const sub = (customer.subscriptions ?? []).find((x) => x.planId === plan);
  await db.update(s.profiles).set({ plan }).where(eq(s.profiles.userId, user.id));
  return {
    customer,
    plan,
    balance: customer.balances?.[CREDITS]?.remaining ?? 0,
    renewsAt: sub?.currentPeriodEnd ?? null,
    canceling: !!sub?.canceledAt,
  };
}

/** Grants a one-time (never-expiring) credit balance. */
export const grantCredits = (customerId: string, amount: number) =>
  autumn.balances.create({ customerId, featureId: CREDITS, includedGrant: amount });

export const spendCredits = (customerId: string, amount: number) =>
  autumn.track({ customerId, featureId: CREDITS, value: amount, async: false });

export function siteOrigin(origin?: string) {
  return (origin && /^https?:\/\//.test(origin) ? origin : (process.env.WEBSITE_URL ?? "")).replace(/\/$/, "");
}
