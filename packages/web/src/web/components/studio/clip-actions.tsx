import { useSyncExternalStore } from "react";
import { useLocation } from "wouter";
import { Download, UploadCloud, Disc3, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";
import { studioBus } from "@/lib/upload";

export function useClips() {
  return useSyncExternalStore(studioBus.subscribe, studioBus.list, studioBus.list);
}

type Clip = ReturnType<typeof studioBus.list>[number];

function ext(blob: Blob) {
  return blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("mpeg") ? "mp3" : "webm";
}

export function ClipCard({ clip, onSendToMix }: { clip: Clip; onSendToMix?: () => void }) {
  const [, nav] = useLocation();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio(clip.url);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      void audio.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-surface-2 p-3">
      <button onClick={toggle} className="grid size-10 shrink-0 place-items-center rounded-full bg-grad" aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{clip.name}</p>
        <p className="text-[11px] text-muted-foreground">{clip.fromAI ? "AI-assisted" : "Original"} · recorded in Studio</p>
      </div>
      <div className="flex gap-2">
        {onSendToMix && (
          <button onClick={onSendToMix} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
            <Disc3 className="size-3.5" /> Mix Pad
          </button>
        )}
        <button
          onClick={() => {
            studioBus.pendingUpload = clip;
            nav("/upload");
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
        >
          <UploadCloud className="size-3.5" /> Upload
        </button>
        <a href={clip.url} download={`${clip.name}.${ext(clip.blob)}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
          <Download className="size-3.5" /> Save
        </a>
      </div>
    </div>
  );
}
