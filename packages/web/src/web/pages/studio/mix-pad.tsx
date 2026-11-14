import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, Loader2, FolderOpen, X, Circle, Square, Zap, Rocket, Megaphone, ArrowDownToLine, Disc, Waves, Repeat, Wind, RefreshCw, Music2 } from "lucide-react";
import { homeQuery } from "@/queries/catalog";
import { usePlayer, fmtTime } from "@/lib/player";
import { getCtx, FxRack, FX_DEFAULT, riser, airhorn, subDrop, laser, decodeUrl, type FxState } from "@/lib/audio/engine";
import { Deck } from "@/lib/audio/deck";
import { studioBus } from "@/lib/upload";
import { FxPanel, Knob, Meter } from "@/components/studio/controls";
import { ClipCard, useClips } from "@/components/studio/clip-actions";
import { cn } from "@/lib/utils";

type Engine = { rack: FxRack; a: Deck; b: Deck; fxBus: GainNode };
let engine: Engine | null = null;
function getEngine(): Engine {
  if (engine) return engine;
  const ctx = getCtx();
  const rack = new FxRack(ctx);
  const fxBus = ctx.createGain();
  fxBus.gain.value = 0.8;
  fxBus.connect(rack.input);
  engine = { rack, a: new Deck(ctx, rack.input), b: new Deck(ctx, rack.input), fxBus };
  return engine;
}

const EQ_KILL = -40;

