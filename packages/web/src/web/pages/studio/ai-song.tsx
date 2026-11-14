import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation as useLoc } from "wouter";
import { Wand2, Loader2, Play, Pause, UploadCloud, Download, KeyRound, Coins, Lock, Trash2, AlertTriangle, PlayCircle } from "lucide-react";
import { authClient } from "@/lib/auth";
import { usePlayer } from "@/lib/player";
import { songsQuery, generateSongMutation } from "@/queries/studio";
import { creditsStatusQuery, deleteSongMutation, lengthLabel } from "@/queries/credits";
import { AdModal } from "@/pages/credits";
import { studioBus } from "@/lib/upload";
import { SignInPrompt } from "@/components/shell";
import { cn } from "@/lib/utils";

const IDEAS = [
  "Peak-time melodic techno, 124 bpm, haunting female vocal chops, rolling bassline, big breakdown",
  "Liquid drum and bass at 174, warm Rhodes, airy pads, soulful vocal hook",
  "Mextech banger, 128 bpm, tribal latin percussion, guaracha synth lead, crowd chants",
  "Night bass, 130 bpm, swung UKG drums, sub-heavy 808, moody late-night atmosphere",
  "Bass boosted festival EDM drop, 150 bpm, distorted kicks, siren leads",
];

const SECONDS = [30, 60, 120, 180] as const;
type Seconds = (typeof SECONDS)[number];
type Engine = "earbass" | "elevenlabs" | "replicate" | "stability" | "mubert";

function EngineChip({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={cn("shrink-0 rounded-2xl border px-4 py-2 text-left", active ? "border-pink bg-pink/10" : "border-white/10 bg-surface-2 hover:border-white/25")}>
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </button>
  );
}

