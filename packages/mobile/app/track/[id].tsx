import { useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Share, TextInput, View, type LayoutChangeEvent, type GestureResponderEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts, GRADIENT, PLATFORMS } from "@/constants/theme";
import { API_URL } from "@/lib/auth";
import { fmtCount, fmtTime, usePlayer } from "@/lib/player";
import { useToggleLike, useTrack } from "@/queries/catalog";
import { useMe } from "@/queries/me";
import { useCreateRequest, useRequestForTrack } from "@/queries/requests";
import { DonationBar } from "@/components/donation";
import { Chip, Cover, GhostButton, GradientButton, Loading, OriginBadge, ScreenHeader, T, TrackRow, genreLabel, inputStyle, type IconName } from "@/components/ui";

const USE_PLATFORMS = ["YouTube", "TikTok", "Instagram", "Twitch", "Podcast", "Film / Ad", "Other"];

export default function TrackScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tid = Number(id);
  const q = useTrack(tid);
  const p = usePlayer();
  const { signedIn, session } = useMe();
  const like = useToggleLike(tid);
  const existing = useRequestForTrack(tid, signedIn);
  const [reqOpen, setReqOpen] = useState(false);
  const [barW, setBarW] = useState(1);

  if (!q.data)
    return (
      <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
        <ScreenHeader back />
        {q.error ? <T style={{ padding: 20 }}>Track not found.</T> : <Loading />}
      </SafeAreaView>
    );

  const { track: t, liked, more } = q.data;
  const isCur = p.current?.id === t.id;
  const playingThis = isCur && p.playing;
  const pct = isCur && p.duration ? p.position / p.duration : 0;
  const links = Object.entries((t.links ?? {}) as Record<string, string>).filter(([, v]) => !!v);
  const own = session.data?.user.id === t.userId;

  const seek = (e: GestureResponderEvent) => {
    if (!isCur || !p.duration) return;
    p.seek((e.nativeEvent.locationX / barW) * p.duration);
  };

  const share = async () => {
    const url = `${API_URL}/track/${t.id}`;
    try {
      await Share.share({ message: `${t.title} by ${t.artistName} on Earbass — ${url}`, url, title: t.title });
    } catch {
      /* dismissed */
    }
  };

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader
          back
          title="Now playing"
          right={
            <Pressable onPress={() => void share()} accessibilityLabel="Share" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="share-social" size={18} color={c.foreground} />
            </Pressable>
          }
        />
        <View style={{ alignItems: "center", paddingHorizontal: 28, paddingTop: 10 }}>
          <View style={{ shadowColor: c.primary, shadowOpacity: 0.45, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } }}>
            <Cover uri={t.coverUrl} size={280} radius={28} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 22, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <OriginBadge origin={t.origin} />
            <T variant="small">
              {genreLabel(t.genre)}
              {t.bpm ? ` · ${t.bpm} BPM` : ""}
              {t.aiTool ? ` · ${t.aiTool}` : ""}
            </T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <T variant="display" style={{ fontSize: 26 }} numberOfLines={2}>
                {t.title}
              </T>
              <Pressable onPress={() => router.push(`/artist/${t.userId}`)}>
                <T style={{ color: c.primary, fontFamily: Fonts.semibold }}>{t.artistName}</T>
              </Pressable>
            </View>
            <Pressable
              onPress={() => (signedIn ? like.mutate() : router.push("/sign-in"))}
              accessibilityLabel={liked ? "Unlike" : "Like"}
              style={{ alignItems: "center", gap: 2 }}
            >
              <Ionicons name={liked ? "heart" : "heart-outline"} size={28} color={liked ? c.primary : c.foreground} />
              <T variant="small" style={{ fontSize: 10 }}>{fmtCount(t.likes)}</T>
            </Pressable>
          </View>
        </View>

        {/* Scrubber */}
        <View style={{ paddingHorizontal: 24, marginTop: 18 }}>
          <Pressable onLayout={(e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width)} onPress={seek} style={{ height: 22, justifyContent: "center" }}>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: c.surface2, overflow: "hidden" }}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height: "100%" }} />
            </View>
          </Pressable>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T variant="small">{fmtTime(isCur ? p.position : 0)}</T>
            <T variant="small">{fmtTime(isCur ? p.duration : t.durationSec ?? 0)}</T>
          </View>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, marginTop: 8 }}>
          <Pressable onPress={p.prev} accessibilityLabel="Previous" hitSlop={8}>
            <Ionicons name="play-skip-back" size={26} color={c.foreground} />
          </Pressable>
          <Pressable onPress={() => p.play(t, p.queue.some((x) => x.id === t.id) ? p.queue : [t, ...more])} accessibilityLabel={playingThis ? "Pause" : "Play"} style={{ width: 76, height: 76, borderRadius: 38, overflow: "hidden" }}>
            <LinearGradient colors={GRADIENT} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={playingThis ? "pause" : "play"} size={32} color="#fff" style={{ marginLeft: playingThis ? 0 : 4 }} />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={p.next} accessibilityLabel="Next" hitSlop={8}>
            <Ionicons name="play-skip-forward" size={26} color={c.foreground} />
          </Pressable>
        </View>
        <T variant="small" style={{ textAlign: "center", marginTop: 10 }}>
          {fmtCount(t.plays)} plays
        </T>

        {t.description ? (
          <T variant="small" style={{ paddingHorizontal: 24, marginTop: 16, color: c.foreground, lineHeight: 20 }}>
            {t.description}
          </T>
        ) : null}

        {/* Listen on */}
        {links.length ? (
          <View style={{ paddingHorizontal: 24, marginTop: 22, gap: 10 }}>
            <T variant="label">Listen on</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {links.map(([k, url]) => {
                const meta = PLATFORMS.find((x) => x.key === k);
                return <GhostButton key={k} label={meta?.label ?? k} icon={(meta?.icon ?? "link") as IconName} color={meta?.color} onPress={() => void Linking.openURL(url)} />;
              })}
            </View>
          </View>
        ) : null}

        {/* Support artist */}
        <View style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <DonationBar recipientId={t.userId} trackId={t.id} />
        </View>

        {/* Request to use */}
        {t.origin === "ai" && !own ? (
          <View style={{ paddingHorizontal: 24, marginTop: 22, gap: 8 }}>
            {existing.data ? (
              <View style={{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, gap: 4 }}>
                <T style={{ fontFamily: Fonts.semibold }}>
                  Your request: <T style={{ color: existing.data.status === "approved" ? c.lime : existing.data.status === "declined" ? c.destructive : c.warning, fontFamily: Fonts.semibold }}>{existing.data.status}</T>
                </T>
                {existing.data.creditLine ? <T variant="small" style={{ color: c.lime }}>Credit: {existing.data.creditLine}</T> : null}
                {existing.data.status !== "pending" ? <GhostButton label="Request again" icon="refresh" onPress={() => setReqOpen(true)} style={{ marginTop: 6 }} /> : null}
              </View>
            ) : (
              <GradientButton label="Request to use this song" icon="paper-plane" onPress={() => (signedIn ? setReqOpen(true) : router.push("/sign-in"))} />
            )}
            <T variant="small">Ask the artist for permission to use this AI track in your content.</T>
          </View>
        ) : null}

        {more.length ? (
          <>
            <T variant="h2" style={{ paddingHorizontal: 20, marginTop: 28, marginBottom: 8 }}>
              More {genreLabel(t.genre)}
            </T>
            {more.map((m) => (
              <TrackRow key={m.id} track={m} queue={more} />
            ))}
          </>
        ) : null}
      </ScrollView>

      <RequestModal open={reqOpen} onClose={() => setReqOpen(false)} trackId={t.id} title={t.title} />
    </SafeAreaView>
  );
}

