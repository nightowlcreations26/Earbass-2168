import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { client, type TrackItem } from "./api";

type PlayerCtx = {
  current: TrackItem | null;
  queue: TrackItem[];
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  play: (track: TrackItem, queue?: TrackItem[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  stop: () => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<TrackItem | null>(null);
  const [queue, setQueue] = useState<TrackItem[]>([]);
  const counted = useRef<number | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  const load = useCallback(
    (t: TrackItem) => {
      setCurrent(t);
      player.replace({ uri: t.audioUrl });
      player.play();
      if (counted.current !== t.id) {
        counted.current = t.id;
        client.catalog.play({ id: t.id }).catch(() => {});
      }
    },
    [player],
  );

  const play = useCallback(
    (t: TrackItem, q?: TrackItem[]) => {
      if (q) setQueue(q);
      if (current?.id === t.id) {
        if (status.playing) player.pause();
        else player.play();
        return;
      }
      load(t);
    },
    [current?.id, status.playing, player, load],
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
    if (status.didJustFinish) step(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  const value = useMemo<PlayerCtx>(
    () => ({
      current,
      queue,
      playing: status.playing,
      buffering: status.isBuffering && !status.playing,
      position: status.currentTime ?? 0,
      duration: status.duration || current?.durationSec || 0,
      play,
      toggle: () => (status.playing ? player.pause() : player.play()),
      next: () => step(1),
      prev: () => step(-1),
      seek: (s) => {
        void player.seekTo(s);
      },
      stop: () => {
        player.pause();
        setCurrent(null);
      },
    }),
    [current, queue, status.playing, status.isBuffering, status.currentTime, status.duration, play, player, step],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside PlayerProvider");
  return c;
}

export function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function fmtCount(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}
