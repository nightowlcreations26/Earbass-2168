import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/lib/api";

export const useHome = () => useQuery(orpc.catalog.home.queryOptions());
export const useGenre = (genre: string) => useQuery(orpc.catalog.genre.queryOptions({ input: { genre } }));
export const useSearch = (q: string) =>
  useQuery({ ...orpc.catalog.search.queryOptions({ input: { q } }), enabled: q.trim().length > 0 });
export const useTrack = (id: number) => useQuery(orpc.catalog.track.queryOptions({ input: { id } }));
export const useArtist = (userId: string) => useQuery(orpc.catalog.artist.queryOptions({ input: { userId } }));
export const useLeaderboard = () => useQuery(orpc.leaderboard.list.queryOptions());

export function useToggleLike(id: number) {
  const qc = useQueryClient();
  const key = orpc.catalog.track.queryKey({ input: { id } });
  return useMutation({
    mutationFn: () => client.catalog.toggleLike({ id }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: typeof prev) =>
        old ? { ...old, liked: !old.liked, track: { ...old.track, likes: old.track.likes + (old.liked ? -1 : 1) } } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: orpc.catalog.liked.key() });
    },
  });
}

export const useLikedIds = (enabled: boolean) => useQuery({ ...orpc.catalog.likedIds.queryOptions(), enabled });

/** Heart toggle for list rows/tiles (optimistic on the liked-id set). */
export function useToggleLikeById() {
  const qc = useQueryClient();
  const key = orpc.catalog.likedIds.queryKey();
  return useMutation({
    mutationFn: (id: number) => client.catalog.toggleLike({ id }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<number[]>(key);
      qc.setQueryData<number[]>(key, (old = []) => (old.includes(id) ? old.filter((x) => x !== id) : [...old, id]));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: orpc.catalog.key() }),
  });
}
