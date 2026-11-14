import { useState } from "react";
import { useLocation } from "wouter";
import { authClient } from "@/lib/auth";
import { Logo } from "@/components/shell";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, nav] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === "up"
        ? await authClient.signUp.email({ name: name || email.split("@")[0], email, password })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) setError(res.error.message ?? "Something went wrong");
    else nav("/me");
  };

  const google = async () => {
    setError(null);
    const r = await authClient.managedAuth.signIn({ provider: "google" });
    if (r.error && r.error.code !== "POPUP_CLOSED") setError(r.error.message);
    else if (!r.error) nav("/me");
  };

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-[28px] md:block">
        <img src="/images/hero.jpg" alt="" className="h-[520px] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute bottom-0 p-8">
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            Quick & easy way to get your <span className="text-grad">music heard</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">EDM · Techno · DnB · Melodic · Mextech · House · Night Bass · Breaks</p>
        </div>
      </div>
      <div>
        <Logo className="text-3xl" />
        <h1 className="mt-6 font-display text-2xl font-bold">{mode === "in" ? "Welcome back" : "Create your artist account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Approval is automatic: 3 AI songs or 2 originals.</p>
        <button onClick={google} className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white py-3.5 text-sm font-semibold text-black">
          <svg viewBox="0 0 24 24" className="size-5"><path fill="#4285F4" d="M22.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-7.9z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.2a11 11 0 0 0 0 9.9l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.1 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5.4 12 5.4z"/></svg>
          Continue with Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-dim">
          <span className="h-px flex-1 bg-white/10" /> or email <span className="h-px flex-1 bg-white/10" />
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === "up" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name" aria-label="Artist name" className="w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          )}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className="w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" aria-label="Password (8+ characters)" className="w-full rounded-2xl bg-surface-2 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-grad py-3.5 text-sm font-semibold glow disabled:opacity-60">
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "in" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "in" ? "up" : "in")} className={cn("font-semibold text-pink")}>
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