function RequestModal({ open, onClose, trackId, title }: { open: boolean; onClose: () => void; trackId: number; title: string }) {
  const c = useColors();
  const create = useCreateRequest();
  const [platform, setPlatform] = useState("YouTube");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");

  const submit = async () => {
    await create.mutateAsync({ trackId, platform, purpose: purpose.trim(), message: message.trim() || undefined });
    setPurpose("");
    setMessage("");
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 14, borderWidth: 1, borderColor: c.border }}>
          <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.dim }} />
          <T variant="h2">Request to use “{title}”</T>
          <T variant="label">Platform</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            {USE_PLATFORMS.map((pl) => (
              <Chip key={pl} label={pl} active={platform === pl} onPress={() => setPlatform(pl)} />
            ))}
          </ScrollView>
          <T variant="label">Purpose</T>
          <TextInput value={purpose} onChangeText={setPurpose} placeholder="e.g. Background music for a gaming montage" placeholderTextColor={c.dim} maxLength={200} style={inputStyle(c)} />
          <TextInput value={message} onChangeText={setMessage} placeholder="Message to the artist (optional)" placeholderTextColor={c.dim} multiline maxLength={1000} style={[inputStyle(c), { minHeight: 70, textAlignVertical: "top" }]} />
          {create.error ? <T variant="small" style={{ color: c.destructive }}>{create.error.message}</T> : null}
          <GradientButton label="Send request" icon="paper-plane" loading={create.isPending} disabled={purpose.trim().length < 3} onPress={() => void submit()} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
