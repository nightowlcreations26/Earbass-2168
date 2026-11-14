import { eq, sql } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import * as s from "../database/schema";
import { pointsFor, POINTS_EVERY, POINTS_PER_MILESTONE } from "../lib/points";

export async function computeLeaderboard() {
  const rows = await db
    .select({
      userId: s.profiles.userId,
      artistName: s.profiles.artistName,
      avatarUrl: s.profiles.avatarUrl,
      uploads: sql<number>`count(${s.tracks.id})`,
      plays: sql<number>`coalesce(sum(${s.tracks.plays}),0)`,
      likes: sql<number>`coalesce(sum(${s.tracks.likes}),0)`,
    })
    .from(s.profiles)
    .leftJoin(s.tracks, eq(s.tracks.userId, s.profiles.userId))
    .where(eq(s.profiles.approved, true))
    .groupBy(s.profiles.userId);

  const ranked = rows
    .map((r) => ({ ...r, plays: Number(r.plays), likes: Number(r.likes), ...pointsFor(Number(r.uploads)) }))
    .sort((a, b) => b.points - a.points || b.plays - a.plays || b.uploads - a.uploads)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const champion = ranked[0] && ranked[0].points > 0 ? ranked[0] : null;
  return { ranked, champion };
}

export const leaderboard = {
  list: base.handler(async () => {
    const { ranked, champion } = await computeLeaderboard();
    return {
      rules: { every: POINTS_EVERY, points: POINTS_PER_MILESTONE },
      champion,
      ranked: ranked.slice(0, 50),
    };
  }),
  champion: base.handler(async () => (await computeLeaderboard()).champion),
};
