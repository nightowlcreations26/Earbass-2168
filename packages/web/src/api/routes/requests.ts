import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";

const withTrack = {
  id: s.usageRequests.id,
  trackId: s.usageRequests.trackId,
  artistId: s.usageRequests.artistId,
  requesterId: s.usageRequests.requesterId,
  requesterName: s.usageRequests.requesterName,
  platform: s.usageRequests.platform,
  purpose: s.usageRequests.purpose,
  message: s.usageRequests.message,
  creditLine: s.usageRequests.creditLine,
  status: s.usageRequests.status,
  reply: s.usageRequests.reply,
  createdAt: s.usageRequests.createdAt,
  decidedAt: s.usageRequests.decidedAt,
  trackTitle: s.tracks.title,
  trackCover: s.tracks.coverUrl,
  artistName: s.profiles.artistName,
};

export const requests = {
  create: authed
    .input(
      z.object({
        trackId: z.number(),
        platform: z.string().min(1).max(40),
        purpose: z.string().min(3).max(200),
        message: z.string().max(1000).optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const [t] = await db.select().from(s.tracks).where(eq(s.tracks.id, input.trackId));
      if (!t) throw new ORPCError("NOT_FOUND");
      if (t.userId === context.user.id) throw new ORPCError("BAD_REQUEST", { message: "That's your own track." });
      const [pending] = await db
        .select()
        .from(s.usageRequests)
        .where(and(eq(s.usageRequests.trackId, t.id), eq(s.usageRequests.requesterId, context.user.id), eq(s.usageRequests.status, "pending")));
      if (pending) throw new ORPCError("CONFLICT", { message: "You already have a pending request for this track." });
      const [r] = await db
        .insert(s.usageRequests)
        .values({
          trackId: t.id,
          artistId: t.userId,
          requesterId: context.user.id,
          requesterName: context.user.name || context.user.email,
          platform: input.platform,
          purpose: input.purpose,
          message: input.message ?? "",
        })
        .returning();
      return r;
    }),

  /** Requests other creators sent to me (as artist). */
  inbox: authed.handler(({ context }) =>
    db
      .select(withTrack)
      .from(s.usageRequests)
      .innerJoin(s.tracks, eq(s.tracks.id, s.usageRequests.trackId))
      .innerJoin(s.profiles, eq(s.profiles.userId, s.usageRequests.artistId))
      .where(eq(s.usageRequests.artistId, context.user.id))
      .orderBy(desc(s.usageRequests.createdAt)),
  ),

  /** Requests I sent (as content creator). */
  sent: authed.handler(({ context }) =>
    db
      .select(withTrack)
      .from(s.usageRequests)
      .innerJoin(s.tracks, eq(s.tracks.id, s.usageRequests.trackId))
      .innerJoin(s.profiles, eq(s.profiles.userId, s.usageRequests.artistId))
      .where(eq(s.usageRequests.requesterId, context.user.id))
      .orderBy(desc(s.usageRequests.createdAt)),
  ),

  pendingCount: authed.handler(async ({ context }) => {
    const [r] = await db
      .select({ n: sql<number>`count(*)` })
      .from(s.usageRequests)
      .where(and(eq(s.usageRequests.artistId, context.user.id), eq(s.usageRequests.status, "pending")));
    return Number(r?.n ?? 0);
  }),

  forTrack: authed.input(z.object({ trackId: z.number() })).handler(async ({ input, context }) => {
    const [r] = await db
      .select()
      .from(s.usageRequests)
      .where(and(eq(s.usageRequests.trackId, input.trackId), eq(s.usageRequests.requesterId, context.user.id)))
      .orderBy(desc(s.usageRequests.createdAt))
      .limit(1);
    return r ?? null;
  }),

  decide: authed
    .input(z.object({ id: z.number(), status: z.enum(["approved", "declined"]), reply: z.string().max(500).optional(), creditLine: z.string().max(200).optional() }))
    .handler(async ({ input, context }) => {
      const [r] = await db
        .update(s.usageRequests)
        .set({ status: input.status, reply: input.reply ?? null, creditLine: input.creditLine ?? null, decidedAt: new Date() })
        .where(and(eq(s.usageRequests.id, input.id), eq(s.usageRequests.artistId, context.user.id)))
        .returning();
      if (!r) throw new ORPCError("NOT_FOUND");
      return r;
    }),
};
