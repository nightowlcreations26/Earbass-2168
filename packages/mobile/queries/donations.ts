import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { orpc, client } from "@/lib/api";
import { API_URL } from "@/lib/auth";

export const PLATFORM_ID = "earbass";

export const useDonationSummary = (recipientId: string) => useQuery(orpc.donations.summary.queryOptions({ input: { recipientId } }));
export const useDonationsReceived = (enabled: boolean) => useQuery({ ...orpc.donations.received.queryOptions(), enabled });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Opens Stripe checkout in an in-app browser, then settles the donation once the browser closes. */
export function useDonate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { recipientId: string; trackId?: number; amount: number; message: string }) => {
      const r = await client.donations.checkout({ ...input, source: "app", origin: API_URL || undefined, backPath: "/" });
      if (!r.paymentUrl) return { status: r.status, amount: input.amount };
      await WebBrowser.openBrowserAsync(r.paymentUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
      for (let i = 0; i < 6; i++) {
        const c = await client.donations.confirm({ id: r.donationId });
        if (c.status === "paid") return { status: "paid" as const, amount: input.amount };
        await wait(2000);
      }
      return { status: "pending" as const, amount: input.amount };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: orpc.donations.key() }),
  });
}

export function useSetDonationGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { goal: number | null; pitch: string }) => client.donations.setGoal(input),
    onSuccess: () => qc.invalidateQueries(),
  });
}
