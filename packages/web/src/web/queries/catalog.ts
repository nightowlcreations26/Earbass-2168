import { orpc } from "../lib/api";

export const homeQuery = () => orpc.catalog.home.queryOptions();
export const genreQuery = (genre: string) => orpc.catalog.genre.queryOptions({ input: { genre } });
export const searchQuery = (q: string) => orpc.catalog.search.queryOptions({ input: { q }, enabled: q.trim().length > 0 });
export const trackQuery = (id: number) => orpc.catalog.track.queryOptions({ input: { id } });
export const artistQuery = (userId: string) => orpc.catalog.artist.queryOptions({ input: { userId } });
export const likedQuery = () => orpc.catalog.liked.queryOptions();
export const toggleLikeMutation = () => orpc.catalog.toggleLike.mutationOptions();
export const leaderboardQuery = () => orpc.leaderboard.list.queryOptions();
export const championQuery = () => orpc.leaderboard.champion.queryOptions();
export const likedIdsQuery = () => orpc.catalog.likedIds.queryOptions();
