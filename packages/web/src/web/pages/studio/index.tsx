import { lazy, Suspense } from "react";
import { useLocation, useSearch } from "wouter";
import { Grid3x3, Disc3, Wand2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { cn } from "@/lib/utils";

const BeatPad = lazy(() => import("./beat-pad"));
const MixPad = lazy(() => import("./mix-pad"));
const AiSong = lazy(() => import("./ai-song"));

const TABS = [
  { id: "beat", label: "Beat Pad", icon: Grid3x3 },
  { id: "mix", label: "Mix Pad", icon: Disc3 },
  { id: "song", label: "AI Song", icon: Wand2 },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function StudioPage() {
  const search = useSearch();
  const [, nav] = useLocation();
  const tab = (new URLSearchParams(search).get("tab") as Tab) || "beat";
  const go = (t: Tab) => nav(`/studio?tab=${t}`);

  return (
    <div>
      <PageHeader title={<>Earbass <span className="text-grad">Studio</span></>} subtitle="Program beats with AI, mix like a DJ, or generate a whole song." />
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={cn("inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition", tab === t.id ? "bg-grad glow" : "bg-surface text-muted-foreground hover:text-white")}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<Loader2 className="mx-auto mt-16 size-6 animate-spin text-muted-foreground" />}>
        {tab === "beat" && <BeatPad onSendToMix={() => go("mix")} />}
        {tab === "mix" && <MixPad />}
        {tab === "song" && <AiSong />}
      </Suspense>
    </div>
  );
}
