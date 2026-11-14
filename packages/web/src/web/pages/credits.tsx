import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Coins, Crown, Check, KeyRound, Loader2, PlayCircle, X, ExternalLink, Trash2, Sparkles, Wand2 } from "lucide-react";
import { authClient } from "@/lib/auth";
import { usePlayer } from "@/lib/player";
import { PageHeader, SignInPrompt } from "@/components/shell";
import { ProBadge } from "@/components/track-card";
import {
  creditsStatusQuery,
  creditsCheckoutMutation,
  creditsPortalMutation,
  connectKeyMutation,
  removeKeyMutation,
  adStartMutation,
  adClaimMutation,
  lengthLabel,
  type CreditsStatus,
} from "@/queries/credits";
import { cn } from "@/lib/utils";

type Status = CreditsStatus;

export default function CreditsPage() {
  const { data: session, isPending } = authClient.useSession();
  const status = useQuery(creditsStatusQuery(!!session));
  const qc = useQueryClient();
  const search = useSearch();
  const paid = new URLSearchParams(search).get("paid");
  const refresh = () => qc.invalidateQueries({ queryKey: creditsStatusQuery(true).queryKey });

  // Coming back from Stripe: webhooks can lag a few seconds, so refetch a few times.
  useEffect(() => {
    if (!paid && !new URLSearchParams(search).get("portal")) return;
    const ids = [1500, 4000, 8000, 15000].map((ms) => setTimeout(refresh, ms));
    return () => ids.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, search]);

  if (isPending) return null;
  if (!session) return (<><PageHeader title="Credits & membership" /><SignInPrompt what="get song credits" /></>);
  if (!status.data) return <div className="h-60 animate-pulse rounded-[26px] bg-surface" />;
  const d = status.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credits & membership"
        subtitle="Make AI songs with Earbass credits, or plug in your own AI music key."
        right={<Link href="/studio?tab=song" className="hidden items-center gap-2 rounded-full bg-grad px-5 py-2.5 text-sm font-semibold glow sm:inline-flex"><Wand2 className="size-4" /> Make a song</Link>}
      />
      {paid && (
        <div className="flex items-center gap-2 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">
          <Check className="size-4" /> Payment received — your {paid.startsWith("pack") ? "credits" : "membership"} will show up in a few seconds.
        </div>
      )}
      <BalanceCard d={d} />
      <Memberships d={d} />
      <Packs d={d} />
      <KeysSection d={d} onChange={refresh} />
    </div>
  );
}

