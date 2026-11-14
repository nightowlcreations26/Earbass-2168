import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Sparkles, Loader2, Save, Trash2, Circle, Shuffle, Eraser, Volume2, VolumeX, ChevronUp, ChevronDown, FolderOpen } from "lucide-react";
import { authClient } from "@/lib/auth";
import { usePlayer } from "@/lib/player";
import { getCtx, KITS, VOICES, triggerVoice, FxRack, FX_DEFAULT, type FxState, type Kit, type VoiceId } from "@/lib/audio/engine";
import { studioBus } from "@/lib/upload";
import { beatsQuery, generatePatternMutation, saveBeatMutation, deleteBeatMutation } from "@/queries/studio";
import { FxPanel, Knob, Meter } from "@/components/studio/controls";
import { ClipCard, useClips } from "@/components/studio/clip-actions";
import { cn } from "@/lib/utils";

type TrackState = { id: string; steps: boolean[]; volume: number; muted: boolean; note: number[] };
export type Pattern = { bpm: number; swing: number; steps: number; tracks: TrackState[] };

const blank = (): Pattern => ({
  bpm: 128,
  swing: 0,
  steps: 16,
  tracks: VOICES.map((v) => ({ id: v.id, steps: Array(16).fill(false), volume: 0.8, muted: false, note: Array(16).fill(0) })),
});

const s = (str: string) => str.replace(/\s/g, "").split("").map((c) => c === "x");
type PresetDef = { name: string; kit: Kit; bpm: number; swing: number; rows: Partial<Record<VoiceId, string>>; bassNotes?: number[]; stabNotes?: number[] };
const PRESETS: PresetDef[] = [
  { name: "Techno", kit: "club", bpm: 132, swing: 0, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "..x...x...x...x.", openhat: "..x...x...x...x.", perc: "...x.....x....x.", bass: ".xx..xx..xx..xx." }, bassNotes: [0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0] },
  { name: "House", kit: "club", bpm: 124, swing: 0.12, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", openhat: "..x...x...x...x.", bass: "..x...x...x..x.x", stab: "...x.....x......" }, bassNotes: [0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 3, 0, 0, 7, 0, 5], stabNotes: Array(16).fill(0) },
  { name: "EDM", kit: "boosted", bpm: 128, swing: 0, rows: { kick: "x...x...x...x...", snare: "....x.......x...", clap: "....x.......x...", hat: "..x...x...x...x.", bass: ".x.x.x.x.x.x.x.x", stab: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 3, 3, 3, 3], stabNotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 3, 0, 0] },
  { name: "DnB", kit: "dnb", bpm: 174, swing: 0, rows: { kick: "x.........x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.", perc: ".......x......x.", bass: "x.....x...x....." }, bassNotes: [0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 5, 0, 0, 0, 0, 0] },
  { name: "Melodic", kit: "club", bpm: 122, swing: 0, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "..x...x...x...x.", bass: "x.xx..x.x.xx..x.", stab: "x.....x.....x..." }, bassNotes: [0, 0, 0, 3, 0, 0, 5, 0, 7, 0, 7, 5, 0, 0, 3, 0], stabNotes: [0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, -4, 0, 0, 0] },
  { name: "Mextech", kit: "latin", bpm: 126, swing: 0.18, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "xx.xxx.xxx.xxx.x", perc: "..x..x.x..x..xx.", bass: "...x..x....x..x." }, bassNotes: [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 5, 0, 0, 7, 0] },
  { name: "Night Bass", kit: "808", bpm: 130, swing: 0.28, rows: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "..x...x.x.x...xx", perc: "......x.......x.", bass: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 3, 0, 0, -5, 0, 0] },
  { name: "Bass Boosted", kit: "boosted", bpm: 150, swing: 0, rows: { kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2, 0, 0, -5, 0, 0] },
  { name: "Breakbeats", kit: "dnb", bpm: 136, swing: 0.1, rows: { kick: "x.x.......x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.", openhat: ".......x........", perc: "...x......x.....", bass: "x.x.......x..x.." }, bassNotes: [0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 3, 0, 0] },
];

