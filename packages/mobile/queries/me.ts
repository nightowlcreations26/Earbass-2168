import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/lib/api";
import { authClient } from "@/lib/auth";

export function useMe() {
  const session = authClient.useSession();
  const signedIn = !!session.data?.user;
  const me = useQuery({ ...orpc.me.get.queryOptions(), enabled: signedIn });
  return { session, signedIn, me };
}

export const useMyTracks = (enabled: boolean) => useQuery({ ...orpc.me.tracks.queryOptions(), enabled });
export const useLiked = (enabled: boolean) => useQuery({ ...orpc.catalog.liked.queryOptions(), enabled });

type CreateInput = Parameters<typeof client.me.createTrack>[0];

export function useUploadTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { file: { uri: string; name: string; mimeType?: string; file?: File }; meta: Omit<CreateInput, "audioUrl"> }) => {
      const contentType = args.file.mimeType || "audio/mpeg";
      const signed = await client.me.presign({ filename: args.file.name, contentType, kind: "audio" });
      const blob = args.file.file ?? (await (await fetch(args.file.uri)).blob());
      const put = await fetch(signed.url, {
        method: "PUT",
        headers: { "Content-Type": contentType, "x-amz-acl": "public-read" },
        body: blob,
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      return client.me.createTrack({ ...args.meta, audioUrl: signed.publicUrl });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orpc.me.key() });
      qc.invalidateQueries({ queryKey: orpc.catalog.key() });
      qc.invalidateQueries({ queryKey: orpc.leaderboard.key() });
    },
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => client.me.deleteTrack({ id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.me.key() }),
  });
}
