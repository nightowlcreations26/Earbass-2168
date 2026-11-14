import { useState } from "react";
import { Share2, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const PLATFORMS = [
  { key: "spotify", label: "Spotify", color: "#1ed760", placeholder: "https://open.spotify.com/artist/…" },
  { key: "soundcloud", label: "SoundCloud", color: "#ff7700", placeholder: "https://soundcloud.com/…" },
  { key: "appleMusic", label: "Apple Music", color: "#fa2d48", placeholder: "https://music.apple.com/…" },
  { key: "youtube", label: "YouTube", color: "#ff0000", placeholder: "https://youtube.com/@…" },
  { key: "suno", label: "Suno", color: "#f5f5f5", placeholder: "https://suno.com/@…" },
  { key: "udio", label: "Udio", color: "#ffd84d", placeholder: "https://udio.com/creators/…" },
  { key: "bandcamp", label: "Bandcamp", color: "#1da0c3", placeholder: "https://….bandcamp.com" },
] as const;

export type Links = Partial<Record<(typeof PLATFORMS)[number]["key"], string>>;

export function ListenOn({ links, className }: { links: Links; className?: string }) {
  const active = PLATFORMS.filter((p) => links[p.key]);
  if (!active.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {active.map((p) => (
        <a
          key={p.key}
          href={links[p.key]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-xs font-medium hover:bg-white/10 transition"
        >
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.label}
          <ExternalLink className="size-3 opacity-50" />
        </a>
      ))}
    </div>
  );
}

export function ShareButton({ title, path, className }: { title: string; path: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button onClick={share} className={cn("inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-sm font-medium hover:bg-white/10", className)}>
      {copied ? <Check className="size-4 text-lime" /> : <Share2 className="size-4" />}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

export function ShareTargets({ title, path }: { title: string; path: string }) {
  const url = encodeURIComponent(`${window.location.origin}${path}`);
  const text = encodeURIComponent(`${title} on Earbass`);
  const targets = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${url}` },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${url}&title=${text}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${url}&text=${text}` },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {targets.map((t) => (
        <a key={t.label} href={t.href} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-white hover:border-white/30">
          {t.label}
        </a>
      ))}
    </div>
  );
}
