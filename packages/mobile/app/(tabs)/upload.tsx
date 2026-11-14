import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts, GENRES, PLATFORMS, type GenreId } from "@/constants/theme";
import { useMe, useUploadTrack } from "@/queries/me";
import { Card, Chip, Empty, GradientButton, GhostButton, ProgressBar, T, inputStyle } from "@/components/ui";

type Picked = { uri: string; name: string; mimeType?: string; size?: number; file?: File };
const AI_TOOLS = ["Suno", "Udio", "ElevenLabs", "Stable Audio", "Other"];

export default function UploadScreen() {
  const c = useColors();
  const { signedIn, me, session } = useMe();
  const upload = useUploadTrack();
  const [file, setFile] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<GenreId>("techno");
  const [origin, setOrigin] = useState<"ai" | "original">("ai");
  const [aiTool, setAiTool] = useState("Suno");
  const [bpm, setBpm] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [result, setResult] = useState<null | { title: string; pointsEarned: number; justApproved: boolean; qualifies: boolean }>(null);

  if (session.isPending) return <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }} />;

  if (!signedIn)
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background, justifyContent: "center" }}>
        <Empty icon="cloud-upload" title="Sign in to upload" body="Drop AI or original tracks. 3 AI songs or 2 originals and you're auto-approved.">
          <GradientButton label="Sign in" icon="log-in" onPress={() => router.push("/sign-in")} style={{ marginTop: 8 }} />
        </Empty>
      </SafeAreaView>
    );

  const m = me.data;
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, file: (a as { file?: File }).file });
    if (!title) setTitle(a.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 100));
  };

  const submit = async () => {
    if (!file || !title.trim()) return;
    const cleanLinks = Object.fromEntries(Object.entries(links).filter(([, v]) => v.trim()));
    const res = await upload.mutateAsync({
      file,
      meta: {
        title: title.trim(),
        genre,
        origin,
        aiTool: origin === "ai" ? aiTool : undefined,
        bpm: bpm ? Math.max(40, Math.min(250, parseInt(bpm, 10) || 0)) || undefined : undefined,
        links: cleanLinks,
      },
    });
    setResult({ title: res.track.title, pointsEarned: res.pointsEarned, justApproved: res.approval.justApproved, qualifies: res.approval.qualifies });
    setFile(null);
    setTitle("");
    setBpm("");
    setLinks({});
  };

  const appr = m?.approval;
  const pts = m?.points;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
          <View>
            <T variant="label">Upload</T>
            <T variant="display" style={{ fontSize: 26 }}>
              Drop a track
            </T>
          </View>

          {/* Status */}
          {appr && pts ? (
            <Card style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name={m.profile.approved ? "checkmark-circle" : "time"} size={18} color={m.profile.approved ? c.lime : c.warning} />
                <T style={{ fontFamily: Fonts.semibold, flex: 1 }}>{m.profile.approved ? "Approved artist — uploads go public" : "Pending — uploads stay private until approved"}</T>
              </View>
              {!m.profile.approved ? (
                <View style={{ gap: 8 }}>
                  <Row label={`AI songs ${appr.ai}/${appr.rules.ai}`} value={appr.ai / appr.rules.ai} />
                  <Row label={`Originals ${appr.original}/${appr.rules.original}`} value={appr.original / appr.rules.original} color={c.lime} />
                </View>
              ) : null}
              <Row label={`${pts.points} pts · ${pts.towardNext}/7 to next +100`} value={pts.towardNext / 7} color={c.magenta} />
            </Card>
          ) : null}

          {result ? (
            <Card style={{ borderColor: "rgba(198,255,61,0.4)", gap: 6 }}>
              <T style={{ fontFamily: Fonts.semibold, color: c.lime }}>“{result.title}” uploaded</T>
              <T variant="small">
                {result.justApproved ? "You're now an approved artist — your catalog is live! " : result.qualifies ? "It's live on Earbass. " : "Saved privately — keep going to get approved. "}
                {result.pointsEarned > 0 ? `+${result.pointsEarned} points earned!` : ""}
              </T>
            </Card>
          ) : null}

          {/* File */}
          <Pressable onPress={() => void pick()} style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: file ? c.primary : "rgba(255,255,255,0.18)", borderRadius: 22, padding: 22, alignItems: "center", gap: 8, backgroundColor: file ? "rgba(255,61,165,0.08)" : c.card }}>
            <Ionicons name={file ? "musical-note" : "cloud-upload-outline"} size={30} color={c.primary} />
            <T style={{ fontFamily: Fonts.semibold, textAlign: "center" }} numberOfLines={1}>
              {file ? file.name : "Choose an audio file"}
            </T>
            <T variant="small">{file ? `${file.size ? (file.size / 1e6).toFixed(1) + " MB · " : ""}tap to change` : "MP3, WAV, M4A, FLAC"}</T>
          </Pressable>

          <Field label="Title">
            <TextInput value={title} onChangeText={setTitle} placeholder="Track title" placeholderTextColor={c.dim} maxLength={100} style={inputStyle(c)} />
          </Field>

          <Field label="Made with">
            <View style={{ flexDirection: "row", gap: 8 }}>
              <GhostButton label="AI" icon="sparkles" active={origin === "ai"} onPress={() => setOrigin("ai")} style={{ flex: 1 }} />
              <GhostButton label="Original" icon="mic" active={origin === "original"} onPress={() => setOrigin("original")} style={{ flex: 1 }} />
            </View>
            {origin === "ai" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 10 }}>
                {AI_TOOLS.map((t) => (
                  <Chip key={t} label={t} active={aiTool === t} onPress={() => setAiTool(t)} />
                ))}
              </ScrollView>
            ) : null}
          </Field>

          <Field label="Genre">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {GENRES.map((g) => (
                <Chip key={g.id} label={g.label} active={genre === g.id} onPress={() => setGenre(g.id)} />
              ))}
            </View>
          </Field>

          <Field label="BPM (optional)">
            <TextInput value={bpm} onChangeText={(v) => setBpm(v.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" placeholder="128" placeholderTextColor={c.dim} style={inputStyle(c)} />
          </Field>

          <Pressable onPress={() => setShowLinks((s) => !s)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={showLinks ? "chevron-down" : "chevron-forward"} size={16} color={c.primary} />
            <Text style={{ color: c.primary, fontFamily: Fonts.medium }}>Listen-on links (Spotify, SoundCloud, Suno…)</Text>
          </Pressable>
          {showLinks
            ? PLATFORMS.map((p) => (
                <TextInput
                  key={p.key}
                  value={links[p.key] ?? ""}
                  onChangeText={(v) => setLinks((l) => ({ ...l, [p.key]: v }))}
                  placeholder={`${p.label} URL`}
                  placeholderTextColor={c.dim}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={inputStyle(c)}
                />
              ))
            : null}

          {upload.error ? <T variant="small" style={{ color: c.destructive }}>{upload.error.message}</T> : null}
          <GradientButton label={upload.isPending ? "Uploading…" : "Publish track"} icon="rocket" loading={upload.isPending} disabled={!file || !title.trim()} onPress={() => void submit()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="small">{label}</T>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <T variant="label">{label}</T>
      {children}
    </View>
  );
}
