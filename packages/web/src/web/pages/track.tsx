import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Heart, Pause, Play, FileSignature, Check, Clock, X } from "lucide-react";
import { trackQuery, toggleLikeMutation } from "@/queries/catalog";
import { createRequestMutation, trackRequestQuery } from "@/queries/me";
import { authClient } from "@/lib/auth";
import { orpc } from "@/lib/api";
import { usePlayer, fmtCount, fmtTime } from "@/lib/player";
import { OriginBadge, TrackCard } from "@/components/track-card";
import { ListenOn, ShareButton, ShareTargets } from "@/components/platforms";
import { cn } from "@/lib/utils";
import { DonationBar } from "@/components/donation-bar";

const USE_PLATFORMS = ["YouTube", "TikTok", "Instagram Reels", "Twitch stream", "Podcast", "Film / short", "Game", "DJ set / mix", "Other"];

export default function TrackPage() {
  const { id } = useParams<{ id: string }>();
  const trackId = Number(id);
  const qc = useQueryClient();
  const { data } = useQuery(trackQuery(trackId));
  const { data: session } = authClient.useSession();
  const p = usePlayer();
  const like = useMutation({
    ...toggleLikeMutation(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.catalog.key() }),
  });
  const [askOpen, setAskOpen] = useState(false);

  if (!data) return <div className="h-80 animate-pulse rounded-[26px] bg-surface" />;
  const t = data.track;
  const isCur = p.current?.id === t.id;
  const own = session?.user.id === t.userId;

  return (
    <div>
      <div className="flex flex-col gap-7 md:flex-row md:items-end">
        <img src={t.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="aspect-square w-full max-w-[320px] rounded-[28px] object-cover glow" />
        <div className="min-w-0 flex-1">
          <OriginBadge origin={t.origin} tool={t.aiTool} className="bg-surface-2" />
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-5xl">{t.title}</h1>
          <Link href={`/artist/${t.userId}`} className="mt-1 inline-block text-lg text-muted-foreground hover:text-white">{t.artistName}</Link>
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href={`/genre/${t.genre}`} className="hover:text-white">{t.genre}</Link>
            {t.bpm ? ` · ${t.bpm} BPM` : ""} {t.durationSec ? ` · ${fmtTime(t.durationSec)}` : ""} · {fmtCount(t.plays)} plays · {fmtCount(t.likes)} likes
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => (isCur ? p.toggle() : p.play(t, [t, ...data.more]))} className="inline-flex items-center gap-2 rounded-full bg-grad px-6 py-3 text-sm font-semibold glow">
              {isCur && p.playing ? <Pause className="size-4 fill-white" /> : <Play className="size-4 fill-white" />}
              {isCur && p.playing ? "Pause" : "Play"}
            </button>
            <button
              disabled={!session || like.isPending}
              onClick={() => like.mutate({ id: t.id })}
              title={session ? "" : "Sign in to like"}
              className={cn("grid size-11 place-items-center rounded-full bg-surface-2", data.liked && "text-pink")}
            >
              <Heart className={cn("size-5", data.liked && "fill-pink")} />
            </button>
            <ShareButton title={t.title} path={`/track/${t.id}`} />
            {!own && (
              <button onClick={() => setAskOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-pink/50 px-4 py-2.5 text-sm font-semibold text-pink hover:bg-pink/10">
                <FileSignature className="size-4" /> Request to use
              </button>
            )}
          </div>
        </div>
      </div>

      {t.description && <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t.description}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[22px] bg-surface p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Listen on</p>
          <ListenOn links={{ ...t.artistLinks, ...t.links }} />
          {!Object.values({ ...t.artistLinks, ...t.links }).some(Boolean) && <p className="text-sm text-dim">Only on Earbass for now.</p>}
        </div>
        <div className="rounded-[22px] bg-surface p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Share to</p>
          <ShareTargets title={t.title} path={`/track/${t.id}`} />
        </div>
      </div>

      <DonationBar recipientId={t.userId} trackId={t.id} className="mt-6" />

      {!own && session && <RequestStatus trackId={t.id} />}

      {!!data.more.length && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold">More {t.genre}</h2>
          <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
            {data.more.map((m) => <TrackCard key={m.id} track={m} queue={data.more} />)}
          </div>
        </section>
      )}

      {askOpen && <RequestDialog trackId={t.id} title={t.title} artist={t.artistName} signedIn={!!session} onClose={() => setAskOpen(false)} />}
    </div>
  );
}

