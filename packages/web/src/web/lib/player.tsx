import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Track } from "./api";
import { client } from "./api";

type PlayerState = {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  time: number;
  duration: number;
  expanded: boolean;
  play: (t: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setExpanded: (v: boolean) => void;
  stop: () => void;
};

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audio.current = a;
    const onTime = () => setTime(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
    };
  }, []);

  const load = useCallback((t: Track) => {
    const a = audio.current;
    if (!a) return;
    a.src = t.audioUrl;
    setCurrent(t);
    setTime(0);
    void a.play().catch(() => setPlaying(false));
    void client.catalog.play({ id: t.id }).catch(() => {});
  }, []);

  const play = useCallback(
    (t: Track, q?: Track[]) => {
      if (q) setQueue(q);
      if (current?.id === t.id) {
        void audio.current?.play();
        return;
      }
      load(t);
    },
    [current, load],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!current || !queue.length) return;
      const i = queue.findIndex((q) => q.id === current.id);
      const n = queue[(i + dir + queue.length) % queue.length];
      if (n) load(n);
    },
    [current, queue, load],
  );

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onEnd = () => step(1);
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [step]);

  const value: PlayerState = {
    current,
    queue,
    playing,
    time,
    duration,
    expanded,
    play,
    toggle: () => {
      const a = audio.current;
      if (!a || !current) return;
      if (a.paused) void a.play();
      else a.pause();
    },
    next: () => step(1),
    prev: () => step(-1),
    seek: (t) => {
      if (audio.current) audio.current.currentTime = t;
    },
    setExpanded,
    stop: () => audio.current?.pause(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer outside PlayerProvider");
  return v;
}

export const fmtTime = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

export const fmtCount = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`);
