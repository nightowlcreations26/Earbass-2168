import { AnimatePresence, motion } from "motion/react";
import { Link } from "wouter";
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { usePlayer, fmtTime } from "@/lib/player";
import { OriginBadge } from "./track-card";
import { ListenOn, ShareButton } from "./platforms";

export function MiniPlayer() {
  const p = usePlayer();
  if (!p.current) return null;
  const t = p.current;
  const pct = p.duration ? (p.time / p.duration) * 100 : 0;
  return (
    <>
      <div className="fixed inset-x-3 bottom-[84px] z-40 lg:bottom-4 lg:left-[264px] lg:right-6">
        <div className="glass relative overflow-hidden rounded-[22px] border border-white/10 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-white/5">
            <div className="h-full bg-grad" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-3 p-2.5 pr-3">
            <button onClick={() => p.setExpanded(true)} aria-label="Open player" className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <img src={t.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="size-12 rounded-xl object-cover" />
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.title}</div>
                <div className="truncate text-xs text-muted-foreground">{t.artistName}</div>
              </div>
            </button>
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
              {fmtTime(p.time)} / {fmtTime(p.duration)}
            </span>
            <button onClick={p.prev} className="hidden p-2 text-muted-foreground hover:text-white sm:block" aria-label="Previous">
              <SkipBack className="size-5" />
            </button>
            <button onClick={p.toggle} className="grid size-11 place-items-center rounded-full bg-grad" aria-label="Play/pause">
              {p.playing ? <Pause className="size-5 fill-white" /> : <Play className="ml-0.5 size-5 fill-white" />}
            </button>
            <button onClick={p.next} className="p-2 text-muted-foreground hover:text-white" aria-label="Next">
              <SkipForward className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <FullPlayer />
    </>
  );
}

function FullPlayer() {
  const p = usePlayer();
  const t = p.current;
  return (
    <AnimatePresence>
      {p.expanded && t && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 260 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-background"
        >
          <div className="absolute inset-0 -z-10 opacity-40 blur-3xl" style={{ backgroundImage: `url(${t.coverUrl})`, backgroundSize: "cover" }} />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pb-10 pt-5">
            <div className="flex items-center justify-between">
              <button onClick={() => p.setExpanded(false)} className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="Close">
                <ChevronDown className="size-5" />
              </button>
              <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Now playing</span>
              <span className="size-10" />
            </div>
            <img src={t.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="mt-8 aspect-square w-full rounded-[28px] object-cover shadow-2xl glow" />
            <div className="mt-7 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold leading-tight">{t.title}</h2>
                <Link href={`/artist/${t.userId}`} onClick={() => p.setExpanded(false)} className="text-muted-foreground hover:text-white">
                  {t.artistName}
                </Link>
              </div>
              <OriginBadge origin={t.origin} tool={t.aiTool} className="mt-1 bg-surface-2" />
            </div>
            <input
              type="range" aria-label="Seek"
              className="eb-range mt-6"
              min={0}
              max={p.duration || 0}
              step={0.1}
              value={p.time}
              onChange={(e) => p.seek(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{fmtTime(p.time)}</span>
              <span>{fmtTime(p.duration)}</span>
            </div>
            <div className="mt-5 flex items-center justify-center gap-8">
              <button onClick={p.prev} aria-label="Previous"><SkipBack className="size-7" /></button>
              <button onClick={p.toggle} className="grid size-20 place-items-center rounded-full bg-grad glow" aria-label="Play/pause">
                {p.playing ? <Pause className="size-8 fill-white" /> : <Play className="ml-1 size-8 fill-white" />}
              </button>
              <button onClick={p.next} aria-label="Next"><SkipForward className="size-7" /></button>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex gap-2">
                <ShareButton title={t.title} path={`/track/${t.id}`} />
                <Link href={`/track/${t.id}`} onClick={() => p.setExpanded(false)} className="rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-white/10">
                  Track page
                </Link>
              </div>
              <ListenOn links={{ ...t.artistLinks, ...t.links }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
