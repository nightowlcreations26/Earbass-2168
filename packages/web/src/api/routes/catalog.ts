import { z } from "zod";
import { and, desc, eq, gte, like, or, sql, inArray } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { withUser, authed } from "../middleware/auth";
import { db } from "../database";
import * as s from "../database/schema";
import { GENRES } from "../lib/genres";

export const trackSelect = {
  id: s.tracks.id,
  userId: s.tracks.userId,
  title: s.tracks.title,
  genre: s.tracks.genre,
  origin: s.tracks.origin,
  aiTool: s.tracks.aiTool,
  description: s.tracks.description,
  audioUrl: s.tracks.audioUrl,
  coverUrl: s.tracks.coverUrl,
  bpm: s.tracks.bpm,
  durationSec: s.tracks.durationSec,
  plays: s.tracks.plays,
  likes: s.tracks.likes,
  featured: s.tracks.featured,
  links: s.tracks.links,
  createdAt: s.tracks.createdAt,
  artistName: s.profiles.artistName,
  artistAvatar: s.profiles.avatarUrl,
  artistLinks: s.profiles.links,
};

export type TrackItem = Awaited<ReturnType<typeof publicTracks>>[number];

function publicTracks() {
  return db
    .select(trackSelect)
    .from(s.tracks)
    .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
    .where(eq(s.profiles.approved, true))
    .$dynamic();
}

const approvedOnly = eq(s.profiles.approved, true);

