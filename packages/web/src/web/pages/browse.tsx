import { DonationBar } from "@/components/donation-bar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Play, Search as SearchIcon, Crown, Trophy } from "lucide-react";
import { genreQuery, searchQuery, artistQuery, leaderboardQuery, championQuery } from "@/queries/catalog";
import { usePlayer, fmtCount } from "@/lib/player";
import { TrackRow, ChampionTag } from "@/components/track-card";
import { PageHeader } from "@/components/shell";
import { ListenOn, ShareButton } from "@/components/platforms";
import { cn } from "@/lib/utils";

export function GenrePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery(genreQuery(id!));
  const p = usePlayer();
  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-[26px] bg-grad p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] opacity-80">Category</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold sm:text-6xl">{data?.genre.label ?? "…"}</h1>
        <p className="mt-2 text-sm opacity-90">{data?.tracks.length ?? 0} tracks</p>
        {!!data?.tracks.length && (
          <button onClick={() => p.play(data.tracks[0], data.tracks)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0b0a0f] px-5 py-3 text-sm font-semibold">
            <Play className="size-4 fill-white" /> Play all
          </button>
        )}
      </div>
      {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-surface" />}
      {data && !data.tracks.length && <p className="text-muted-foreground">Nothing here yet. Be the first to upload {data.genre.label}.</p>}
      <div className="space-y-1">
        {data?.tracks.map((t, i) => <TrackRow key={t.id} track={t} queue={data.tracks} index={i} />)}
      </div>
    </div>
  );
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery(searchQuery(q));
  return (
    <div>
      <PageHeader title="Search" subtitle="Tracks, artists, genres" />
      <label className="flex items-center gap-3 rounded-full bg-surface-2 px-5 py-3.5">
        <SearchIcon className="size-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try 'techno' or 'NEON KARTEL'" aria-label="Try 'techno' or 'NEON KARTEL'" className="w-full bg-transparent outline-none placeholder:text-dim" />
      </label>
      <div className="mt-6 space-y-1">
        {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {data?.map((t) => <TrackRow key={t.id} track={t} queue={data} />)}
        {q && data && !data.length && !isFetching && <p className="text-sm text-muted-foreground">No matches.</p>}
      </div>
    </div>
  );
}

export function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useQuery(artistQuery(id!));
  const champ = useQuery(championQuery());
  const p = usePlayer();
  if (!data) return <div className="h-64 animate-pulse rounded-[26px] bg-surface" />;
  const isChamp = champ.data?.userId === data.profile.userId;
  return (
    <div>
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
        <img src={data.profile.avatarUrl ?? "/images/cover-edm.jpg"} alt="" className={cn("size-36 rounded-full object-cover sm:size-44", isChamp ? "ring-4 ring-pink glow" : "ring-2 ring-white/10")} />
        <div className="min-w-0 flex-1">
          {isChamp && <ChampionTag className="mb-2" />}
          <h1 className="font-display text-3xl font-extrabold sm:text-5xl">{data.profile.artistName}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{data.profile.bio}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {data.tracks.length} tracks · {fmtCount(data.totalPlays)} plays
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {!!data.tracks.length && (
          <button onClick={() => p.play(data.tracks[0], data.tracks)} className="inline-flex items-center gap-2 rounded-full bg-grad px-5 py-2.5 text-sm font-semibold glow">
            <Play className="size-4 fill-white" /> Play
          </button>
        )}
        <ShareButton title={data.profile.artistName} path={`/artist/${data.profile.userId}`} />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Listen on</p>
        <ListenOn links={data.profile.links} />
        {!Object.values(data.profile.links).some(Boolean) && <p className="text-sm text-dim">No platforms linked yet.</p>}
      </div>
      <DonationBar recipientId={data.profile.userId} className="mt-6" />
      {!data.profile.approved && <p className="mt-8 rounded-2xl bg-surface p-5 text-sm text-muted-foreground">This artist isn't approved yet.</p>}
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Tracks</h2>
      <div className="space-y-1">
        {data.tracks.map((t, i) => <TrackRow key={t.id} track={t} queue={data.tracks} index={i} />)}
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const { data } = useQuery(leaderboardQuery());
  const top = data?.ranked.slice(0, 3) ?? [];
  return (
    <div>
      <PageHeader
        title={<span className="flex items-center gap-3"><Trophy className="size-7 text-pink" /> Leaderboard</span>}
        subtitle={data ? `Every ${data.rules.every} uploads = ${data.rules.points} pts. Most points holds the Best AI DJ title.` : " "}
      />
      {data?.champion && (
        <div className="relative overflow-hidden rounded-[26px] bg-grad p-6 sm:p-8">
          <div className="absolute -right-6 -top-6 opacity-20"><Crown className="size-44" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.25em]">Best AI DJ · title holder</p>
          <div className="mt-4 flex items-center gap-4">
            <img src={data.champion.avatarUrl ?? "/images/cover-edm.jpg"} alt="" className="size-20 rounded-full object-cover ring-4 ring-white/40" />
            <div>
              <Link href={`/artist/${data.champion.userId}`} className="font-display text-2xl font-extrabold sm:text-4xl">{data.champion.artistName}</Link>
              <p className="text-sm opacity-90">{data.champion.points} pts · {data.champion.uploads} uploads · {fmtCount(data.champion.plays)} plays</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {top.map((r) => (
          <div key={r.userId} className="rounded-[22px] bg-surface p-4 text-center">
            <span className="font-display text-3xl font-extrabold text-grad">#{r.rank}</span>
            <p className="mt-1 truncate text-sm font-semibold">{r.artistName}</p>
            <p className="text-xs text-muted-foreground">{r.points} pts</p>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-[22px] border border-white/5">
        <div className="grid grid-cols-[40px_1fr_70px_70px] gap-2 bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid-cols-[48px_1fr_90px_90px_140px]">
          <span>#</span><span>Artist</span><span className="text-right">Pts</span><span className="text-right">Uploads</span><span className="hidden sm:block">Next award</span>
        </div>
        {data?.ranked.map((r) => (
          <Link
            key={r.userId}
            href={`/artist/${r.userId}`}
            className="grid grid-cols-[40px_1fr_70px_70px] items-center gap-2 border-t border-white/5 px-4 py-3 hover:bg-white/5 sm:grid-cols-[48px_1fr_90px_90px_140px]"
          >
            <span className="font-display font-bold text-dim">{r.rank}</span>
            <span className="flex min-w-0 items-center gap-3">
              <img src={r.avatarUrl ?? "/images/cover-edm.jpg"} alt="" className="size-9 rounded-full object-cover" />
              <span className="truncate font-semibold">{r.artistName}</span>
              {r.rank === 1 && r.points > 0 && <Crown className="size-4 shrink-0 text-pink" />}
            </span>
            <span className="text-right font-display font-bold">{r.points}</span>
            <span className="text-right text-muted-foreground">{r.uploads}</span>
            <span className="hidden items-center gap-2 sm:flex">
              <span className="h-1.5 flex-1 rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-grad" style={{ width: `${(r.towardNext / data.rules.every) * 100}%` }} />
              </span>
              <span className="text-[11px] text-muted-foreground">{r.towardNext}/{data.rules.every}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

