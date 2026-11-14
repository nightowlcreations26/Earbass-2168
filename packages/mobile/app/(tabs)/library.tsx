import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { signOut } from "@/lib/auth";
import { useLiked, useMe, useMyTracks } from "@/queries/me";
import { useDecideRequest, useInbox, useSent } from "@/queries/requests";
import { DonationGoalCard } from "@/components/donation";
import { Card, Chip, Cover, Empty, GhostButton, GradientButton, Loading, ProgressBar, T, TrackRow, inputStyle } from "@/components/ui";

type Tab = "uploads" | "liked" | "inbox" | "sent";

export default function LibraryScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { signedIn, me, session } = useMe();
  const [tab, setTab] = useState<Tab>("uploads");
  const mine = useMyTracks(signedIn && tab === "uploads");
  const liked = useLiked(signedIn && tab === "liked");
  const inbox = useInbox(signedIn);
  const sent = useSent(signedIn && tab === "sent");

  if (session.isPending) return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}><Loading /></SafeAreaView>;

  if (!signedIn)
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>
        <Empty icon="person-circle" title="Your Earbass library" body="Sign in to track uploads, points, likes and usage requests from other creators.">
          <GradientButton label="Sign in" icon="log-in" onPress={() => router.push("/sign-in")} style={{ marginTop: 8 }} />
        </Empty>
      </SafeAreaView>
    );

  const m = me.data;
  const pending = (inbox.data ?? []).filter((r) => r.status === "pending").length;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <View style={{ padding: 20, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Cover uri={m?.profile.avatarUrl} size={64} radius={32} />
              <View style={{ flex: 1 }}>
                <T variant="h1" numberOfLines={1}>
                  {m?.profile.artistName ?? session.data?.user.name}
                </T>
                <T variant="small" numberOfLines={1}>
                  {session.data?.user.email}
                </T>
              </View>
              <Pressable
                onPress={async () => {
                  await signOut();
                  qc.clear();
                }}
                accessibilityLabel="Sign out"
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="log-out-outline" size={18} color={c.foreground} />
              </Pressable>
            </View>

            {m ? (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Stat label="Points" value={String(m.points.points)} accent={c.primary} />
                <Stat label="Uploads" value={String(m.approval.total)} />
                <Stat label="Rank" value={m.points.rank ? `#${m.points.rank}` : "—"} accent={m.isChampion ? c.lime : undefined} />
              </View>
            ) : null}

            {m ? (
              <Card style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name={m.isChampion ? "trophy" : m.profile.approved ? "checkmark-circle" : "time"} size={18} color={m.isChampion ? c.lime : m.profile.approved ? c.lime : c.warning} />
                  <T style={{ fontFamily: Fonts.semibold }}>{m.isChampion ? "You are the Best AI DJ" : m.profile.approved ? "Approved artist" : "Approval pending"}</T>
                </View>
                <T variant="small">
                  {m.points.towardNext}/7 uploads toward your next +100 points
                </T>
                <ProgressBar value={m.points.towardNext / 7} />
                <GhostButton label="View public profile" icon="person" onPress={() => router.push(`/artist/${m.user.id}`)} />
              </Card>
            ) : null}
            {m ? <DonationGoalCard goal={m.profile.donationGoal} pitch={m.profile.donationPitch} /> : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <Chip label="My uploads" active={tab === "uploads"} onPress={() => setTab("uploads")} />
            <Chip label="Liked" active={tab === "liked"} onPress={() => setTab("liked")} />
            <Chip label={pending ? `Requests (${pending})` : "Requests"} active={tab === "inbox"} onPress={() => setTab("inbox")} />
            <Chip label="Sent" active={tab === "sent"} onPress={() => setTab("sent")} />
          </ScrollView>

          <View style={{ marginTop: 12 }}>
            {tab === "uploads" ? (
              mine.isLoading ? <Loading /> : mine.data?.length ? mine.data.map((t) => <TrackRow key={t.id} track={t} queue={mine.data!} />) : <Empty icon="cloud-upload" title="No uploads yet" body="Tap the pink + to drop your first track." />
            ) : tab === "liked" ? (
              liked.isLoading ? <Loading /> : liked.data?.length ? liked.data.map((t) => <TrackRow key={t.id} track={t} queue={liked.data!} />) : <Empty icon="heart" title="Nothing liked yet" />
            ) : tab === "inbox" ? (
              inbox.isLoading ? <Loading /> : inbox.data?.length ? <View style={{ paddingHorizontal: 20, gap: 12 }}>{inbox.data.map((r) => <InboxItem key={r.id} r={r} defaultCredit={`Music: “${r.trackTitle}” by ${r.artistName} on Earbass`} />)}</View> : <Empty icon="mail-open" title="No requests yet" body="When creators ask to use your AI songs, they'll land here." />
            ) : sent.isLoading ? (
              <Loading />
            ) : sent.data?.length ? (
              <View style={{ paddingHorizontal: 20, gap: 12 }}>
                {sent.data.map((r) => (
                  <Card key={r.id} style={{ gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Cover uri={r.trackCover} size={40} radius={10} />
                      <View style={{ flex: 1 }}>
                        <T style={{ fontFamily: Fonts.semibold }} numberOfLines={1}>{r.trackTitle}</T>
                        <T variant="small">{r.artistName} · {r.platform}</T>
                      </View>
                      <StatusPill status={r.status} />
                    </View>
                    {r.creditLine ? <T variant="small" style={{ color: c.lime }}>Credit: {r.creditLine}</T> : null}
                    {r.reply ? <T variant="small">“{r.reply}”</T> : null}
                  </Card>
                ))}
              </View>
            ) : (
              <Empty icon="paper-plane" title="No requests sent" body="Open any AI track and tap “Request to use”." />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type InboxRow = NonNullable<ReturnType<typeof useInbox>["data"]>[number];

function InboxItem({ r, defaultCredit }: { r: InboxRow; defaultCredit: string }) {
  const c = useColors();
  const decide = useDecideRequest();
  const [credit, setCredit] = useState(defaultCredit);
  const [reply, setReply] = useState("");
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Cover uri={r.trackCover} size={40} radius={10} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: Fonts.semibold }} numberOfLines={1}>{r.requesterName}</T>
          <T variant="small" numberOfLines={1}>wants “{r.trackTitle}” for {r.platform}</T>
        </View>
        <StatusPill status={r.status} />
      </View>
      <T variant="small" style={{ color: c.foreground }}>Purpose: {r.purpose}</T>
      {r.message ? <T variant="small">“{r.message}”</T> : null}
      {r.status === "pending" ? (
        <>
          <TextInput value={credit} onChangeText={setCredit} placeholder="Credit line" placeholderTextColor={c.dim} style={inputStyle(c)} />
          <TextInput value={reply} onChangeText={setReply} placeholder="Reply (optional)" placeholderTextColor={c.dim} style={inputStyle(c)} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <GhostButton label="Decline" icon="close" onPress={() => decide.mutate({ id: r.id, status: "declined", reply: reply || undefined })} style={{ flex: 1 }} />
            <GradientButton label="Approve" icon="checkmark" small loading={decide.isPending} onPress={() => decide.mutate({ id: r.id, status: "approved", creditLine: credit || undefined, reply: reply || undefined })} style={{ flex: 1 }} />
          </View>
        </>
      ) : r.creditLine ? (
        <T variant="small" style={{ color: c.lime }}>Credit: {r.creditLine}</T>
      ) : null}
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const c = useColors();
  const color = status === "approved" ? c.lime : status === "declined" ? c.destructive : c.warning;
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: color }}>
      <T style={{ fontSize: 10, fontFamily: Fonts.semibold, color, textTransform: "uppercase" }}>{status}</T>
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 }}>
      <T variant="small">{label}</T>
      <T style={{ fontFamily: Fonts.display, fontSize: 20, color: accent ?? c.foreground }}>{value}</T>
    </View>
  );
}