function fromPreset(p: PresetDef): Pattern {
  const base = blank();
  base.bpm = p.bpm;
  base.swing = p.swing;
  base.tracks = base.tracks.map((t) => ({
    ...t,
    steps: p.rows[t.id as VoiceId] ? s(p.rows[t.id as VoiceId]!) : t.steps,
    note: t.id === "bass" && p.bassNotes ? p.bassNotes : t.id === "stab" && p.stabNotes ? p.stabNotes : t.note,
  }));
  return base;
}

function kitFromPrompt(prompt: string): Kit {
  const q = prompt.toLowerCase();
  if (/(dnb|drum ?(and|&|n) ?bass|jungle|break)/.test(q)) return "dnb";
  if (/(boost|bass ?boost|hard|phonk|dubstep)/.test(q)) return "boosted";
  if (/(mextech|latin|tribal|guaracha|reggaeton)/.test(q)) return "latin";
  if (/(night|808|trap|ukg|garage|grime)/.test(q)) return "808";
  return "club";
}

export default function BeatPad({ onSendToMix }: { onSendToMix: () => void }) {
  const { data: session } = authClient.useSession();
  const player = usePlayer();
  const qc = useQueryClient();
  const clips = useClips();

  const [pattern, setPattern] = useState<Pattern>(() => fromPreset(PRESETS[0]));
  const [kit, setKit] = useState<Kit>("club");
  const [name, setName] = useState("Untitled beat");
  const [fx, setFx] = useState<FxState>(FX_DEFAULT);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [selected, setSelected] = useState<VoiceId>("bass");
  const [hit, setHit] = useState<Record<string, number>>({});
  const [writeMode, setWriteMode] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiMade, setAiMade] = useState(false);
  const [recording, setRecording] = useState<null | number>(null);
  const [showBeats, setShowBeats] = useState(false);

  // refs mirror state for the scheduler
  const patRef = useRef(pattern);
  const kitRef = useRef(kit);
  patRef.current = pattern;
  kitRef.current = kit;
  const rackRef = useRef<FxRack | null>(null);
  const timer = useRef<number | null>(null);
  const nextTime = useRef(0);
  const cur = useRef(0);
  const stepRef = useRef(-1);

  const rack = useCallback(() => {
    if (!rackRef.current) rackRef.current = new FxRack(getCtx());
    return rackRef.current;
  }, []);

  useEffect(() => {
    rack().set(fx, pattern.bpm);
  }, [fx, pattern.bpm, rack]);

  const scheduleStep = (idx: number, t: number) => {
    const ctx = getCtx();
    const p = patRef.current;
    for (const tr of p.tracks) {
      if (tr.steps[idx] && !tr.muted && tr.volume > 0) {
        triggerVoice(ctx, rack().input, tr.id as VoiceId, t, tr.volume, kitRef.current, tr.note[idx] ?? 0);
      }
    }
    const delay = Math.max(0, (t - ctx.currentTime) * 1000);
    window.setTimeout(() => {
      stepRef.current = idx;
      setStep(idx);
    }, delay);
  };

  const start = () => {
    const ctx = getCtx();
    if (player.playing) player.toggle();
    rack();
    cur.current = 0;
    nextTime.current = ctx.currentTime + 0.06;
    const tick = () => {
      const p = patRef.current;
      const sixteenth = 60 / p.bpm / 4;
      while (nextTime.current < ctx.currentTime + 0.12) {
        const swingOffset = cur.current % 2 === 1 ? p.swing * sixteenth * 0.66 : 0;
        scheduleStep(cur.current, nextTime.current + swingOffset);
        nextTime.current += sixteenth;
        cur.current = (cur.current + 1) % 16;
      }
    };
    tick();
    timer.current = window.setInterval(tick, 25);
    setPlaying(true);
  };

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
    setStep(-1);
    stepRef.current = -1;
  };

  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const fire = useCallback(
    (id: VoiceId) => {
      const ctx = getCtx();
      const tr = patRef.current.tracks.find((t) => t.id === id)!;
      triggerVoice(ctx, rack().input, id, ctx.currentTime, tr.volume || 0.8, kitRef.current, 0);
      setHit((h) => ({ ...h, [id]: Date.now() }));
      if (writeMode && timer.current && stepRef.current >= 0) {
        const at = stepRef.current;
        setPattern((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, steps: t.steps.map((v, i) => (i === at ? true : v)) } : t)) }));
      }
    },
    [rack, writeMode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;
      const v = VOICES.find((x) => x.key === e.key);
      if (v) {
        e.preventDefault();
        fire(v.id);
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (timer.current) stop();
        else start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // re-binds each render so start/stop see fresh closures

  const toggleCell = (tid: string, i: number) =>
    setPattern((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === tid ? { ...t, steps: t.steps.map((v, j) => (j === i ? !v : v)) } : t)) }));
  const patchTrack = (tid: string, patch: Partial<TrackState>) => setPattern((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === tid ? { ...t, ...patch } : t)) }));
  const nudgeNote = (tid: string, i: number, d: number) =>
    setPattern((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === tid ? { ...t, note: t.note.map((n, j) => (j === i ? Math.max(-12, Math.min(12, n + d)) : n)) } : t)) }));

  const randomize = () =>
    setPattern((p) => ({
      ...p,
      tracks: p.tracks.map((t) => {
        const dens: Record<string, number> = { kick: 0.3, snare: 0.12, clap: 0.12, hat: 0.55, openhat: 0.15, perc: 0.2, bass: 0.35, stab: 0.15 };
        const steps = Array.from({ length: 16 }, (_, i) => (t.id === "kick" && i % 4 === 0 ? true : Math.random() < (dens[t.id] ?? 0.2)));
        const scale = [0, 3, 5, 7, 10, 12];
        return { ...t, steps, note: t.id === "bass" || t.id === "stab" ? steps.map(() => scale[Math.floor(Math.random() * scale.length)]) : t.note };
      }),
    }));

  const gen = useMutation({
    ...generatePatternMutation(),
    onSuccess: (r) => {
      setPattern(r.pattern as Pattern);
      setName(r.name);
      setKit(kitFromPrompt(prompt));
      setAiMade(true);
    },
  });

  const beats = useQuery(beatsQuery(!!session));
  const save = useMutation({ ...saveBeatMutation(), onSuccess: () => qc.invalidateQueries({ queryKey: beatsQuery(true).queryKey }) });
  const del = useMutation({ ...deleteBeatMutation(), onSuccess: () => qc.invalidateQueries({ queryKey: beatsQuery(true).queryKey }) });

  const record = async () => {
    const bars = 4;
    if (!timer.current) start();
    const r = rack().record();
    const secs = (bars * 4 * 60) / patRef.current.bpm;
    const t0 = Date.now();
    setRecording(0);
    const iv = window.setInterval(() => setRecording(Math.min(1, (Date.now() - t0) / 1000 / secs)), 100);
    await new Promise((res) => window.setTimeout(res, secs * 1000 + 300));
    window.clearInterval(iv);
    const blob = await r.stop();
    setRecording(null);
    studioBus.add({ name, blob, fromAI: aiMade });
  };

  const selTrack = pattern.tracks.find((t) => t.id === selected)!;
  const melodic = selected === "bass" || selected === "stab";

  return (
    <div className="space-y-5">
      {/* AI prompt */}
      <div className="bg-grad-soft rounded-[22px] p-[1px]">
        <div className="rounded-[21px] bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-pink" /> AI pattern generator
          </div>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim().length > 1) gen.mutate({ prompt });
            }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. dark rolling techno at 134 with an offbeat acid bass" aria-label="e.g. dark rolling techno at 134 with an offbeat acid bass"
              className="h-12 flex-1 rounded-full border border-white/10 bg-surface-2 px-5 text-sm outline-none focus:border-pink/60"
            />
            <button disabled={gen.isPending} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-grad px-6 text-sm font-semibold glow disabled:opacity-60">
              {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate
            </button>
          </form>
          {gen.error && <p className="mt-2 text-xs text-red-400">{gen.error.message}</p>}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setPattern(fromPreset(p));
                  setKit(p.kit);
                  setName(`${p.name} groove`);
                  setAiMade(false);
                }}
                className="shrink-0 rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:border-pink/50 hover:text-white"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transport */}
      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-white/5 bg-surface p-4">
        <button onClick={() => (playing ? stop() : start())} className={cn("grid size-14 place-items-center rounded-full", playing ? "bg-white text-black" : "bg-grad glow")} aria-label={playing ? "Stop" : "Play"}>
          {playing ? <Square className="size-5 fill-current" /> : <Play className="ml-1 size-6 fill-current" />}
        </button>
        <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-44 rounded-full bg-surface-2 px-4 text-sm font-semibold outline-none" aria-label="Beat name" />
        <Knob label="BPM" value={pattern.bpm} min={60} max={200} defaultValue={128} format={(v) => `${Math.round(v)}`} onChange={(v) => setPattern((p) => ({ ...p, bpm: Math.round(v) }))} size={46} />
        <Knob label="Swing" value={pattern.swing} min={0} max={0.6} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setPattern((p) => ({ ...p, swing: v }))} size={46} color="#c6ff3d" />
        <select value={kit} onChange={(e) => setKit(e.target.value as Kit)} className="h-10 rounded-full border border-white/10 bg-surface-2 px-4 text-sm outline-none" aria-label="Kit">
          {KITS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={randomize} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/5 px-4 text-xs font-semibold hover:bg-white/10">
            <Shuffle className="size-3.5" /> Randomize
          </button>
          <button onClick={() => setPattern((p) => ({ ...blank(), bpm: p.bpm, swing: p.swing }))} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/5 px-4 text-xs font-semibold hover:bg-white/10">
            <Eraser className="size-3.5" /> Clear
          </button>
          <button
            onClick={record}
            disabled={recording !== null}
            className="relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-full bg-red-500/15 px-4 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-90"
          >
            {recording !== null && <span className="absolute inset-y-0 left-0 bg-red-500/30" style={{ width: `${recording * 100}%` }} />}
            <Circle className={cn("relative size-3 fill-current", recording !== null && "animate-pulse")} />
            <span className="relative">{recording !== null ? "Recording 4 bars…" : "Record 4 bars"}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-[22px] border border-white/5 bg-surface p-3 sm:p-4">
        <div className="min-w-[720px] space-y-1.5">
          {pattern.tracks.map((t) => {
            const v = VOICES.find((x) => x.id === t.id)!;
            return (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  onClick={() => setSelected(v.id)}
                  className={cn("flex w-28 shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold", selected === v.id ? "bg-white/10" : "hover:bg-white/5")}
                >
                  <span className="size-2.5 rounded-full" style={{ background: v.color }} />
                  {v.label}
                </button>
                <button onClick={() => patchTrack(t.id, { muted: !t.muted })} className={cn("grid size-8 shrink-0 place-items-center rounded-lg", t.muted ? "bg-red-500/20 text-red-300" : "bg-white/5 text-muted-foreground")} aria-label={t.muted ? "Unmute" : "Mute"}>
                  {t.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </button>
                <div className="w-16 shrink-0">
                  <input type="range" min={0} max={1} step={0.01} value={t.volume} onChange={(e) => patchTrack(t.id, { volume: Number(e.target.value) })} className="eb-range w-full" aria-label={`${v.label} volume`} />
                </div>
                <div className="grid min-w-0 flex-1 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                  {t.steps.map((on, i) => (
                    <button
                      key={i}
                      onClick={() => toggleCell(t.id, i)}
                      aria-label={`${v.label} step ${i + 1}`}
                      className={cn("aspect-square rounded-md transition-[transform,background] duration-75", i % 4 === 0 && !on && "bg-white/[0.09]", !on && i % 4 !== 0 && "bg-white/[0.04]", step === i && "ring-2 ring-white/70", step === i && on && "scale-110", t.muted && on && "opacity-30")}
                      style={on ? { background: v.color, boxShadow: step === i ? `0 0 14px ${v.color}` : undefined } : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {melodic && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-[14rem] shrink-0 pl-2.5 text-[11px] text-muted-foreground">
                {selected === "bass" ? "Bass" : "Stab"} notes (semitones)
              </div>
              <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                {selTrack.note.map((n, i) => (
                  <div key={i} className={cn("flex flex-col items-center rounded-md py-0.5", selTrack.steps[i] ? "bg-white/10" : "bg-white/[0.03] opacity-50")}>
                    <button onClick={() => nudgeNote(selected, i, 1)} aria-label="Note up" className="text-muted-foreground hover:text-white">
                      <ChevronUp className="size-3" />
                    </button>
                    <span className="text-[10px] tabular-nums">{n > 0 ? `+${n}` : n}</span>
                    <button onClick={() => nudgeNote(selected, i, -1)} aria-label="Note down" className="text-muted-foreground hover:text-white">
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* Live pads */}
        <div className="rounded-[22px] border border-white/5 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-bold">Live pads</p>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <input type="checkbox" checked={writeMode} onChange={(e) => setWriteMode(e.target.checked)} className="accent-[#ff3da5]" aria-label="Write into pattern" />
              Write into pattern
            </label>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {VOICES.map((v) => {
              const lit = hit[v.id] && Date.now() - hit[v.id] < 150;
              return (
                <button
                  key={v.id}
                  onPointerDown={() => fire(v.id)}
                  className="relative aspect-square rounded-2xl border border-white/5 text-left transition-transform active:scale-95"
                  style={{ background: lit ? v.color : `linear-gradient(160deg, ${v.color}33, #1d1a25 70%)`, boxShadow: lit ? `0 0 24px ${v.color}` : undefined }}
                >
                  <span className="absolute left-2 top-2 text-[10px] font-bold text-white/60">{v.key}</span>
                  <span className="absolute bottom-2 left-2 text-xs font-semibold">{v.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-dim">Keys 1–8 trigger pads · Space plays/stops</p>
          <Meter get={() => rackRef.current?.level() ?? null} className="mt-3" />
        </div>

        <FxPanel fx={fx} onChange={setFx} title="Beat FX" />
      </div>

      {/* Save / load */}
      <div className="rounded-[22px] border border-white/5 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto font-display text-sm font-bold">Your beats</p>
          {session ? (
            <>
              <button onClick={() => setShowBeats((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/5 px-4 text-xs font-semibold hover:bg-white/10">
                <FolderOpen className="size-3.5" /> {showBeats ? "Hide" : `Load (${beats.data?.length ?? 0})`}
              </button>
              <button onClick={() => save.mutate({ name, pattern })} disabled={save.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-grad px-4 text-xs font-semibold disabled:opacity-60">
                {save.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} {save.isSuccess ? "Saved" : "Save beat"}
              </button>
            </>
          ) : (
            <a href="/sign-in" className="text-xs font-semibold text-pink">
              Sign in to save beats
            </a>
          )}
        </div>
        {showBeats && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {beats.data?.length === 0 && <p className="text-xs text-muted-foreground">No saved beats yet.</p>}
            {beats.data?.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <button
                  className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-pink"
                  onClick={() => {
                    setPattern(b.pattern as Pattern);
                    setName(b.name);
                  }}
                >
                  {b.name} <span className="text-xs font-normal text-muted-foreground">· {(b.pattern as Pattern).bpm} bpm</span>
                </button>
                <button onClick={() => del.mutate({ id: b.id })} className="text-muted-foreground hover:text-red-400" aria-label="Delete beat">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {clips.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recordings</p>
            {clips.map((c) => (
              <ClipCard key={c.url} clip={c} onSendToMix={onSendToMix} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