export default function MixPad() {
  const player = usePlayer();
  const [ready, setReady] = useState(false);
  const [xf, setXf] = useState(0.5);
  const [fx, setFx] = useState<FxState>(FX_DEFAULT);
  const [masterBpm, setMasterBpm] = useState(128);
  const [rec, setRec] = useState<{ stop: () => Promise<Blob>; t0: number } | null>(null);
  const [recTime, setRecTime] = useState(0);
  const clips = useClips();
  const fxRef = useRef(fx);
  fxRef.current = fx;

  const init = () => {
    if (player.playing) player.toggle();
    getEngine();
    setReady(true);
  };

  useEffect(() => {
    if (!ready) return;
    const e = getEngine();
    // constant-power crossfade
    e.a.setChannel(Math.cos((xf * Math.PI) / 2));
    e.b.setChannel(Math.sin((xf * Math.PI) / 2));
  }, [xf, ready]);

  useEffect(() => {
    if (ready) getEngine().rack.set(fx, masterBpm);
  }, [fx, masterBpm, ready]);

  useEffect(() => {
    if (!rec) return;
    const iv = window.setInterval(() => setRecTime((Date.now() - rec.t0) / 1000), 250);
    return () => window.clearInterval(iv);
  }, [rec]);

  useEffect(() => () => {
    engine?.a.pause();
    engine?.b.pause();
  }, []);

  const focus = () => (xf <= 0.5 ? getEngine().a : getEngine().b);

  const pads: { label: string; icon: typeof Zap; color: string; run: () => void }[] = [
    { label: "Riser", icon: Rocket, color: "#ff3da5", run: () => riser(getCtx(), getEngine().fxBus, (60 / masterBpm) * 8) },
    { label: "Airhorn", icon: Megaphone, color: "#c6ff3d", run: () => airhorn(getCtx(), getEngine().fxBus) },
    { label: "Sub Drop", icon: ArrowDownToLine, color: "#c026d3", run: () => subDrop(getCtx(), getEngine().fxBus) },
    { label: "Laser", icon: Zap, color: "#f0abfc", run: () => laser(getCtx(), getEngine().fxBus) },
    { label: "Tape Stop", icon: Disc, color: "#ff7ac6", run: () => focus().tapeStop() },
    {
      label: "Echo Out",
      icon: Waves,
      color: "#e879f9",
      run: () => {
        const d = focus();
        const prev = fxRef.current;
        setFx({ ...prev, delay: 1, reverb: Math.max(prev.reverb, 0.4) });
        d.setVolume(0);
        window.setTimeout(() => d.pause(), 120);
        window.setTimeout(() => {
          setFx(prev);
          d.setVolume(0.85);
        }, 3200);
      },
    },
    { label: "Beat Roll", icon: Repeat, color: "#ffb3da", run: () => focus().stutter(60 / masterBpm / 2, 8) },
    {
      label: "Sweep",
      icon: Wind,
      color: "#a3e635",
      run: () => {
        const prev = fxRef.current;
        const t0 = performance.now();
        const dur = (60 / masterBpm) * 8 * 1000;
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / dur);
          setFx({ ...prev, filter: k * 0.85 });
          if (k < 1) requestAnimationFrame(step);
          else setFx(prev);
        };
        step();
      },
    },
  ];

  useEffect(() => {
    const keys = "qwertyui";
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (!ready || el.tagName === "INPUT" || el.tagName === "SELECT") return;
      const i = keys.indexOf(e.key.toLowerCase());
      if (i >= 0) pads[i].run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!ready) {
    return (
      <div className="bg-grad-soft relative overflow-hidden rounded-[26px] p-8 text-center text-[#1a0b14] sm:p-14">
        <Disc className="mx-auto size-14 animate-[spin_4s_linear_infinite]" />
        <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Mix Pad</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium opacity-80">
          Two decks, 3-band EQ with kills, filters, hot cues, crossfader, a 7-slot master FX rack, 8 performance pads and master recording.
        </p>
        <button onClick={init} className="mt-6 rounded-full bg-[#0b0a0f] px-8 py-3.5 text-sm font-semibold text-white">
          Power on decks
        </button>
      </div>
    );
  }

  const e = getEngine();
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <DeckPanel deck={e.a} label="A" accent="#ff3da5" masterBpm={masterBpm} onBpm={setMasterBpm} other={e.b} />
        <DeckPanel deck={e.b} label="B" accent="#c6ff3d" masterBpm={masterBpm} onBpm={setMasterBpm} other={e.a} />
      </div>

      {/* Crossfader + master */}
      <div className="flex flex-col items-center gap-4 rounded-[22px] border border-white/5 bg-surface p-5 sm:flex-row">
        <div className="flex w-full flex-1 items-center gap-3">
          <span className="font-display text-sm font-bold text-pink">A</span>
          <input type="range" min={0} max={1} step={0.005} value={xf} onChange={(ev) => setXf(Number(ev.target.value))} onDoubleClick={() => setXf(0.5)} className="eb-range flex-1" aria-label="Crossfader" />
          <span className="font-display text-sm font-bold text-lime">B</span>
        </div>
        <div className="flex items-center gap-3">
          <Meter get={() => e.rack.level()} className="h-10 w-40" />
          <button
            onClick={async () => {
              if (rec) {
                const blob = await rec.stop();
                setRec(null);
                setRecTime(0);
                studioBus.add({ name: `Earbass mix ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, blob, fromAI: false });
              } else {
                setRec({ ...e.rack.record(), t0: Date.now() });
              }
            }}
            className={cn("inline-flex h-11 items-center gap-2 rounded-full px-5 text-xs font-semibold", rec ? "bg-red-500 text-white" : "bg-red-500/15 text-red-300 hover:bg-red-500/25")}
          >
            {rec ? <Square className="size-3.5 fill-current" /> : <Circle className="size-3.5 fill-current" />}
            {rec ? `Stop · ${fmtTime(recTime)}` : "Record mix"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <div className="rounded-[22px] border border-white/5 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-bold">Performance pads</p>
            <span className="text-[11px] text-dim">Keys Q–I · acts on the louder deck</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {pads.map((p, i) => (
              <button
                key={p.label}
                onPointerDown={p.run}
                className="group relative flex aspect-square flex-col items-start justify-between rounded-2xl border border-white/5 p-2.5 transition-transform active:scale-95"
                style={{ background: `linear-gradient(160deg, ${p.color}40, #1d1a25 70%)` }}
              >
                <span className="text-[10px] font-bold uppercase text-white/50">{"QWERTYUI"[i]}</span>
                <p.icon className="size-5" style={{ color: p.color }} />
                <span className="text-[11px] font-semibold leading-tight">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <FxPanel fx={fx} onChange={setFx} title="Master FX rack" />
      </div>

      {clips.length > 0 && (
        <div className="space-y-2 rounded-[22px] border border-white/5 bg-surface p-4">
          <p className="font-display text-sm font-bold">Recordings</p>
          {clips.map((c) => (
            <ClipCard key={c.url} clip={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeckPanel({ deck, label, accent, masterBpm, onBpm, other }: { deck: Deck; label: string; accent: string; masterBpm: number; onBpm: (b: number) => void; other: Deck }) {
  const [, force] = useState(0);
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [eq, setEq] = useState({ low: 0, mid: 0, high: 0 });
  const [kill, setKill] = useState({ low: false, mid: false, high: false });
  const [filter, setFilter] = useState(0);
  const [vol, setVol] = useState(0.85);
  const [pitch, setPitch] = useState(0); // -0.16..0.16
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    deck.setEq(kill.low ? EQ_KILL : eq.low, kill.mid ? EQ_KILL : eq.mid, kill.high ? EQ_KILL : eq.high);
  }, [deck, eq, kill]);
  useEffect(() => deck.setFilter(filter), [deck, filter]);
  useEffect(() => deck.setVolume(vol), [deck, vol]);
  useEffect(() => deck.setRate(1 + pitch), [deck, pitch]);
  useEffect(() => {
    deck.onEnd = () => force((n) => n + 1);
  }, [deck]);

  // waveform + playhead
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const draw = (ts: number) => {
      const cv = canvas.current;
      if (cv) {
        const g = cv.getContext("2d")!;
        const w = (cv.width = cv.clientWidth * 2);
        const h = (cv.height = cv.clientHeight * 2);
        g.clearRect(0, 0, w, h);
        const peaks = deck.peaks;
        const prog = deck.duration ? deck.position / deck.duration : 0;
        if (peaks) {
          const bw = w / peaks.length;
          for (let i = 0; i < peaks.length; i++) {
            const ph = Math.max(2, peaks[i] * h * 0.9);
            g.fillStyle = i / peaks.length < prog ? accent : "rgba(255,255,255,0.22)";
            g.fillRect(i * bw, (h - ph) / 2, Math.max(1, bw - 0.5), ph);
          }
          deck.cues.forEach((c, i) => {
            if (c == null) return;
            const x = (c / deck.duration) * w;
            g.fillStyle = CUE_COLORS[i];
            g.fillRect(x - 1, 0, 3, h);
          });
          g.fillStyle = "#fff";
          g.fillRect(prog * w - 1.5, 0, 3, h);
        } else {
          g.fillStyle = "rgba(255,255,255,0.08)";
          g.fillRect(0, h / 2 - 1, w, 2);
        }
      }
      if (ts - last > 200) {
        last = ts;
        force((n) => n + 1);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [deck, accent]);

  const load = async (getBuf: () => Promise<AudioBuffer>, info: Parameters<Deck["load"]>[1]) => {
    setPicker(false);
    setLoading(true);
    setErr(null);
    try {
      const buf = await getBuf();
      deck.load(buf, info);
      setPitch(0);
      if (info.bpm && !other.buffer) onBpm(info.bpm);
    } catch {
      setErr("Couldn't load that audio.");
    }
    setLoading(false);
  };

  const bpm = deck.info?.bpm ? deck.info.bpm * (1 + pitch) : null;
  const sync = () => {
    const target = other.info?.bpm ? other.info.bpm * other.rate : masterBpm;
    if (!deck.info?.bpm) return;
    setPitch(Math.max(-0.16, Math.min(0.16, target / deck.info.bpm - 1)));
  };

  return (
    <div className="relative rounded-[22px] border border-white/5 bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full" style={{ boxShadow: `0 0 0 2px ${accent}55` }}>
          {deck.info?.cover ? (
            <img src={deck.info.cover} alt="" className={cn("size-full object-cover", deck.playing && "animate-[spin_3s_linear_infinite]")} />
          ) : (
            <div className="grid size-full place-items-center bg-surface-2">
              <Music2 className="size-5 text-muted-foreground" />
            </div>
          )}
          <span className="absolute inset-0 m-auto size-3 rounded-full bg-[#0b0a0f]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>
            Deck {label}
          </p>
          <p className="truncate text-sm font-semibold">{deck.info?.title ?? "Empty — load a track"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {deck.info?.artist ?? "—"} {bpm ? `· ${bpm.toFixed(1)} bpm` : ""}
          </p>
        </div>
        <button onClick={() => setPicker(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/5 px-3 text-xs font-semibold hover:bg-white/10">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <FolderOpen className="size-3.5" />} Load
        </button>
      </div>

      <canvas
        ref={canvas}
        aria-label="Waveform — click to seek"
        className="mt-3 h-16 w-full cursor-pointer rounded-xl bg-black/30"
        onClick={(ev) => {
          if (!deck.duration) return;
          const r = ev.currentTarget.getBoundingClientRect();
          deck.seek(((ev.clientX - r.left) / r.width) * deck.duration);
        }}
      />
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{fmtTime(deck.position)}</span>
        <span>-{fmtTime(Math.max(0, deck.duration - deck.position))}</span>
      </div>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={!deck.buffer}
          onClick={() => {
            if (deck.playing) deck.pause();
            else deck.play();
            force((n) => n + 1);
          }}
          className="grid size-12 shrink-0 place-items-center rounded-full disabled:opacity-40"
          style={{ background: accent, color: "#0b0a0f" }}
          aria-label={deck.playing ? "Pause" : "Play"}
        >
          {deck.playing ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
        </button>
        <button disabled={!deck.buffer} onClick={() => deck.seek(deck.cues[0] ?? 0)} className="h-10 rounded-full bg-white/5 px-4 text-xs font-bold disabled:opacity-40">
          CUE
        </button>
        <div className="flex flex-1 gap-1.5">
          {deck.cues.map((c, i) => (
            <button
              key={i}
              disabled={!deck.buffer}
              onClick={(ev) => {
                if (ev.shiftKey) deck.cues[i] = null;
                else if (c == null) deck.cues[i] = deck.position;
                else deck.seek(c);
                force((n) => n + 1);
              }}
              title={c == null ? "Set hot cue" : "Jump (shift-click clears)"}
              className="h-10 flex-1 rounded-xl text-xs font-bold disabled:opacity-40"
              style={c == null ? { background: "rgba(255,255,255,0.05)", color: "#8b8798" } : { background: CUE_COLORS[i], color: "#0b0a0f" }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button disabled={!deck.info?.bpm} onClick={sync} className="inline-flex h-10 items-center gap-1 rounded-full bg-white/5 px-3 text-xs font-bold disabled:opacity-40" title="Match tempo to the other deck">
          <RefreshCw className="size-3.5" /> SYNC
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4">
        <div className="grid grid-cols-4 gap-y-2">
          {(["high", "mid", "low"] as const).map((band) => (
            <div key={band} className="flex flex-col items-center gap-1">
              <Knob label={band} value={eq[band]} min={-12} max={12} defaultValue={0} bipolar color={accent} size={46} onChange={(v) => setEq((q) => ({ ...q, [band]: v }))} format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}dB`} />
              <button
                onClick={() => setKill((k) => ({ ...k, [band]: !k[band] }))}
                className={cn("rounded-md px-2 py-0.5 text-[9px] font-bold uppercase", kill[band] ? "bg-red-500 text-white" : "bg-white/5 text-muted-foreground")}
              >
                Kill
              </button>
            </div>
          ))}
          <Knob label="Filter" value={filter} min={-1} max={1} bipolar color="#c6ff3d" size={46} onChange={setFilter} format={(v) => (Math.abs(v) < 0.02 ? "off" : v < 0 ? "LP" : "HP")} />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <input type="range" min={0} max={1} step={0.01} value={vol} onChange={(ev) => setVol(Number(ev.target.value))} className="eb-range" style={{ writingMode: "vertical-lr", direction: "rtl", height: 110, width: 18 }} aria-label={`Deck ${label} volume`} />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vol</span>
          </div>
          <div className="flex flex-col items-center">
            <input type="range" min={-0.16} max={0.16} step={0.001} value={pitch} onChange={(ev) => setPitch(Number(ev.target.value))} onDoubleClick={() => setPitch(0)} className="eb-range" style={{ writingMode: "vertical-lr", height: 110, width: 18 }} aria-label={`Deck ${label} tempo`} />
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{pitch >= 0 ? "+" : ""}{(pitch * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <Meter get={() => deck.level()} className="mt-2 h-6" />

      {picker && <TrackPicker onClose={() => setPicker(false)} onPick={load} />}
    </div>
  );
}

const CUE_COLORS = ["#ff3da5", "#c6ff3d", "#38bdf8", "#fbbf24"];

function TrackPicker({ onClose, onPick }: { onClose: () => void; onPick: (get: () => Promise<AudioBuffer>, info: { title: string; artist?: string; bpm?: number | null; cover?: string | null }) => void }) {
  const home = useQuery(homeQuery());
  const clips = useClips();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const tracks = useMemo(() => {
    const all = [...(home.data?.newUpdates ?? []), ...(home.data?.trending ?? [])];
    const seen = new Set<number>();
    return all.filter((t) => !seen.has(t.id) && seen.add(t.id) && (!q || `${t.title} ${t.artistName} ${t.genre}`.toLowerCase().includes(q.toLowerCase())));
  }, [home.data, q]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col rounded-[22px] border border-white/10 bg-[#121018]/98 p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tracks…" aria-label="Search tracks…" className="h-10 flex-1 rounded-full bg-surface-2 px-4 text-sm outline-none" />
        <button onClick={() => fileRef.current?.click()} className="h-10 rounded-full bg-white/5 px-4 text-xs font-semibold hover:bg-white/10">
          Local file
        </button>
        <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/5" aria-label="Close">
          <X className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file" aria-label="Choose file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(async () => getCtx().decodeAudioData(await f.arrayBuffer()), { title: f.name.replace(/\.[^.]+$/, ""), artist: "Local file" });
          }}
        />
      </div>
      <div className="no-scrollbar mt-3 flex-1 space-y-1 overflow-y-auto">
        {clips.map((c) => (
          <button key={c.url} onClick={() => onPick(async () => getCtx().decodeAudioData(await c.blob.arrayBuffer()), { title: c.name, artist: "Studio recording" })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
            <div className="grid size-10 place-items-center rounded-lg bg-grad">
              <Circle className="size-3 fill-current" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted-foreground">Studio recording</p>
            </div>
          </button>
        ))}
        {home.isLoading && <Loader2 className="mx-auto mt-6 size-5 animate-spin text-muted-foreground" />}
        {tracks.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(() => decodeUrl(getCtx(), t.audioUrl), { title: t.title, artist: t.artistName ?? undefined, bpm: t.bpm, cover: t.coverUrl })}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5"
          >
            <img src={t.coverUrl ?? "/images/cover-edm.jpg"} alt="" className="size-10 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t.artistName} · {t.genre}
              </p>
            </div>
            {t.bpm && <span className="text-xs tabular-nums text-muted-foreground">{t.bpm}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
