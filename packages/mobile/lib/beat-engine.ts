import { createAudioPlayer, type AudioPlayer } from "expo-audio";

export const VOICES = ["kick", "snare", "clap", "hat", "openhat", "perc", "bass", "stab"] as const;
export type VoiceId = (typeof VOICES)[number];

export const VOICE_META: Record<VoiceId, { label: string; color: string }> = {
  kick: { label: "Kick", color: "#FF3DA5" },
  snare: { label: "Snare", color: "#FF5FB5" },
  clap: { label: "Clap", color: "#FF8AC6" },
  hat: { label: "Hat", color: "#C6FF3D" },
  openhat: { label: "Open Hat", color: "#A8E62E" },
  perc: { label: "Perc", color: "#FBBF24" },
  bass: { label: "Bass", color: "#C026D3" },
  stab: { label: "Stab", color: "#8B5CF6" },
};

const SOURCES: Record<VoiceId, number> = {
  kick: require("@/assets/samples/kick.wav"),
  snare: require("@/assets/samples/snare.wav"),
  clap: require("@/assets/samples/clap.wav"),
  hat: require("@/assets/samples/hat.wav"),
  openhat: require("@/assets/samples/openhat.wav"),
  perc: require("@/assets/samples/perc.wav"),
  bass: require("@/assets/samples/bass.wav"),
  stab: require("@/assets/samples/stab.wav"),
};

export type Track = { id: VoiceId; steps: boolean[]; volume: number; muted: boolean; note: number[] };
export type Pattern = { bpm: number; swing: number; tracks: Track[] };

const POOL = 3;

/** Small round-robin sample player pool built on expo-audio (works on iOS, Android and web). */
export class BeatEngine {
  private pools = new Map<VoiceId, AudioPlayer[]>();
  private cursor = new Map<VoiceId, number>();
  master = 0.9;

  constructor() {
    for (const v of VOICES) {
      const arr: AudioPlayer[] = [];
      for (let i = 0; i < POOL; i++) {
        const p = createAudioPlayer(SOURCES[v]);
        try {
          p.shouldCorrectPitch = false;
        } catch {
          /* not supported */
        }
        arr.push(p);
      }
      this.pools.set(v, arr);
      this.cursor.set(v, 0);
    }
  }

  trigger(v: VoiceId, volume = 0.85, semis = 0) {
    const pool = this.pools.get(v);
    if (!pool) return;
    const i = this.cursor.get(v) ?? 0;
    this.cursor.set(v, (i + 1) % pool.length);
    const p = pool[i];
    try {
      p.volume = Math.max(0, Math.min(1, volume * this.master));
      if (v === "bass" || v === "stab") p.setPlaybackRate(Math.pow(2, semis / 12));
      void p.seekTo(0);
      p.play();
    } catch {
      /* player not ready */
    }
  }

  release() {
    for (const pool of this.pools.values()) for (const p of pool) p.remove();
    this.pools.clear();
  }
}

const s = (row: string) => row.split("").map((ch) => ch === "x");
const blankRow = () => Array(16).fill(false) as boolean[];

export function blank(): Pattern {
  return { bpm: 128, swing: 0, tracks: VOICES.map((id) => ({ id, steps: blankRow(), volume: 0.8, muted: false, note: Array(16).fill(0) })) };
}

type PresetDef = { name: string; bpm: number; swing: number; rows: Partial<Record<VoiceId, string>>; bassNotes?: number[]; stabNotes?: number[] };

export const PRESETS: PresetDef[] = [
  { name: "Techno", bpm: 132, swing: 0, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "..x...x...x...x.", openhat: "..x...x...x...x.", perc: "...x.....x....x.", bass: ".xx..xx..xx..xx." }, bassNotes: [0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0] },
  { name: "House", bpm: 124, swing: 0.12, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", openhat: "..x...x...x...x.", bass: "..x...x...x..x.x", stab: "...x.....x......" }, bassNotes: [0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 3, 0, 0, 7, 0, 5] },
  { name: "EDM", bpm: 128, swing: 0, rows: { kick: "x...x...x...x...", snare: "....x.......x...", clap: "....x.......x...", hat: "..x...x...x...x.", bass: ".x.x.x.x.x.x.x.x", stab: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 3, 3, 3, 3], stabNotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 3, 0, 0] },
  { name: "DnB", bpm: 174, swing: 0, rows: { kick: "x.........x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.x.", perc: ".......x......x.", bass: "x.....x...x....." }, bassNotes: [0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 5, 0, 0, 0, 0, 0] },
  { name: "Melodic", bpm: 122, swing: 0, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "..x...x...x...x.", bass: "x.xx..x.x.xx..x.", stab: "x.....x.....x..." }, bassNotes: [0, 0, 0, 3, 0, 0, 5, 0, 7, 0, 7, 5, 0, 0, 3, 0], stabNotes: [0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, -4, 0, 0, 0] },
  { name: "Mextech", bpm: 126, swing: 0.18, rows: { kick: "x...x...x...x...", clap: "....x.......x...", hat: "xx.xxx.xxx.xxx.x", perc: "..x..x.x..x..xx.", bass: "...x..x....x..x." }, bassNotes: [0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 5, 0, 0, 7, 0] },
  { name: "Night Bass", bpm: 130, swing: 0.28, rows: { kick: "x.....x...x.....", snare: "....x.......x...", hat: "..x...x.x.x...xx", perc: "......x.......x.", bass: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 3, 0, 0, -5, 0, 0] },
  { name: "Bass Boosted", bpm: 150, swing: 0, rows: { kick: "x..x..x...x..x..", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "x..x..x...x..x.." }, bassNotes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -2, 0, 0, -5, 0, 0] },
  { name: "Breakbeats", bpm: 136, swing: 0.1, rows: { kick: "x.x.......x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.", openhat: ".......x........", perc: "...x......x.....", bass: "x.x.......x..x.." }, bassNotes: [0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 3, 0, 0] },
];

export function fromPreset(p: PresetDef): Pattern {
  const base = blank();
  base.bpm = p.bpm;
  base.swing = p.swing;
  base.tracks = base.tracks.map((t) => ({
    ...t,
    steps: p.rows[t.id] ? s(p.rows[t.id]!) : t.steps,
    note: t.id === "bass" && p.bassNotes ? p.bassNotes : t.id === "stab" && p.stabNotes ? p.stabNotes : t.note,
  }));
  return base;
}

export function randomize(p: Pattern): Pattern {
  const dens: Record<VoiceId, number> = { kick: 0.3, snare: 0.12, clap: 0.12, hat: 0.55, openhat: 0.15, perc: 0.2, bass: 0.35, stab: 0.15 };
  return {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      steps: t.steps.map((_, i) => (t.id === "kick" && i % 4 === 0 ? true : Math.random() < dens[t.id])),
      note: t.note.map(() => [0, 0, 3, 5, 7, -2, 12][Math.floor(Math.random() * 7)]),
    })),
  };
}
