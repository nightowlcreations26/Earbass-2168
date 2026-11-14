import { orpc } from "../lib/api";

export const meQuery = (enabled = true) => orpc.me.get.queryOptions({ enabled });
export const myTracksQuery = () => orpc.me.tracks.queryOptions();
export const updateProfileMutation = () => orpc.me.update.mutationOptions();
export const createTrackMutation = () => orpc.me.createTrack.mutationOptions();
export const deleteTrackMutation = () => orpc.me.deleteTrack.mutationOptions();

export const inboxQuery = () => orpc.requests.inbox.queryOptions();
export const sentQuery = () => orpc.requests.sent.queryOptions();
export const pendingCountQuery = (enabled: boolean) => orpc.requests.pendingCount.queryOptions({ enabled });
export const trackRequestQuery = (trackId: number, enabled: boolean) => orpc.requests.forTrack.queryOptions({ input: { trackId }, enabled });
export const createRequestMutation = () => orpc.requests.create.mutationOptions();
export const decideRequestMutation = () => orpc.requests.decide.mutationOptions();
