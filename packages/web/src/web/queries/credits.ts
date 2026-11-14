import { orpc } from "../lib/api";

export const creditsStatusQuery = (enabled: boolean) => orpc.credits.status.queryOptions({ enabled });
export const creditsCheckoutMutation = () => orpc.credits.checkout.mutationOptions();
export const creditsPortalMutation = () => orpc.credits.portal.mutationOptions();
export const connectKeyMutation = () => orpc.credits.connectKey.mutationOptions();
export const removeKeyMutation = () => orpc.credits.removeKey.mutationOptions();
export const adStartMutation = () => orpc.credits.adStart.mutationOptions();
export const adClaimMutation = () => orpc.credits.adClaim.mutationOptions();
export const deleteSongMutation = () => orpc.studio.deleteSong.mutationOptions();
export type CreditsStatus = Awaited<ReturnType<typeof import("../lib/api").client.credits.status>>;
export const lengthLabel = (s: number) => (s < 60 ? `${s}s` : `${s / 60} min`);
