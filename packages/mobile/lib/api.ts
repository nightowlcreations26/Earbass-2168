import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@template/web";
import { API_URL, getToken } from "./auth";

const link = new RPCLink({
  url: `${API_URL}/api/rpc`,
  headers: () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

/** Direct typed client: await client.catalog.home() */
export const client: AppRouterClient = createORPCClient(link);

/** TanStack Query helpers */
export const orpc = createTanstackQueryUtils(client);

export type TrackItem = Awaited<ReturnType<AppRouterClient["catalog"]["home"]>>["newUpdates"][number];
