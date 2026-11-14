import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { HandHeart, Heart, Loader2, Lock, X, Smartphone, Globe } from "lucide-react";
import { authClient } from "@/lib/auth";
import { orpc } from "@/lib/api";
import { donationCheckoutMutation, donationReceivedQuery, donationSummaryQuery, PLATFORM_ID, setDonationGoalMutation } from "@/queries/donations";
import { cn } from "@/lib/utils";

const PRESETS = [3, 5, 10, 25, 50];
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

function Meter({ raised, goal, className }: { raised: number; goal: number | null; className?: string }) {
  const pct = goal ? Math.min(100, (raised / goal) * 100) : 100;
  return (
    <div className={cn("relative h-2.5 overflow-hidden rounded-full bg-white/8", className)}>
      <div
        className={cn("h-full rounded-full bg-grad transition-[width] duration-1000 ease-out", !goal && "opacity-40")}
        style={{ width: `${Math.max(pct, raised > 0 ? 3 : 0)}%` }}
      />
      {goal && pct >= 100 && <div className="absolute inset-0 animate-pulse bg-white/15" />}
    </div>
  );
}

/** Support-this-artist bar. `recipientId` is an artist userId or "earbass". */
export function DonationBar({ recipientId, trackId, className }: { recipientId: string; trackId?: number; className?: string }) {
  const { data } = useQuery(donationSummaryQuery(recipientId));
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  if (!data) return <div className={cn("h-36 animate-pulse rounded-[22px] bg-surface", className)} />;
  const own = session?.user.id === recipientId;
  const pct = data.goal ? Math.round((data.raised / data.goal) * 100) : null;

  return (
    <section className={cn("relative overflow-hidden rounded-[22px] border border-pink/20 bg-surface p-5", className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-pink/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink">
            <HandHeart className="size-4" /> {recipientId === PLATFORM_ID ? "Support Earbass" : `Support ${data.name}`}
          </p>
          {data.pitch && <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">{data.pitch}</p>}
        </div>
        {own ? (
          <Link href="/me" className="rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-white/10">Edit goal</Link>
        ) : (
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-grad px-5 py-2.5 text-sm font-semibold glow">
            <Heart className="size-4 fill-white" /> Donate
          </button>
        )}
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <p>
          <span className="font-display text-3xl font-extrabold">{money(data.raised)}</span>
          <span className="ml-1.5 text-sm text-muted-foreground">{data.goal ? `of ${money(data.goal)} goal` : "raised"}</span>
        </p>
        <p className="text-right text-xs text-muted-foreground">
          {pct !== null && <span className="block font-display text-base font-bold text-white">{pct}%</span>}
          {data.supporters} supporter{data.supporters === 1 ? "" : "s"}
        </p>
      </div>
      <Meter raised={data.raised} goal={data.goal} className="relative mt-2.5" />
      {!!data.recent.length && (
        <ul className="relative mt-4 flex flex-wrap gap-2">
          {data.recent.slice(0, 4).map((d) => (
            <li key={d.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs" title={d.message || undefined}>
              {d.source === "app" ? <Smartphone className="size-3 text-dim" /> : <Globe className="size-3 text-dim" />}
              <span className="font-semibold">{d.donorName}</span>
              <span className="text-lime">{money(d.amount)}</span>
              {d.message && <span className="truncate text-muted-foreground">· {d.message}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && <DonateDialog recipientId={recipientId} recipientName={data.name} trackId={trackId} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** Slim, dismissible platform-wide banner. */
export function PlatformDonationBanner() {
  const { data } = useQuery(donationSummaryQuery(PLATFORM_ID));
  const [hidden, setHidden] = useState(() => sessionStorage.getItem("eb-donate-hide") === "1");
  const [open, setOpen] = useState(false);
  const [loc] = useLocation();
  if (hidden || !data || loc.startsWith("/donate")) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/5 bg-surface/80 px-4 py-2.5 backdrop-blur">
      <HandHeart className="size-5 shrink-0 text-pink" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-medium">
            <span className="max-sm:hidden">Keep Earbass free · </span>
            <span className="font-display font-bold text-white">{money(data.raised)}</span>
            <span className="text-muted-foreground"> / {money(data.goal ?? 0)}</span>
          </span>
          <span className="shrink-0 text-muted-foreground">{data.supporters} backers</span>
        </div>
        <Meter raised={data.raised} goal={data.goal} className="mt-1.5 h-1.5" />
      </div>
      <button onClick={() => setOpen(true)} className="shrink-0 rounded-full bg-grad px-4 py-1.5 text-xs font-semibold">Donate</button>
      <button
        aria-label="Hide donation banner"
        onClick={() => {
          sessionStorage.setItem("eb-donate-hide", "1");
          setHidden(true);
        }}
        className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-white"
      >
        <X className="size-3.5" />
      </button>
      {open && <DonateDialog recipientId={PLATFORM_ID} recipientName="Earbass" onClose={() => setOpen(false)} />}
    </div>
  );
}

export function DonateDialog({ recipientId, recipientName, trackId, onClose }: { recipientId: string; recipientName: string; trackId?: number; onClose: () => void }) {
  const { data: session } = authClient.useSession();
  const [loc] = useLocation();
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const qc = useQueryClient();
  const checkout = useMutation({
    ...donationCheckoutMutation(),
    onSuccess: (r) => {
      if (r.paymentUrl) window.location.href = r.paymentUrl;
      else qc.invalidateQueries({ queryKey: orpc.donations.key() });
    },
  });
  const value = custom ? Math.floor(Number(custom)) : amount;
  const valid = Number.isFinite(value) && value >= 1 && value <= 1000;

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative w-full max-w-md rounded-t-[28px] border border-white/10 bg-surface p-6 sm:rounded-[28px]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">Donate to {recipientName}</h3>
            <p className="text-sm text-muted-foreground">One-time donation, paid securely with Stripe.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full bg-white/5"><X className="size-4" /></button>
        </div>
        {!session ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in so {recipientName} knows who backed them.</p>
            <Link href="/sign-in" className="mt-4 inline-flex rounded-full bg-grad px-6 py-3 text-sm font-semibold">Sign in</Link>
          </div>
        ) : checkout.data && !checkout.data.paymentUrl ? (
          <div className="mt-6 rounded-2xl bg-lime/10 p-5 text-lime">
            <p className="font-semibold">{checkout.data.status === "paid" ? "Thank you! Donation received." : "Payment processing…"}</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-white/10 px-5 py-2 text-sm text-white">Done</button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              checkout.mutate({ recipientId, trackId, amount: value, message, source: "web", origin: window.location.origin, backPath: loc });
            }}
          >
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => { setAmount(p); setCustom(""); }}
                  className={cn("rounded-2xl py-3 font-display text-base font-bold transition", !custom && amount === p ? "bg-grad glow" : "bg-surface-2 hover:bg-white/10")}
                >
                  ${p}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-2xl bg-surface-2 px-4 focus-within:ring-2 focus-within:ring-pink">
              <span className="text-muted-foreground">$</span>
              <input
                inputMode="numeric"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Custom amount"
                aria-label="Custom amount"
                className="w-full bg-transparent px-2 py-3 text-sm outline-none"
              />
            </div>
            <input
              value={message}
              maxLength={140}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice (optional)"
              aria-label="Message"
              className="w-full rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink"
            />
            {checkout.error && <p className="text-sm text-red-300">{checkout.error.message}</p>}
            <button disabled={!valid || checkout.isPending} className="flex w-full items-center justify-center gap-2 rounded-full bg-grad py-3.5 text-sm font-semibold glow disabled:opacity-60">
              {checkout.isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              {checkout.isPending ? "Opening checkout…" : valid ? `Donate ${money(value)}` : "Enter $1 – $1,000"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Artist's own goal settings (Me page). */
export function DonationGoalCard({ goal, pitch }: { goal: number | null; pitch: string }) {
  const qc = useQueryClient();
  const [g, setG] = useState(goal ? String(goal) : "");
  const [p, setP] = useState(pitch);
  const received = useQuery(donationReceivedQuery(true));
  const save = useMutation({ ...setDonationGoalMutation(), onSuccess: () => qc.invalidateQueries() });
  const n = g ? Math.floor(Number(g)) : null;
  const raised = received.data?.raised ?? 0;
  return (
    <div className="rounded-[22px] bg-surface p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink"><HandHeart className="size-4" /> Donation goal</p>
      <p className="mt-2 font-display text-2xl font-extrabold">{money(raised)} <span className="text-sm font-normal text-muted-foreground">{n ? `of ${money(n)}` : "raised"}</span></p>
      <Meter raised={raised} goal={n} className="mt-2" />
      <p className="mt-1 text-xs text-muted-foreground">{received.data?.supporters ?? 0} supporters · shown on your artist page and tracks</p>
      <div className="mt-4 flex items-center rounded-2xl bg-surface-2 px-4 focus-within:ring-2 focus-within:ring-pink">
        <span className="text-muted-foreground">$</span>
        <input inputMode="numeric" value={g} onChange={(e) => setG(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Goal (blank = no goal)" aria-label="Goal amount" className="w-full bg-transparent px-2 py-3 text-sm outline-none" />
      </div>
      <input value={p} maxLength={200} onChange={(e) => setP(e.target.value)} placeholder="What's it for? e.g. New monitors" aria-label="What's the goal for" className="mt-2 w-full rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
      <div className="mt-3 flex items-center gap-3">
        <button disabled={save.isPending || (n !== null && n < 10)} onClick={() => save.mutate({ goal: n, pitch: p })} className="rounded-full bg-grad px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
          {save.isPending ? "Saving…" : "Save goal"}
        </button>
        {n !== null && n < 10 && <span className="text-xs text-red-300">Min $10</span>}
        {save.isSuccess && <span className="text-sm text-lime">Saved</span>}
        {save.error && <span className="text-sm text-red-300">{save.error.message}</span>}
      </div>
    </div>
  );
}
