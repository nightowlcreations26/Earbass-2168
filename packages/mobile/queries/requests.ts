import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc, client } from "@/lib/api";

export const useInbox = (enabled: boolean) => useQuery({ ...orpc.requests.inbox.queryOptions(), enabled });
export const useSent = (enabled: boolean) => useQuery({ ...orpc.requests.sent.queryOptions(), enabled });
export const useRequestForTrack = (trackId: number, enabled: boolean) =>
  useQuery({ ...orpc.requests.forTrack.queryOptions({ input: { trackId } }), enabled });

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.requests.create>[0]) => client.requests.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.requests.key() }),
  });
}

export function useDecideRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.requests.decide>[0]) => client.requests.decide(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.requests.key() }),
  });
}
