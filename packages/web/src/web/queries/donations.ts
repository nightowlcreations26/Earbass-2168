import { orpc } from "../lib/api";

export const PLATFORM_ID = "earbass";
export const donationSummaryQuery = (recipientId: string) => orpc.donations.summary.queryOptions({ input: { recipientId } });
export const donationCheckoutMutation = () => orpc.donations.checkout.mutationOptions();
export const donationConfirmMutation = () => orpc.donations.confirm.mutationOptions();
export const donationReceivedQuery = (enabled: boolean) => orpc.donations.received.queryOptions({ enabled });
export const setDonationGoalMutation = () => orpc.donations.setGoal.mutationOptions();
