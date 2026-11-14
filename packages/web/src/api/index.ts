import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { auth } from "./auth";
import { ping } from "./routes/ping";
import { catalog } from "./routes/catalog";
import { me } from "./routes/me";
import { studio } from "./routes/studio";
import { leaderboard } from "./routes/leaderboard";
import { requests } from "./routes/requests";
import { donations } from "./routes/donations";
import { credits } from "./routes/credits";

export const router = {
  ping,
  catalog,
  me,
  studio,
  leaderboard,
  requests,
  donations,
  credits,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export default app;