export default function AiSong() {
  const { data: session } = authClient.useSession();
  const status = useQuery(creditsStatusQuery(!!session));
  const songsOpts = songsQuery(!!session);
  const songs = useQuery({
    ...songsOpts,
    refetchInterval: (q) => (q.state.data?.some((x) => x.status === "pending") ? 3000 : false),
  });
  const qc = useQueryClient();
  const [, nav] = useLoc();
  const [prompt, setPrompt] = useState(IDEAS[0]);
  const [seconds, setSeconds] = useState<Seconds>(30);
  const [engine, setEngine] = useState<Engine>("earbass");
  const [adOpen, setAdOpen] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioEl] = useState(() => (typeof Audio !== "undefined" ? new Audio() : null));
  const player = usePlayer();

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: songsOpts.queryKey });
    void qc.invalidateQueries({ queryKey: creditsStatusQuery(true).queryKey });
  };
  const gen = useMutation({ ...generateSongMutation(), onSuccess: refreshAll });
  const del = useMutation({ ...deleteSongMutation(), onSuccess: refreshAll });

  // When a pending song finishes, refresh the balance.
  const pendingCount = songs.data?.filter((x) => x.status === "pending").length ?? 0;
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: creditsStatusQuery(true).queryKey });
  }, [pendingCount, qc]);

  // Default to a connected key if the user has no credits.
  const d = status.data;
  useEffect(() => {
    if (d && engine === "earbass" && !d.platformEngine && d.keys[0]) setEngine(d.keys[0].provider);
  }, [d, engine]);

  const toggle = (id: number, url: string) => {
    if (!audioEl) return;
    if (playingId === id) {
      audioEl.pause();
      setPlayingId(null);
      return;
    }
    if (player.playing) player.toggle();
    audioEl.src = url;
    audioEl.onended = () => setPlayingId(null);
    void audioEl.play();
    setPlayingId(id);
  };

  const sendToUpload = async (url: string, name: string) => {
    const blob = await (await fetch(url)).blob();
    studioBus.pendingUpload = { name, blob, url, fromAI: true };
    nav("/upload");
  };

  if (!session) return <SignInPrompt what="generate full AI songs" />;

  const isPro = d?.plan && d.plan !== "free";
  const usingCredits = engine === "earbass";
  const cost = d?.costs[String(seconds) as "30"] ?? 0;
  const lockedLength = (s: number) => !isPro && s > (d?.freeMaxSeconds ?? 60);
  const short = usingCredits && !!d && d.available < cost;
  const engineReady = usingCredits ? !!d?.platformEngine : !!d?.keys.some((k) => k.provider === engine);
  const canGo = !!d && engineReady && !short && !lockedLength(seconds) && prompt.trim().length >= 3 && pendingCount < 2;

  return (
    <div className="space-y-5">
      <div className="bg-grad-soft rounded-[22px] p-[1px]">
        <div className="rounded-[21px] bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Wand2 className="size-5 text-pink" />
            <p className="font-display text-lg font-bold">AI Song Generator</p>
            <Link href="/credits" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
              <Coins className="size-3.5 text-pink" /> {d ? `${d.available} credits` : "…"}
              {isPro && <span className="rounded-full bg-white px-1.5 text-[9px] font-extrabold text-black">PRO</span>}
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Describe a full track — genre, tempo, mood, instruments, vocals. You get a finished, mastered song.</p>

          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Engine</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <EngineChip active={usingCredits} onClick={() => setEngine("earbass")} title="Earbass credits" sub={d?.platformEngine ? "ElevenLabs Music" : "Offline"} />
              {d?.keys.map((k) => (
                <EngineChip key={k.provider} active={engine === k.provider} onClick={() => setEngine(k.provider)} title={`Your ${k.name}`} sub={`${k.hint} · 0 credits`} />
              ))}
              <Link href="/credits" className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-dashed border-white/15 px-4 text-xs text-muted-foreground hover:text-white">
                <KeyRound className="size-3.5" /> Use your own key
              </Link>
            </div>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            maxLength={600}
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-surface-2 p-4 text-sm outline-none focus:border-pink/60"
            placeholder="Describe your song…" aria-label="Describe your song…"
          />
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
            {IDEAS.map((i) => (
              <button key={i} onClick={() => setPrompt(i)} className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-muted-foreground hover:border-pink/50 hover:text-white">
                {i.split(",")[0]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted-foreground">Length</span>
            {SECONDS.map((s) => (
              <button
                key={s}
                onClick={() => (lockedLength(s) ? nav("/credits") : setSeconds(s))}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold", seconds === s ? "bg-white text-black" : "bg-white/5 hover:bg-white/10", lockedLength(s) && "text-muted-foreground")}
              >
                {lockedLength(s) && <Lock className="size-3" />}
                {lengthLabel(s)}
                {usingCredits && <span className="font-normal opacity-60">· {d?.costs[String(s) as "30"]}cr</span>}
              </button>
            ))}
            <button
              disabled={!canGo || gen.isPending}
              onClick={() => gen.mutate({ prompt, seconds, engine })}
              className="ml-auto inline-flex h-12 items-center gap-2 rounded-full bg-grad px-7 text-sm font-semibold glow disabled:opacity-50 disabled:shadow-none"
            >
              {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
              {gen.isPending ? "Starting…" : usingCredits ? `Generate · ${cost} ${cost === 1 ? "credit" : "credits"}` : "Generate on your key"}
            </button>
          </div>
          {d && lockedLength(seconds) && <p className="mt-3 text-xs text-muted-foreground">Songs over 1 min are for members. <Link href="/credits" className="text-pink">See membership →</Link></p>}
          {short && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 p-3 text-sm">
              <Coins className="size-4 text-pink" />
              <span className="flex-1 text-muted-foreground">You need {cost} credits, you have {d?.available}.</span>
              {!!d?.ads.left && (
                <button onClick={() => setAdOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black"><PlayCircle className="size-3.5" /> Watch ad +1</button>
              )}
              <Link href="/credits" className="rounded-full bg-grad px-3 py-1.5 text-xs font-semibold">Get credits</Link>
            </div>
          )}
          {usingCredits && d && !d.platformEngine && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><KeyRound className="size-3.5 text-pink" /> The Earbass engine is offline right now — connect your own key to keep making songs.</p>
          )}
          {pendingCount >= 2 && <p className="mt-3 text-xs text-muted-foreground">Two songs are composing — wait for one to finish.</p>}
          {gen.error && <p className="mt-3 text-xs text-red-400">{gen.error.message}</p>}
        </div>
      </div>
      {adOpen && <AdModal onClose={() => setAdOpen(false)} />}

      <div className="rounded-[22px] border border-white/5 bg-surface p-4">
        <p className="mb-3 font-display text-sm font-bold">Your AI songs</p>
        {songs.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet — your generated songs land here.</p>}
        <div className="space-y-2">
          {songs.data?.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-2 p-3">
              {s.status === "ready" ? (
                <button onClick={() => toggle(s.id, s.audioUrl)} className="grid size-10 shrink-0 place-items-center rounded-full bg-grad" aria-label="Play">
                  {playingId === s.id ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
                </button>
              ) : (
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", s.status === "pending" ? "bg-white/5" : "bg-red-500/15")}>
                  {s.status === "pending" ? <Loader2 className="size-4 animate-spin text-pink" /> : <AlertTriangle className="size-4 text-red-300" />}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm">{s.prompt}</p>
                <p className={cn("mt-0.5 text-[11px]", s.status === "failed" ? "text-red-300" : "text-dim")}>
                  {s.status === "pending" ? "Composing… usually under a minute" : s.status === "failed" ? `Failed${s.error ? ` — ${s.error}` : ""}${s.credits ? " · no credits charged" : ""}` : `${lengthLabel(s.seconds)} · ${s.provider === "earbass" ? `${s.credits} ${s.credits === 1 ? "credit" : "credits"}` : `your ${s.provider} key`}`}
                </p>
              </div>
              {s.status === "ready" && (
                <>
                  <button onClick={() => sendToUpload(s.audioUrl, s.prompt.split(",")[0].slice(0, 60))} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
                    <UploadCloud className="size-3.5" /> Upload
                  </button>
                  <a href={s.audioUrl} download className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
                    <Download className="size-3.5" /> Save
                  </a>
                </>
              )}
              {s.status !== "pending" && (
                <button onClick={() => del.mutate({ id: s.id })} aria-label="Delete song" className="grid size-8 place-items-center rounded-full bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
