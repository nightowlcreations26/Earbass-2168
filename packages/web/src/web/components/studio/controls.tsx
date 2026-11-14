import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { FxState } from "@/lib/audio/engine";

/** Drag-up/down knob. Double-click resets. */
export function Knob({
  value,
  onChange,
  min = 0,
  max = 1,
  label,
  bipolar,
  size = 52,
  defaultValue,
  color = "#ff3da5",
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  bipolar?: boolean;
  size?: number;
  defaultValue?: number;
  color?: string;
  format?: (v: number) => string;
}) {
  const start = useRef<{ y: number; v: number } | null>(null);
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;
  const r = size / 2 - 4;
  const c = size / 2;
  const arc = (from: number, to: number) => {
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return [c + r * Math.cos(rad), c + r * Math.sin(rad)];
    };
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    const large = Math.abs(to - from) > 180 ? 1 : 0;
    const sweep = to > from ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
  };
  const zero = bipolar ? 0 : -135;

  return (
    <div className="flex select-none flex-col items-center gap-1">
      <button
        type="button"
        aria-label={`${label}: ${format ? format(value) : value.toFixed(2)}`}
        style={{ width: size, height: size, touchAction: "none" }}
        className="relative cursor-ns-resize"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start.current = { y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const dy = start.current.y - e.clientY;
          const nv = Math.min(max, Math.max(min, start.current.v + (dy / 150) * (max - min)));
          onChange(nv);
        }}
        onPointerUp={() => (start.current = null)}
        onDoubleClick={() => onChange(defaultValue ?? (bipolar ? (min + max) / 2 : min))}
        onKeyDown={(e) => {
          const stepv = (max - min) / 20;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(Math.min(max, value + stepv));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(Math.max(min, value - stepv));
        }}
      >
        <svg width={size} height={size} className="absolute inset-0">
          <path d={arc(-135, 135)} stroke="#2d2a37" strokeWidth={4} fill="none" strokeLinecap="round" />
          {Math.abs(angle - zero) > 0.5 && (
            <path d={arc(Math.min(zero, angle), Math.max(zero, angle))} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          )}
        </svg>
        <span className="absolute inset-[9px] rounded-full bg-gradient-to-b from-[#2a2733] to-[#16141c] shadow-inner">
          <span className="absolute left-1/2 top-1 h-[35%] w-[3px] -translate-x-1/2 origin-bottom rounded bg-white" style={{ transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: "50% 100%", top: 3 }} />
        </span>
      </button>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {format && <span className="-mt-1 text-[10px] tabular-nums text-dim">{format(value)}</span>}
    </div>
  );
}

export function Fader({ value, onChange, label, vertical = true, className }: { value: number; onChange: (v: number) => void; label?: string; vertical?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("eb-range", vertical && "h-28 w-28 -rotate-90")}
        style={vertical ? { width: 112 } : undefined}
        aria-label={label}
      />
      {label && <span className={cn("text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", vertical && "mt-[-2px]")}>{label}</span>}
    </div>
  );
}

const FX_DEFS: { key: keyof FxState; label: string; bipolar?: boolean; color: string }[] = [
  { key: "filter", label: "Filter", bipolar: true, color: "#c6ff3d" },
  { key: "bass", label: "Bass Boost", color: "#ff3da5" },
  { key: "drive", label: "Drive", color: "#ff7ac6" },
  { key: "crush", label: "Bitcrush", color: "#f0abfc" },
  { key: "flanger", label: "Flanger", color: "#e879f9" },
  { key: "delay", label: "Delay", color: "#c026d3" },
  { key: "reverb", label: "Reverb", color: "#ffb3da" },
];

export function FxPanel({ fx, onChange, title = "FX rack" }: { fx: FxState; onChange: (f: FxState) => void; title?: string }) {
  return (
    <div className="rounded-[22px] border border-white/5 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-sm font-bold">{title}</p>
        <button onClick={() => onChange({ filter: 0, bass: 0, drive: 0, crush: 0, flanger: 0, delay: 0, reverb: 0 })} className="text-[11px] text-muted-foreground hover:text-white">
          Reset
        </button>
      </div>
      <div className="grid grid-cols-4 gap-y-3 sm:grid-cols-7">
        {FX_DEFS.map((d) => (
          <Knob
            key={d.key}
            label={d.label}
            value={fx[d.key]}
            min={d.bipolar ? -1 : 0}
            max={1}
            bipolar={d.bipolar}
            color={d.color}
            onChange={(v) => onChange({ ...fx, [d.key]: v })}
            format={d.bipolar ? (v) => (Math.abs(v) < 0.02 ? "off" : v < 0 ? "LP" : "HP") : (v) => `${Math.round(v * 100)}`}
          />
        ))}
      </div>
    </div>
  );
}

/** Spectrum meter from an analyser-backed getter. */
export function Meter({ get, className }: { get: () => Uint8Array | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cv = ref.current;
      const d = get();
      if (cv && d) {
        const g = cv.getContext("2d")!;
        const w = (cv.width = cv.clientWidth * 2);
        const h = (cv.height = cv.clientHeight * 2);
        g.clearRect(0, 0, w, h);
        const bars = 32;
        const bw = w / bars;
        const grad = g.createLinearGradient(0, h, 0, 0);
        grad.addColorStop(0, "#c026d3");
        grad.addColorStop(0.6, "#ff3da5");
        grad.addColorStop(1, "#c6ff3d");
        g.fillStyle = grad;
        for (let i = 0; i < bars; i++) {
          const v = d[Math.floor((i / bars) * d.length * 0.8)] / 255;
          const bh = Math.max(2, v * h);
          g.fillRect(i * bw + 2, h - bh, bw - 4, bh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [get]);
  return <canvas ref={ref} aria-label="Level meter" className={cn("h-12 w-full", className)} />;
}