function RequestStatus({ trackId }: { trackId: number }) {
  const { data } = useQuery(trackRequestQuery(trackId, true));
  if (!data) return null;
  const map = {
    pending: { icon: Clock, text: "Your usage request is waiting on the artist.", cls: "border-white/10" },
    approved: { icon: Check, text: "Approved — you can use this track.", cls: "border-lime/40 text-lime" },
    declined: { icon: X, text: "The artist declined your request.", cls: "border-red-400/40 text-red-300" },
  }[data.status];
  return (
    <div className={cn("mt-6 rounded-[22px] border bg-surface p-5", map.cls)}>
      <p className="flex items-center gap-2 font-semibold"><map.icon className="size-4" /> {map.text}</p>
      <p className="mt-1 text-xs text-muted-foreground">{data.platform} · {data.purpose}</p>
      {data.creditLine && <p className="mt-3 rounded-xl bg-black/30 p-3 text-sm text-white">Credit line: <span className="font-mono">{data.creditLine}</span></p>}
      {data.reply && <p className="mt-2 text-sm text-muted-foreground">"{data.reply}"</p>}
    </div>
  );
}

function RequestDialog({ trackId, title, artist, signedIn, onClose }: { trackId: number; title: string; artist: string; signedIn: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState(USE_PLATFORMS[0]);
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const m = useMutation({
    ...createRequestMutation(),
    onSuccess: () => qc.invalidateQueries({ queryKey: orpc.requests.key() }),
  });
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative w-full max-w-lg rounded-t-[28px] border border-white/10 bg-surface p-6 sm:rounded-[28px]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-bold">Request to use</h3>
            <p className="text-sm text-muted-foreground">"{title}" by {artist}</p>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/5"><X className="size-4" /></button>
        </div>
        {!signedIn ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">Sign in so the artist knows who's asking.</p>
            <Link href="/sign-in" className="mt-4 inline-flex rounded-full bg-grad px-6 py-3 text-sm font-semibold">Sign in</Link>
          </div>
        ) : m.isSuccess ? (
          <div className="mt-6 rounded-2xl bg-lime/10 p-5 text-lime">
            <p className="font-semibold">Request sent.</p>
            <p className="mt-1 text-sm text-lime/80">You'll see the artist's answer on this page and in Library → Requests.</p>
            <button onClick={onClose} className="mt-4 rounded-full bg-white/10 px-5 py-2 text-sm text-white">Done</button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate({ trackId, platform, purpose, message });
            }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where will it be used?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {USE_PLATFORMS.map((p) => (
                  <button type="button" key={p} onClick={() => setPlatform(p)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", platform === p ? "bg-grad" : "bg-surface-2")}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What's it for?</p>
              <input required minLength={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Background for my car-meet edit (≈2M followers)" aria-label="Background for my car-meet edit (≈2M followers)" className="mt-2 w-full rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message (optional)</p>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Happy to credit + link your Spotify." aria-label="Happy to credit + link your Spotify." className="mt-2 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
            </div>
            {m.error && <p className="text-sm text-red-300">{m.error.message}</p>}
            <button disabled={m.isPending} className="w-full rounded-full bg-grad py-3.5 text-sm font-semibold glow disabled:opacity-60">
              {m.isPending ? "Sending…" : "Send request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
