import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2, Check, X, Clock, Inbox, Send } from "lucide-react";
import { authClient } from "@/lib/auth";
import { orpc } from "@/lib/api";
import type { AppRouterClient } from "../../api";
import { likedQuery } from "@/queries/catalog";
import { myTracksQuery, deleteTrackMutation, inboxQuery, sentQuery, decideRequestMutation, meQuery } from "@/queries/me";
import { PageHeader, SignInPrompt } from "@/components/shell";
import { TrackRow } from "@/components/track-card";
import { ApprovalCard } from "@/components/approval";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "uploads", label: "My uploads" },
  { id: "liked", label: "Liked" },
  { id: "requests", label: "Requests" },
] as const;

export default function LibraryPage() {
  const { data: session, isPending } = authClient.useSession();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("uploads");
  if (isPending) return null;
  if (!session) return (<><PageHeader title="Library" /><SignInPrompt what="see your library" /></>);
  return (
    <div>
      <PageHeader title="Library" />
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === t.id ? "bg-grad" : "bg-surface-2 text-muted-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "uploads" && <Uploads />}
      {tab === "liked" && <Liked />}
      {tab === "requests" && <Requests />}
    </div>
  );
}

function Uploads() {
  const qc = useQueryClient();
  const { data } = useQuery(myTracksQuery());
  const me = useQuery(meQuery());
  const del = useMutation({ ...deleteTrackMutation(), onSuccess: () => qc.invalidateQueries() });
  return (
    <div className="space-y-5">
      {me.data && <ApprovalCard me={me.data} />}
      {data && !data.length && (
        <p className="text-muted-foreground">No uploads yet. <Link href="/upload" className="font-semibold text-pink">Upload your first track →</Link></p>
      )}
      <div className="space-y-1">
        {data?.map((t) => (
          <div key={t.id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1"><TrackRow track={t} queue={data} /></div>
            <button
              onClick={() => confirm(`Delete "${t.title}"?`) && del.mutate({ id: t.id })}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-white/5 hover:text-red-300"
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Liked() {
  const { data } = useQuery(likedQuery());
  if (data && !data.length) return <p className="text-muted-foreground">Tap the heart on any track to save it here.</p>;
  return <div className="space-y-1">{data?.map((t) => <TrackRow key={t.id} track={t} queue={data} />)}</div>;
}

function Requests() {
  const [side, setSide] = useState<"inbox" | "sent">("inbox");
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Content creators ask artists for permission to use AI songs in videos, streams, podcasts and more.</p>
      <div className="mb-5 inline-flex rounded-full bg-surface-2 p-1">
        <button onClick={() => setSide("inbox")} className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 text-sm", side === "inbox" && "bg-white text-black")}><Inbox className="size-4" /> To my tracks</button>
        <button onClick={() => setSide("sent")} className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 text-sm", side === "sent" && "bg-white text-black")}><Send className="size-4" /> I sent</button>
      </div>
      {side === "inbox" ? <InboxList /> : <SentList />}
    </div>
  );
}

function StatusPill({ s }: { s: "pending" | "approved" | "declined" }) {
  const m = { pending: ["bg-white/10", Clock], approved: ["bg-lime/15 text-lime", Check], declined: ["bg-red-400/15 text-red-300", X] } as const;
  const [cls, Icon] = m[s];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize", cls)}><Icon className="size-3" />{s}</span>;
}

function InboxList() {
  const { data } = useQuery(inboxQuery());
  if (data && !data.length) return <p className="text-muted-foreground">No requests yet.</p>;
  return <div className="space-y-3">{data?.map((r) => <InboxItem key={r.id} r={r} />)}</div>;
}

type Req = Awaited<ReturnType<AppRouterClient["requests"]["inbox"]>>[number];

function InboxItem({ r }: { r: Req }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [credit, setCredit] = useState(`Music: "${r.trackTitle}" by ${r.artistName} — via Earbass`);
  const decide = useMutation({ ...decideRequestMutation(), onSuccess: () => qc.invalidateQueries({ queryKey: orpc.requests.key() }) });
  return (
    <div className="rounded-[22px] bg-surface p-5">
      <div className="flex items-start gap-3">
        <img src={r.trackCover ?? "/images/cover-edm.jpg"} alt="" className="size-14 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{r.requesterName}</p>
            <StatusPill s={r.status} />
          </div>
          <p className="text-xs text-muted-foreground">wants to use <Link href={`/track/${r.trackId}`} className="text-white">{r.trackTitle}</Link> on <b className="text-white">{r.platform}</b></p>
          <p className="mt-2 text-sm">{r.purpose}</p>
          {r.message && <p className="mt-1 text-sm text-muted-foreground">"{r.message}"</p>}
        </div>
      </div>
      {r.status === "pending" ? (
        <div className="mt-4 space-y-2">
          <input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Required credit line" aria-label="Required credit line" className="w-full rounded-2xl bg-surface-2 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply (optional)" aria-label="Reply (optional)" className="w-full rounded-2xl bg-surface-2 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink" />
          <div className="flex gap-2">
            <button disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, status: "approved", reply, creditLine: credit })} className="flex items-center gap-1.5 rounded-full bg-lime px-5 py-2 text-sm font-semibold text-black"><Check className="size-4" /> Approve</button>
            <button disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, status: "declined", reply })} className="flex items-center gap-1.5 rounded-full bg-surface-2 px-5 py-2 text-sm font-semibold"><X className="size-4" /> Decline</button>
          </div>
        </div>
      ) : (
        (r.reply || r.creditLine) && <p className="mt-3 text-xs text-muted-foreground">{r.creditLine && <>Credit: {r.creditLine}. </>}{r.reply}</p>
      )}
    </div>
  );
}

function SentList() {
  const { data } = useQuery(sentQuery());
  if (data && !data.length) return <p className="text-muted-foreground">Find a track you love and hit "Request to use".</p>;
  return (
    <div className="space-y-3">
      {data?.map((r) => (
        <div key={r.id} className="flex items-start gap-3 rounded-[22px] bg-surface p-5">
          <img src={r.trackCover ?? "/images/cover-edm.jpg"} alt="" className="size-14 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/track/${r.trackId}`} className="font-semibold">{r.trackTitle}</Link>
              <StatusPill s={r.status} />
            </div>
            <p className="text-xs text-muted-foreground">{r.artistName} · {r.platform} · {r.purpose}</p>
            {r.creditLine && <p className="mt-2 rounded-xl bg-black/30 p-2.5 font-mono text-xs">{r.creditLine}</p>}
            {r.reply && <p className="mt-1 text-sm text-muted-foreground">"{r.reply}"</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
