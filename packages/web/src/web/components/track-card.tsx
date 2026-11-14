import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Sparkles, Mic2, Crown, Heart, Share2, Check } from "lucide-react";
import { orpc, type Track } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { likedIdsQuery, toggleLikeMutation } from "@/queries/catalog";
import { usePlayer, fmtCount } from "@/lib/player";
import { cn } from "@/lib/utils";

export function OriginBadge({ origin, tool, className }: { origin: "ai" | "original"; tool?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur",
        origin === "ai" ? "bg-black/60 text-blush" : "bg-black/60 text-lime",
        className,
      )}
    >
      {origin === "ai" ? <Sparkles className="size-3" /> : <Mic2 className="size-3" />}
      {origin === "ai" ? (tool ? `AI · ${tool}` : "AI") : "Original"}
    </span>
  );
}

export function ChampionTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-grad px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", className)}>
      <Crown className="size-3" /> Best AI DJ
    </span>
  );
}

/** Heart toggle usable anywhere a track appears. */
export function LikeButton({ trackId, likes, className, showCount }: { trackId: number; likes?: number; className?: string; showCount?: boolean }) {
  const { data: session } = authClient.useSession();
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const ids = useQuery({ ...likedIdsQuery(), enabled: !!session });
  const liked = !!ids.data?.includes(trackId);
  const m = useMutation({
    ...toggleLikeMutation(),
    onMutate: () => {
      qc.setQueryData(likedIdsQuery().queryKey, (old: number[] | undefined) => (liked ? (old ?? []).filter((i) => i !== trackId) : [...(old ?? []), trackId]));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: orpc.catalog.key() }),
  });
  const count = likes ?? 0;
  return (
    <button
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!session) return nav("/sign-in");
        m.mutate({ id: trackId });
      }}
      className={cn("inline-flex items-center gap-1 rounded-full transition hover:text-white active:scale-90", liked ? "text-pink" : "text-muted-foreground", className)}
    >
      <Heart className={cn("size-4", liked && "fill-pink")} />
      {showCount && <span className="text-xs tabular-nums">{fmtCount(count)}</span>}
    </button>
  );
}

export function ShareIcon({ title, path, className }: { title: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label="Share"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}${path}`;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* fall back to copy */
          }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className={cn("inline-flex items-center rounded-full text-muted-foreground transition hover:text-white active:scale-90", className)}
    >
      {copied ? <Check className="size-4 text-lime" /> : <Share2 className="size-4" />}
    </button>
  );
}

export function TrackCard({ track, queue, size = "md" }: { track: Track; queue: Track[]; size?: "md" | "lg" }) {
  const p = usePlayer();
  const isCur = p.current?.id === track.id;
  const w = size === "lg" ? "w-[200px] sm:w-[220px]" : "w-[160px] sm:w-[176px]";
  return (
    <div className={cn("group shrink-0 snap-start", w)}>
      <div className="relative aspect-square overflow-hidden rounded-[22px] bg-surface-2">
        <Link href={`/track/${track.id}`}>
          <img src={track.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        </Link>
        <OriginBadge origin={track.origin} tool={track.aiTool} className="absolute left-2.5 top-2.5" />
        <button
          aria-label={isCur && p.playing ? "Pause" : "Play"}
          onClick={() => (isCur ? p.toggle() : p.play(track, queue))}
          className={cn(
            "absolute bottom-2.5 right-2.5 grid size-11 place-items-center rounded-full bg-grad glow transition",
            isCur ? "opacity-100" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 max-sm:opacity-100 max-sm:translate-y-0",
          )}
        >
          {isCur && p.playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white ml-0.5" />}
        </button>
      </div>
      <Link href={`/track/${track.id}`} className="mt-2.5 block">
        <div className={cn("truncate text-[15px] font-semibold", isCur && "text-pink")}>{track.title}</div>
      </Link>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <Link href={`/artist/${track.userId}`} className="truncate hover:text-white">{track.artistName}</Link>
        <span className="shrink-0">{fmtCount(track.plays)} plays</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <LikeButton trackId={track.id} likes={track.likes} showCount />
        <ShareIcon title={track.title} path={`/track/${track.id}`} />
      </div>
    </div>
  );
}

export function TrackRow({ track, queue, index }: { track: Track; queue: Track[]; index?: number }) {
  const p = usePlayer();
  const isCur = p.current?.id === track.id;
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-2 pr-3 hover:bg-white/5", isCur && "bg-white/5")}>
      {index !== undefined && <span className="w-6 text-center font-display text-sm text-dim">{index + 1}</span>}
      <button onClick={() => (isCur ? p.toggle() : p.play(track, queue))} className="relative size-14 shrink-0 overflow-hidden rounded-xl">
        <img src={track.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="size-full object-cover" loading="lazy" />
        <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 hover:opacity-100">
          {isCur && p.playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <Link href={`/track/${track.id}`} className={cn("block truncate font-semibold", isCur && "text-pink")}>{track.title}</Link>
        <div className="truncate text-xs text-muted-foreground">
          <Link href={`/artist/${track.userId}`} className="hover:text-white">{track.artistName}</Link> · {track.genre} {track.bpm ? `· ${track.bpm} BPM` : ""}
        </div>
      </div>
      <OriginBadge origin={track.origin} tool={track.aiTool} className="max-sm:hidden bg-surface-2" />
      <LikeButton trackId={track.id} className="p-1.5" />
      <ShareIcon title={track.title} path={`/track/${track.id}`} className="p-1.5 max-sm:hidden" />
      <span className="w-12 text-right text-xs text-muted-foreground">{fmtCount(track.plays)}</span>
    </div>
  );
}

export function Row({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="font-display text-lg font-bold sm:text-xl">{title}</h2>
        {action}
      </div>
      <div className="no-scrollbar -mx-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8">{children}</div>
    </section>
  );
}

/** Membership badge — shown for pro and pro_byok members. */
export function ProBadge({ plan, className }: { plan?: string | null; className?: string }) {
  if (!plan || plan === "free") return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black", className)}>
      <Sparkles className="size-3" /> Pro
    </span>
  );
}