function BalanceCard({ d }: { d: Status }) {
  const [adOpen, setAdOpen] = useState(false);
  const costs = Object.entries(d.costs) as [string, number][];
  return (
    <div className="bg-grad-soft rounded-[22px] p-[1px]">
      <div className="grid gap-5 rounded-[21px] bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="size-4 text-pink" /> Song credits <ProBadge plan={d.plan} />
          </div>
          <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{d.available}</p>
          {d.available !== d.balance && <p className="text-xs text-muted-foreground">{d.balance - d.available} held for songs in progress</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {costs.map(([sec, c]) => (
              <span key={sec} className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
                {lengthLabel(Number(sec))} = <b className="text-white">{c}</b> {c === 1 ? "credit" : "credits"}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">
            {d.plan === "free" ? `New accounts get ${d.freeCredits} free credits. Songs over 1 min need a membership.` : "Membership active — all lengths unlocked."} Songs on your own key cost 0 credits.
          </p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-4 sm:w-64">
          <p className="text-sm font-semibold">Watch an ad, earn a credit</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{d.ads.seconds}s sponsored track · {d.ads.left} of {d.ads.limit} left today</p>
          <button
            disabled={d.ads.left === 0}
            onClick={() => setAdOpen(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            <PlayCircle className="size-4" /> {d.ads.left ? "Watch ad · +1 credit" : "Come back tomorrow"}
          </button>
        </div>
      </div>
      {adOpen && <AdModal onClose={() => setAdOpen(false)} />}
    </div>
  );
}

export function AdModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const player = usePlayer();
  const start = useMutation(adStartMutation());
  const claim = useMutation({ ...adClaimMutation(), onSuccess: () => qc.invalidateQueries({ queryKey: creditsStatusQuery(true).queryKey }) });
  const [left, setLeft] = useState<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (player.playing) player.toggle();
    start.mutate(undefined, {
      onSuccess: (r) => {
        setLeft(r.seconds);
        const a = new Audio(r.track.audioUrl);
        a.volume = 0.8;
        audio.current = a;
        void a.play().catch(() => {});
      },
    });
    return () => audio.current?.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const t = start.data?.track;
  const done = left === 0;
  const total = start.data?.seconds ?? 15;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur" role="dialog" aria-label="Sponsored track">
      <div className="w-full max-w-sm overflow-hidden rounded-[26px] border border-white/10 bg-surface">
        <div className="relative aspect-square bg-surface-2">
          {t?.coverUrl && <img src={t.coverUrl} alt="" className="size-full object-cover" />}
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Sponsored</span>
          {(done || claim.isSuccess || start.error) && (
            <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/70"><X className="size-4" /></button>
          )}
          {!t && !start.error && <Loader2 className="absolute inset-0 m-auto size-6 animate-spin" />}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
            <div className="h-full bg-grad transition-all duration-1000 ease-linear" style={{ width: `${left === null ? 0 : ((total - left) / total) * 100}%` }} />
          </div>
        </div>
        <div className="p-5">
          {start.error ? (
            <p className="text-sm text-red-300">{start.error.message}</p>
          ) : (
            <>
              <p className="font-display text-lg font-bold">{t?.title ?? "Loading…"}</p>
              <p className="text-sm text-muted-foreground">{t?.artistName} {t && <>· <Link href={`/track/${t.id}`} onClick={onClose} className="text-pink">Open track</Link></>}</p>
              {claim.isSuccess ? (
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-lime"><Check className="size-4" /> +1 credit added</p>
              ) : (
                <button
                  disabled={!done || claim.isPending}
                  onClick={() => start.data && claim.mutate({ viewId: start.data.viewId })}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-grad text-sm font-semibold disabled:opacity-50"
                >
                  {claim.isPending ? <Loader2 className="size-4 animate-spin" /> : <Coins className="size-4" />}
                  {done ? "Claim +1 credit" : `Claim in ${left ?? total}s`}
                </button>
              )}
              {claim.error && <p className="mt-2 text-xs text-red-300">{claim.error.message}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function useCheckout() {
  const checkout = useMutation(creditsCheckoutMutation());
  const qc = useQueryClient();
  const buy = (item: "pack_10" | "pack_25" | "pack_60" | "pro" | "pro_byok") =>
    checkout.mutate(
      { item, origin: window.location.origin, backPath: "/credits" },
      {
        onSuccess: (r) => {
          if (r.paymentUrl) window.location.href = r.paymentUrl;
          else void qc.invalidateQueries({ queryKey: creditsStatusQuery(true).queryKey });
        },
      },
    );
  return { buy, checkout };
}

function Memberships({ d }: { d: Status }) {
  const { buy, checkout } = useCheckout();
  const portal = useMutation(creditsPortalMutation());
  const hasKey = d.keys.length > 0;
  const perks: Record<string, string[]> = {
    pro: ["40 song credits every month", "Songs up to 3 minutes", "PRO badge on your artist page", "Web + app"],
    pro_byok: ["Use your own ElevenLabs, Replicate, Stability or Mubert key", "Songs up to 3 minutes, 0 credits", "PRO badge on your artist page", "Web + app"],
  };
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold">Membership</h2>
        {d.plan !== "free" && (
          <button
            onClick={() => portal.mutate({ origin: window.location.origin, backPath: "/credits" }, { onSuccess: (r) => (window.location.href = r.url) })}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10"
          >
            {portal.isPending && <Loader2 className="size-3.5 animate-spin" />} Manage / cancel
          </button>
        )}
      </div>
      {d.plan !== "free" && d.renewsAt && (
        <p className="-mt-1 mb-3 text-xs text-muted-foreground">{d.canceling ? "Ends" : "Renews"} {new Date(d.renewsAt).toLocaleDateString()}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {d.memberships.map((m) => {
          const current = d.plan === m.id;
          const locked = m.needsKey && !hasKey;
          return (
            <div key={m.id} className={cn("relative flex flex-col rounded-[22px] border p-5", current ? "border-pink bg-pink/5" : "border-white/10 bg-surface")}>
              {m.id === "pro" && <span className="absolute right-4 top-4 rounded-full bg-grad px-2.5 py-1 text-[10px] font-bold uppercase">Popular</span>}
              <div className="flex items-center gap-2">
                {m.needsKey ? <KeyRound className="size-4 text-pink" /> : <Crown className="size-4 text-pink" />}
                <p className="font-display font-bold">{m.name}</p>
              </div>
              <p className="mt-2 font-display text-3xl font-extrabold">
                ${m.price.toFixed(2)}<span className="text-sm font-medium text-muted-foreground">/month</span>
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
                {perks[m.id].map((p) => (
                  <li key={p} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-lime" /> {p}</li>
                ))}
              </ul>
              <button
                disabled={current || locked || checkout.isPending}
                onClick={() => buy(m.id)}
                className={cn("mt-5 h-11 rounded-full text-sm font-semibold disabled:opacity-50", m.id === "pro" ? "bg-grad glow disabled:shadow-none" : "bg-white text-black")}
              >
                {current ? "Your plan" : locked ? "Connect a key below first" : d.plan !== "free" ? "Switch to this" : "Join"}
              </button>
            </div>
          );
        })}
      </div>
      {checkout.error && <p className="mt-2 text-xs text-red-300">{checkout.error.message}</p>}
    </section>
  );
}

function Packs({ d }: { d: Status }) {
  const { buy, checkout } = useCheckout();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold">Credit packs</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {d.packs.map((p) => (
          <button
            key={p.id}
            disabled={checkout.isPending}
            onClick={() => { setBusy(p.id); buy(p.id); }}
            className="group flex items-center gap-4 rounded-[22px] border border-white/10 bg-surface p-4 text-left hover:border-pink/50 disabled:opacity-60"
          >
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-grad-soft">
              {checkout.isPending && busy === p.id ? <Loader2 className="size-5 animate-spin" /> : <Coins className="size-5 text-pink" />}
            </div>
            <div className="flex-1">
              <p className="font-display text-xl font-extrabold">{p.credits} credits</p>
              <p className="text-xs text-muted-foreground">${(p.price / p.credits).toFixed(2)} per credit · one-off</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-black">${p.price}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function KeysSection({ d, onChange }: { d: Status; onChange: () => void }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold">Your AI keys</h2>
      <p className="mb-3 text-sm text-muted-foreground">Connect your own account and songs bill your provider, not your credits. Keys are encrypted and never shown again.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {d.providers.map((p) => (
          <KeyCard key={p.id} p={p} connected={d.keys.find((k) => k.provider === p.id)} onChange={onChange} />
        ))}
      </div>
    </section>
  );
}

function KeyCard({ p, connected, onChange }: { p: Status["providers"][number]; connected?: Status["keys"][number]; onChange: () => void }) {
  const [key, setKey] = useState("");
  const [cid, setCid] = useState("");
  const [open, setOpen] = useState(false);
  const connect = useMutation({ ...connectKeyMutation(), onSuccess: () => { setKey(""); setCid(""); setOpen(false); onChange(); } });
  const remove = useMutation({ ...removeKeyMutation(), onSuccess: onChange });
  const twoFields = p.fields.length > 1;
  return (
    <div className={cn("rounded-[22px] border p-4", connected ? "border-lime/30 bg-lime/5" : "border-white/10 bg-surface")}>
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-surface-2"><Sparkles className="size-4 text-pink" /></div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.model} · up to {lengthLabel(p.maxSeconds)}</p>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-lime/15 px-2.5 py-1 text-[11px] font-semibold text-lime">Connected {connected.hint}</span>
            <button onClick={() => remove.mutate({ provider: p.id })} aria-label={`Remove ${p.name} key`} className="grid size-8 place-items-center rounded-full bg-white/5 hover:bg-white/10">
              {remove.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </button>
          </div>
        ) : (
          <button onClick={() => setOpen(!open)} className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold hover:bg-white/10">{open ? "Cancel" : "Connect"}</button>
        )}
      </div>
      {open && !connected && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => { e.preventDefault(); connect.mutate({ provider: p.id, key: key.trim(), customerId: twoFields ? cid.trim() : undefined }); }}
        >
          {twoFields && (
            <input value={cid} onChange={(e) => setCid(e.target.value)} placeholder={p.fields[0]} aria-label={p.fields[0]} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          )}
          <input value={key} onChange={(e) => setKey(e.target.value)} type="password" autoComplete="off" placeholder={p.fields[p.fields.length - 1]} aria-label={p.fields[p.fields.length - 1]} className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          <div className="flex items-center gap-3">
            <button disabled={connect.isPending || key.trim().length < 8 || (twoFields && !cid.trim())} className="inline-flex items-center gap-2 rounded-full bg-grad px-5 py-2 text-xs font-semibold disabled:opacity-50">
              {connect.isPending && <Loader2 className="size-3.5 animate-spin" />} Verify & save
            </button>
            <a href={p.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-pink">Get a key <ExternalLink className="size-3" /></a>
          </div>
          {connect.error && <p className="text-xs text-red-300">{connect.error.message}</p>}
        </form>
      )}
    </div>
  );
}
