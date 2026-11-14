import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { UploadCloud, ImagePlus, Sparkles, Mic2, Loader2, PartyPopper, Award } from "lucide-react";
import { authClient } from "@/lib/auth";
import { meQuery, createTrackMutation } from "@/queries/me";
import { uploadFile, audioDuration, studioBus } from "@/lib/upload";
import { PageHeader, SignInPrompt } from "@/components/shell";
import { ApprovalCard, PointsCard } from "@/components/approval";
import { PLATFORMS, type Links } from "@/components/platforms";
import { cn } from "@/lib/utils";

const GENRES = [
  ["edm", "EDM"], ["techno", "Techno"], ["dnb", "DnB"], ["melodic", "Melodic"], ["mextech", "Mextech"],
  ["house", "House"], ["night-bass", "Night Bass"], ["bass-boosted", "Bass Boosted"], ["breakbeats", "Breakbeats"],
] as const;
const AI_TOOLS = ["Suno", "Udio", "ElevenLabs", "Stable Audio", "Earbass Studio", "Other"];
type GenreId = (typeof GENRES)[number][0];

export default function UploadPage() {
  const { data: session, isPending } = authClient.useSession();
  const me = useQuery(meQuery(!!session));
  const qc = useQueryClient();

  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<GenreId>("techno");
  const [origin, setOrigin] = useState<"ai" | "original">("ai");
  const [aiTool, setAiTool] = useState("Suno");
  const [bpm, setBpm] = useState("");
  const [description, setDescription] = useState("");
  const [links, setLinks] = useState<Links>({});
  const [showLinks, setShowLinks] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    ...createTrackMutation(),
    onSuccess: () => qc.invalidateQueries(),
  });

  useEffect(() => {
    const clip = studioBus.pendingUpload;
    if (clip) {
      studioBus.pendingUpload = null;
      const ext = clip.blob.type.includes("mp4") ? "m4a" : clip.blob.type.includes("ogg") ? "ogg" : clip.blob.type.includes("mpeg") ? "mp3" : "webm";
      setAudio(new File([clip.blob], `${clip.name}.${ext}`, { type: clip.blob.type }));
      setTitle(clip.name);
      setOrigin(clip.fromAI ? "ai" : "original");
      setAiTool("Earbass Studio");
    }
  }, []);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|flac|webm|aac)$/i.test(f.name)) {
      setErr("That doesn't look like an audio file.");
      return;
    }
    setErr(null);
    setAudio(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const submit = async () => {
    if (!audio || !title) return;
    setErr(null);
    try {
      setStage("Uploading audio…");
      const [audioUrl, durationSec] = await Promise.all([uploadFile(audio, audio.name, "audio"), audioDuration(audio)]);
      let coverUrl: string | undefined;
      if (cover) {
        setStage("Uploading cover…");
        coverUrl = await uploadFile(cover, cover.name, "cover");
      }
      setStage("Publishing…");
      await create.mutateAsync({
        title,
        genre,
        origin,
        aiTool: origin === "ai" ? aiTool : undefined,
        description,
        audioUrl,
        coverUrl,
        bpm: bpm ? Number(bpm) : undefined,
        durationSec,
        links: Object.fromEntries(Object.entries(links).filter(([, v]) => v)),
      });
      setStage(null);
      setAudio(null);
      setCover(null);
      setTitle("");
      setDescription("");
      setBpm("");
    } catch (e) {
      setStage(null);
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (isPending) return null;
  if (!session) return (<><PageHeader title="Upload" subtitle="Fast & simple song uploads" /><SignInPrompt what="upload your music" /></>);

  const res = create.data;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <PageHeader title="Upload a track" subtitle="Drop it, tag it, done." />

        {res && (
          <div className="mb-6 rounded-[22px] bg-grad p-5">
            <p className="flex items-center gap-2 font-display text-lg font-bold"><PartyPopper className="size-5" /> "{res.track.title}" uploaded</p>
            {res.approval.justApproved && <p className="mt-1 text-sm">You just got approved — your profile and all tracks are now live.</p>}
            {res.pointsEarned > 0 && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold"><Award className="size-4" /> +{res.pointsEarned} pts for {res.points.uploads} uploads. Great work!</p>}
            <Link href={`/track/${res.track.id}`} className="mt-3 inline-block rounded-full bg-black/80 px-4 py-2 text-sm font-semibold">View track</Link>
          </div>
        )}

        <input ref={fileRef} type="file" aria-label="Choose file" accept="audio/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <button
          type="button"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          className={cn("block w-full cursor-pointer rounded-[26px] border-2 border-dashed p-8 text-center transition", drag ? "border-pink bg-pink/10" : "border-white/15 bg-surface hover:border-pink/50")}
        >
          <UploadCloud className="mx-auto size-10 text-pink" />
          {audio ? (
            <p className="mt-3 font-semibold">{audio.name} <span className="text-muted-foreground">· {(audio.size / 1e6).toFixed(1)} MB</span></p>
          ) : (
            <>
              <p className="mt-3 font-display text-lg font-bold">Drop your track here</p>
              <p className="text-sm text-muted-foreground">MP3, WAV, M4A, FLAC · tap to browse</p>
            </>
          )}
        </button>

        <div className="mt-6 grid gap-5 sm:grid-cols-[120px_1fr]">
          <button onClick={() => coverRef.current?.click()} className="relative grid aspect-square place-items-center overflow-hidden rounded-[20px] bg-surface-2 text-muted-foreground hover:text-white">
            <input ref={coverRef} type="file" aria-label="Choose file" accept="image/*" hidden onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            {cover ? <img src={URL.createObjectURL(cover)} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="text-center text-xs"><ImagePlus className="mx-auto mb-1 size-6" />Cover</span>}
          </button>
          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" aria-label="Track title" className="w-full rounded-2xl bg-surface-2 px-4 py-3.5 font-semibold outline-none focus:ring-2 focus:ring-pink" />
            <div className="flex gap-2">
              <button onClick={() => setOrigin("ai")} className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold", origin === "ai" ? "bg-grad" : "bg-surface-2 text-muted-foreground")}>
                <Sparkles className="size-4" /> AI-made
              </button>
              <button onClick={() => setOrigin("original")} className={cn("flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold", origin === "original" ? "bg-grad" : "bg-surface-2 text-muted-foreground")}>
                <Mic2 className="size-4" /> My own music
              </button>
            </div>
          </div>
        </div>

        {origin === "ai" && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Made with</p>
            <div className="flex flex-wrap gap-2">
              {AI_TOOLS.map((t) => (
                <button key={t} onClick={() => setAiTool(t)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium", aiTool === t ? "bg-white text-black" : "bg-surface-2")}>{t}</button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Genre</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(([id, label]) => (
              <button key={id} onClick={() => setGenre(id)} className={cn("rounded-full px-4 py-2 text-sm font-medium", genre === id ? "bg-grad" : "bg-surface-2")}>{label}</button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[140px_1fr]">
          <input value={bpm} onChange={(e) => setBpm(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="BPM" aria-label="BPM" inputMode="numeric" className="rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" aria-label="Short description (optional)" className="rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
        </div>

        <button onClick={() => setShowLinks(!showLinks)} className="mt-5 text-sm font-semibold text-pink">{showLinks ? "− Hide" : "+ Add"} links to this track on other platforms</button>
        {showLinks && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((p) => (
              <input key={p.key} value={links[p.key] ?? ""} onChange={(e) => setLinks({ ...links, [p.key]: e.target.value })} placeholder={`${p.label} link`} aria-label={`${p.label} link`} className="rounded-2xl bg-surface-2 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink" />
            ))}
          </div>
        )}

        {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
        <button disabled={!audio || !title || !!stage} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-grad py-4 font-semibold glow disabled:opacity-50 sm:w-auto sm:px-12">
          {stage ? <><Loader2 className="size-4 animate-spin" /> {stage}</> : "Publish track"}
        </button>
      </div>

      <aside className="space-y-4 lg:pt-16">
        {me.data && <ApprovalCard me={me.data} />}
        {me.data && <PointsCard me={me.data} />}
        <div className="rounded-[22px] bg-surface p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-white">Make something first?</p>
          <p className="mt-1">Build a beat in the Studio, record it, and send it straight here.</p>
          <Link href="/studio" className="mt-3 inline-block font-semibold text-pink">Open Studio →</Link>
        </div>
      </aside>
    </div>
  );
}

