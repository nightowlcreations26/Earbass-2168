// Entry point referenced by index.html — mounts via the template-managed
// bootstrap in __main.tsx, then finishes any returning managed sign-in
// (useSession() updates reactively once it resolves).
import "./__main";
import { authClient } from "./lib/auth";

await authClient.managedAuth.handleRedirect();