export const catalog = {
  home: base.handler(async () => {
    const weekAgo = new Date(Date.now() - 7 * 864e5);

    const [featured] = await publicTracks()
      .where(and(approvedOnly, eq(s.tracks.featured, true)))
      .orderBy(desc(s.tracks.createdAt))
      .limit(1);

    const newUpdates = await publicTracks().orderBy(desc(s.tracks.createdAt)).limit(12);

    const popular = await publicTracks()
      .orderBy(desc(sql`${s.tracks.plays} + ${s.tracks.likes} * 5`))
      .limit(12);

    const recent = await db
      .select({ trackId: s.playEvents.trackId, n: sql<number>`count(*)`.as("n") })
      .from(s.playEvents)
      .where(gte(s.playEvents.createdAt, weekAgo))
      .groupBy(s.playEvents.trackId)
      .orderBy(desc(sql`n`))
      .limit(12);
    let trending = recent.length
      ? await publicTracks().where(and(approvedOnly, inArray(s.tracks.id, recent.map((r) => r.trackId))))
      : [];
    const rank = new Map(recent.map((r, i) => [r.trackId, i]));
    trending.sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
    if (trending.length < 6) {
      const ids = new Set(trending.map((t) => t.id));
      trending = [...trending, ...popular.filter((p) => !ids.has(p.id))].slice(0, 12);
    }

    const counts = await db
      .select({ genre: s.tracks.genre, n: sql<number>`count(*)` })
      .from(s.tracks)
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(approvedOnly)
      .groupBy(s.tracks.genre);
    const countMap = new Map(counts.map((c) => [c.genre, Number(c.n)]));
    const categories = GENRES.map((g) => ({ ...g, count: countMap.get(g.id) ?? 0 }));

    const artists = await db
      .select({
        userId: s.profiles.userId,
        artistName: s.profiles.artistName,
        avatarUrl: s.profiles.avatarUrl,
        plays: sql<number>`coalesce(sum(${s.tracks.plays}),0)`,
      })
      .from(s.profiles)
      .leftJoin(s.tracks, eq(s.tracks.userId, s.profiles.userId))
      .where(approvedOnly)
      .groupBy(s.profiles.userId)
      .orderBy(desc(sql`coalesce(sum(${s.tracks.plays}),0)`))
      .limit(10);

    return { featured: featured ?? popular[0] ?? null, newUpdates, popular, trending, categories, artists };
  }),

  genre: base.input(z.object({ genre: z.string() })).handler(async ({ input }) => {
    const meta = GENRES.find((g) => g.id === input.genre);
    if (!meta) throw new ORPCError("NOT_FOUND");
    const items = await publicTracks()
      .where(and(approvedOnly, eq(s.tracks.genre, input.genre)))
      .orderBy(desc(s.tracks.plays));
    return { genre: meta, tracks: items };
  }),

  search: base.input(z.object({ q: z.string() })).handler(async ({ input }) => {
    const q = `%${input.q.trim()}%`;
    if (input.q.trim().length < 1) return [];
    return publicTracks()
      .where(and(approvedOnly, or(like(s.tracks.title, q), like(s.profiles.artistName, q), like(s.tracks.genre, q))))
      .orderBy(desc(s.tracks.plays))
      .limit(30);
  }),

  track: withUser.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    const [t] = await db
      .select(trackSelect)
      .from(s.tracks)
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(eq(s.tracks.id, input.id));
    if (!t) throw new ORPCError("NOT_FOUND");
    let liked = false;
    if (context.user) {
      const [l] = await db
        .select()
        .from(s.trackLikes)
        .where(and(eq(s.trackLikes.userId, context.user.id), eq(s.trackLikes.trackId, t.id)));
      liked = !!l;
    }
    const more = await publicTracks()
      .where(and(approvedOnly, eq(s.tracks.genre, t.genre)))
      .orderBy(desc(s.tracks.plays))
      .limit(8);
    return { track: t, liked, more: more.filter((m) => m.id !== t.id) };
  }),

  artist: base.input(z.object({ userId: z.string() })).handler(async ({ input }) => {
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.userId, input.userId));
    if (!p) throw new ORPCError("NOT_FOUND");
    const items = await db
      .select(trackSelect)
      .from(s.tracks)
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(eq(s.tracks.userId, input.userId))
      .orderBy(desc(s.tracks.createdAt));
    const totalPlays = items.reduce((a, t) => a + t.plays, 0);
    return { profile: p, tracks: p.approved ? items : [], totalPlays };
  }),

  play: base.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.update(s.tracks).set({ plays: sql`${s.tracks.plays} + 1` }).where(eq(s.tracks.id, input.id));
    await db.insert(s.playEvents).values({ trackId: input.id });
    return { ok: true };
  }),

  toggleLike: authed.input(z.object({ id: z.number() })).handler(async ({ input, context }) => {
    const where = and(eq(s.trackLikes.userId, context.user.id), eq(s.trackLikes.trackId, input.id));
    const [existing] = await db.select().from(s.trackLikes).where(where);
    if (existing) {
      await db.delete(s.trackLikes).where(where);
      await db.update(s.tracks).set({ likes: sql`max(${s.tracks.likes} - 1, 0)` }).where(eq(s.tracks.id, input.id));
      return { liked: false };
    }
    await db.insert(s.trackLikes).values({ userId: context.user.id, trackId: input.id });
    await db.update(s.tracks).set({ likes: sql`${s.tracks.likes} + 1` }).where(eq(s.tracks.id, input.id));
    return { liked: true };
  }),

  /** Track ids the current user liked (empty when signed out) — powers like hearts on cards. */
  likedIds: withUser.handler(async ({ context }) => {
    if (!context.user) return [] as number[];
    const rows = await db.select({ id: s.trackLikes.trackId }).from(s.trackLikes).where(eq(s.trackLikes.userId, context.user.id));
    return rows.map((r) => r.id);
  }),

  liked: authed.handler(async ({ context }) => {
    return db
      .select(trackSelect)
      .from(s.trackLikes)
      .innerJoin(s.tracks, eq(s.tracks.id, s.trackLikes.trackId))
      .innerJoin(s.profiles, eq(s.profiles.userId, s.tracks.userId))
      .where(eq(s.trackLikes.userId, context.user.id))
      .orderBy(desc(s.tracks.createdAt));
  }),
};
