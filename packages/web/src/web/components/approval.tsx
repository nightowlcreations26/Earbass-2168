import { CheckCircle2, Sparkles, Mic2, Award } from "lucide-react";
import { cn } from "@/lib/utils";

type Me = {
  profile: { approved: boolean };
  approval: { ai: number; original: number; rules: { ai: number; original: number } };
  points: { points: number; towardNext: number; nextAt: number; uploads: number; rank: number | null };
  isChampion: boolean;
};

export function ApprovalCard({ me }: { me: Me }) {
  const { ai, original, rules } = me.approval;
  if (me.profile.approved) {
    return (
      <div className="flex items-center gap-3 rounded-[22px] border border-lime/30 bg-lime/5 p-4 text-lime">
        <CheckCircle2 className="size-6 shrink-0" />
        <div>
          <p className="font-semibold">You're approved</p>
          <p className="text-xs text-lime/70">Your tracks are live on Earbass.</p>
        </div>
      </div>
    );
  }
  const Bar = ({ n, of, icon: Icon, label }: { n: number; of: number; icon: typeof Sparkles; label: string }) => (
    <div className="flex-1 rounded-2xl bg-surface-2 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-pink" /> {label}</span>
        <span className="font-display font-bold">{Math.min(n, of)}/{of}</span>
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: of }).map((_, i) => (
          <span key={i} className={cn("h-2 flex-1 rounded-full", i < n ? "bg-grad" : "bg-white/10")} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="rounded-[22px] border border-pink/30 bg-surface p-5">
      <p className="font-display text-lg font-bold">Get approved</p>
      <p className="mt-1 text-sm text-muted-foreground">Upload {rules.ai} AI songs <b>or</b> {rules.original} of your own. Until then your uploads are private.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Bar n={ai} of={rules.ai} icon={Sparkles} label="AI songs" />
        <div className="grid place-items-center text-xs font-bold text-dim">OR</div>
        <Bar n={original} of={rules.original} icon={Mic2} label="Your own music" />
      </div>
    </div>
  );
}

export function PointsCard({ me }: { me: Me }) {
  const { points, towardNext, uploads, rank } = me.points;
  return (
    <div className="rounded-[22px] bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-lg font-bold"><Award className="size-5 text-pink" /> {points} pts</p>
        {rank && <span className="rounded-full bg-surface-2 px-3 py-1 text-xs">Rank #{rank}</span>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {me.isChampion ? "You hold the Best AI DJ title." : "Every 7 uploads = +100 pts. Most points takes the Best AI DJ title."}
      </p>
      <div className="mt-4 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={cn("h-2.5 flex-1 rounded-full", i < towardNext ? "bg-grad" : "bg-white/10")} />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{towardNext}/7 to the next 100 pts · {uploads} uploads total</p>
    </div>
  );
}
