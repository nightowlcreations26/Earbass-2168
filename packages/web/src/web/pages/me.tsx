import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Camera, LogOut, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth";
import { meQuery, updateProfileMutation } from "@/queries/me";
import { uploadFile } from "@/lib/upload";
import { PageHeader, SignInPrompt } from "@/components/shell";
import { ApprovalCard, PointsCard } from "@/components/approval";
import { ChampionTag, ProBadge } from "@/components/track-card";
import { PLATFORMS, type Links } from "@/components/platforms";
import { DonationGoalCard } from "@/components/donation-bar";

export default function MePage() {
  const { data: session, isPending } = authClient.useSession();
  const me = useQuery(meQuery(!!session));
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const [artistName, setArtistName] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<Links>({});
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const save = useMutation({ ...updateProfileMutation(), onSuccess: () => qc.invalidateQueries() });

  useEffect(() => {
    if (me.data) {
      setArtistName(me.data.profile.artistName);
      setBio(me.data.profile.bio);
      setLinks(me.data.profile.links);
      setAvatar(me.data.profile.avatarUrl);
    }
  }, [me.data]);

  if (isPending) return null;
  if (!session) return (<><PageHeader title="Profile" /><SignInPrompt what="set up your artist profile" /></>);
  if (!me.data) return <div className="h-60 animate-pulse rounded-[26px] bg-surface" />;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <PageHeader
          title="Artist profile"
          subtitle={me.data.user.email}
          right={
            <button onClick={async () => { await authClient.signOut(); qc.clear(); nav("/"); }} className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm">
              <LogOut className="size-4" /> Sign out
            </button>
          }
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {me.data.isChampion && <ChampionTag />}
          <ProBadge plan={me.data.profile.plan} />
          <Link href="/credits" className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold hover:bg-white/10">
            {me.data.profile.plan === "free" ? "Credits & membership →" : "Manage membership →"}
          </Link>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={() => avatarRef.current?.click()} className="relative size-24 shrink-0 overflow-hidden rounded-full bg-grad">
            {avatar && <img src={avatar} alt="" className="size-full object-cover" />}
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 hover:opacity-100">
              {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
            </span>
            <input
              ref={avatarRef}
              type="file" aria-label="Choose file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try {
                  setAvatar(await uploadFile(f, f.name, "avatar"));
                } finally {
                  setUploading(false);
                }
              }}
            />
          </button>
          <div className="flex-1 space-y-2">
            <input value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist name" aria-label="Artist name" className="w-full rounded-2xl bg-surface-2 px-4 py-3 font-display text-lg font-bold outline-none focus:ring-2 focus:ring-pink" />
            <Link href={`/artist/${me.data.user.id}`} className="text-xs text-pink">View public page →</Link>
          </div>
        </div>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Bio — your sound in one line" aria-label="Bio — your sound in one line" className="mt-4 w-full resize-none rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />

        <h2 className="mb-1 mt-8 font-display text-lg font-bold">Connect your platforms</h2>
        <p className="mb-4 text-sm text-muted-foreground">These show as "Listen on" buttons on your profile and every track.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORMS.map((p) => (
            <label key={p.key} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 focus-within:ring-2 focus-within:ring-pink">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="w-24 shrink-0 text-sm font-medium">{p.label}</span>
              <input value={links[p.key] ?? ""} onChange={(e) => setLinks({ ...links, [p.key]: e.target.value })} placeholder={p.placeholder} aria-label={p.placeholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-dim" />
            </label>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3">
          <button
            disabled={save.isPending}
            onClick={() => save.mutate({ artistName, bio, avatarUrl: avatar, links: Object.fromEntries(Object.entries(links).filter(([, v]) => v)) })}
            className="rounded-full bg-grad px-8 py-3.5 text-sm font-semibold glow disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
          {save.isSuccess && <span className="text-sm text-lime">Saved</span>}
          {save.error && <span className="text-sm text-red-300">{save.error.message}</span>}
        </div>
      </div>
      <aside className="space-y-4 lg:pt-16">
        <ApprovalCard me={me.data} />
        <PointsCard me={me.data} />
        <DonationGoalCard key={me.data.profile.userId} goal={me.data.profile.donationGoal} pitch={me.data.profile.donationPitch} />
      </aside>
    </div>
  );
}
