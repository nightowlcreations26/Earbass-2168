import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "motion/react";
import { Play, Search, Crown, Flame, Disc3, Zap, Waves, Sparkles, Moon, Speaker, Activity, Music4, ArrowRight } from "lucide-react";
import { homeQuery, championQuery } from "@/queries/catalog";
import { authClient } from "@/lib/auth";
import { usePlayer, fmtCount } from "@/lib/player";
import { Row, TrackCard, OriginBadge } from "@/components/track-card";

const GENRE_ICON: Record<string, typeof Disc3> = {
  edm: Zap,
  techno: Disc3,
  dnb: Activity,
  melodic: Sparkles,
  mextech: Flame,
  house: Music4,
  "night-bass": Moon,
  "bass-boosted": Speaker,
  breakbeats: Waves,
};

const fade = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
});

export default function HomePage() {
  const { data, isLoading } = useQuery(homeQuery());
  const champ = useQuery(championQuery());
  const { data: session } = authClient.useSession();
  const p = usePlayer();

  const name = session?.user.name?.split(" ")[0];

  return (
    <div>
      <motion.header {...fade(0)} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={session ? "/me" : "/sign-in"} className="grid size-12 place-items-center rounded-full bg-grad font-display text-lg font-bold">
            {(name ?? "E")[0]?.toUpperCase()}
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{name ? `Welcome back, ${name}` : "Welcome to Earbass"}</p>
            <h1 className="font-display text-xl font-bold sm:text-2xl">Explore the drop</h1>
          </div>
        </div>
        <Link href="/search" className="grid size-11 place-items-center rounded-full bg-surface-2 hover:bg-white/10" aria-label="Search">
          <Search className="size-5" />
        </Link>
      </motion.header>

      {/* Featured show */}
      <motion.section {...fade(1)} className="mt-6">
        {isLoading || !data?.featured ? (
          <div className="h-[220px] animate-pulse rounded-[26px] bg-surface sm:h-[300px]" />
        ) : (
          <div className="bg-grad-soft relative overflow-hidden rounded-[26px] text-[#1a0b14]">
            <img src="/images/hero.jpg" alt="" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover [mask-image:linear-gradient(to_right,transparent,black_35%)]" />
            <div className="relative z-10 max-w-[62%] p-6 sm:max-w-[48%] sm:p-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blush">
                <Flame className="size-3.5" /> Featured show
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold leading-[1.05] sm:text-[44px]">{data.featured.title}</h2>
              <p className="mt-2 text-sm font-medium opacity-80 sm:text-base">
                {data.featured.artistName} · {data.featured.genre} · {fmtCount(data.featured.plays)} plays
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => p.play(data.featured!, [data.featured!, ...data.popular])}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0b0a0f] px-5 py-3 text-sm font-semibold text-white"
                >
                  <Play className="size-4 fill-white" /> Play now
                </button>
                <Link href={`/artist/${data.featured.userId}`} className="rounded-full border border-black/20 px-4 py-3 text-sm font-semibold">
                  Artist
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* Categories */}
      <motion.section {...fade(2)} className="mt-9">
        <h2 className="mb-4 font-display text-lg font-bold sm:text-xl">Top categories</h2>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
          {(data?.categories ?? []).map((c, i) => {
            const Icon = GENRE_ICON[c.id] ?? Disc3;
            return (
              <Link
                key={c.id}
                href={`/genre/${c.id}`}
                className={`flex shrink-0 items-center gap-3 rounded-full py-2 pl-2 pr-5 transition hover:scale-[1.03] ${i % 3 === 1 ? "bg-grad" : "bg-surface-2"}`}
              >
                <span className={`grid size-10 place-items-center rounded-full ${i % 3 === 1 ? "bg-white/20" : "bg-black/40"}`}>
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">{c.label}</span>
                  <span className="block text-[11px] opacity-70">{c.count} tracks</span>
                </span>
              </Link>
            );
          })}
        </div>
      </motion.section>

      <motion.div {...fade(3)}>
        <Row title="New updates" action={<span className="text-xs text-muted-foreground">Fresh uploads</span>}>
          {(data?.newUpdates ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data!.newUpdates} />
          ))}
        </Row>
      </motion.div>

      {/* Best AI DJ banner */}
      {champ.data && (
        <motion.section {...fade(4)} className="mt-9">
          <Link href="/leaderboard" className="group relative flex items-center gap-4 overflow-hidden rounded-[22px] border border-pink/30 bg-surface p-4 sm:p-5">
            <div className="absolute -right-10 -top-16 size-48 rounded-full bg-pink/20 blur-3xl" />
            <div className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-grad glow">
              <Crown className="size-8" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink">Current title holder · Best AI DJ</p>
              <p className="truncate font-display text-xl font-bold">{champ.data.artistName}</p>
              <p className="text-xs text-muted-foreground">
                {champ.data.points} pts · {champ.data.uploads} uploads · {fmtCount(champ.data.plays)} plays
              </p>
            </div>
            <span className="relative hidden items-center gap-1 text-sm font-semibold text-pink sm:flex">
              Leaderboard <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </motion.section>
      )}

      <motion.div {...fade(5)}>
        <Row title="Popular & trending" action={<span className="text-xs text-muted-foreground">Last 7 days</span>}>
          {(data?.trending ?? []).map((t, i) => (
            <div key={t.id} className="relative">
              <span className="pointer-events-none absolute -left-1 bottom-14 z-10 font-display text-6xl font-extrabold text-white/90 [-webkit-text-stroke:2px_#0b0a0f]">
                {i + 1}
              </span>
              <TrackCard track={t} queue={data!.trending} size="lg" />
            </div>
          ))}
        </Row>
      </motion.div>

      <motion.div {...fade(6)}>
        <Row title="All-time popular">
          {(data?.popular ?? []).map((t) => (
            <TrackCard key={t.id} track={t} queue={data!.popular} />
          ))}
        </Row>
      </motion.div>

      <motion.section {...fade(7)} className="mt-9">
        <h2 className="mb-4 font-display text-lg font-bold sm:text-xl">Artists on the rise</h2>
        <div className="no-scrollbar -mx-5 flex gap-5 overflow-x-auto px-5 sm:-mx-8 sm:px-8">
          {(data?.artists ?? []).map((a) => (
            <Link key={a.userId} href={`/artist/${a.userId}`} className="w-24 shrink-0 text-center">
              <img src={a.avatarUrl ?? "/images/cover-edm.jpg"} alt="" className="mx-auto size-24 rounded-full object-cover ring-2 ring-white/10 hover:ring-pink" />
              <p className="mt-2 truncate text-sm font-semibold">{a.artistName}</p>
              <p className="text-[11px] text-muted-foreground">{fmtCount(Number(a.plays))} plays</p>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section {...fade(8)} className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link href="/upload" className="rounded-[22px] bg-surface p-6 hover:bg-surface-2">
          <OriginBadge origin="ai" className="bg-surface-2" />
          <h3 className="mt-3 font-display text-lg font-bold">Get approved in minutes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload 3 AI songs or 2 of your own and your profile goes live. Every 7 uploads earns 100 pts toward the Best AI DJ crown.</p>
        </Link>
        <Link href="/studio" className="rounded-[22px] bg-surface p-6 hover:bg-surface-2">
          <span className="inline-flex rounded-full bg-lime px-2 py-0.5 text-[10px] font-bold uppercase text-black">Studio</span>
          <h3 className="mt-3 font-display text-lg font-bold">Make a beat with AI</h3>
          <p className="mt-1 text-sm text-muted-foreground">Type "dark 174 dnb roller", get a pattern on the beat pad, then mix it with FX on two decks.</p>
        </Link>
      </motion.section>
    </div>
  );
}
