import { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { Fonts, GRADIENT } from "@/constants/theme";
import { API_URL } from "@/lib/auth";
import { usePlayer } from "@/lib/player";
import { BeatEngine, PRESETS, VOICES, VOICE_META, blank, fromPreset, randomize, type Pattern, type VoiceId } from "@/lib/beat-engine";
import { useGeneratePattern } from "@/queries/studio";
import { Card, Chip, GhostButton, GradientButton, T } from "@/components/ui";

const IDEAS = ["Dark warehouse techno, rolling bass", "Liquid DnB at 174", "Mextech with tribal percs", "Night bass UKG shuffle", "Festival EDM drop"];
const CELL = 30;
const GAP = 4;

export default function StudioScreen() {
  const c = useColors();
  const player = usePlayer();
  const [pattern, setPattern] = useState<Pattern>(() => fromPreset(PRESETS[0]));
  const [presetName, setPresetName] = useState("Techno");
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [prompt, setPrompt] = useState("");
  const [aiName, setAiName] = useState<string | null>(null);
  const [flash, setFlash] = useState<VoiceId | null>(null);
  const [page, setPage] = useState(0);
  const gen = useGeneratePattern();

  const engine = useRef<BeatEngine | null>(null);
  const patRef = useRef(pattern);
  patRef.current = pattern;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = useRef(0);

  const getEngine = useCallback(() => {
    if (!engine.current) engine.current = new BeatEngine();
    return engine.current;
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      engine.current?.release();
      engine.current = null;
    },
    [],
  );

  const tick = useCallback(() => {
    const p = patRef.current;
    const i = cur.current;
    const eng = getEngine();
    for (const t of p.tracks) if (t.steps[i] && !t.muted) eng.trigger(t.id, t.volume, t.note[i] ?? 0);
    setStep(i);
    cur.current = (i + 1) % 16;
    const base = 60000 / p.bpm / 4;
    const dur = i % 2 === 0 ? base * (1 + p.swing) : base * (1 - p.swing);
    timer.current = setTimeout(tick, dur);
  }, [getEngine]);

  const start = () => {
    if (player.playing) player.toggle();
    getEngine();
    cur.current = 0;
    setPlaying(true);
    tick();
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    setStep(-1);
  };

  const toggleCell = (vi: number, si: number) =>
    setPattern((p) => ({ ...p, tracks: p.tracks.map((t, i) => (i === vi ? { ...t, steps: t.steps.map((v, j) => (j === si ? !v : v)) } : t)) }));
  const toggleMute = (vi: number) => setPattern((p) => ({ ...p, tracks: p.tracks.map((t, i) => (i === vi ? { ...t, muted: !t.muted } : t)) }));
  const setBpm = (d: number) => setPattern((p) => ({ ...p, bpm: Math.max(60, Math.min(200, p.bpm + d)) }));
  const setSwing = (d: number) => setPattern((p) => ({ ...p, swing: Math.max(0, Math.min(0.6, Math.round((p.swing + d) * 100) / 100)) }));

  const hit = (v: VoiceId) => {
    getEngine().trigger(v, 0.9, 0);
    setFlash(v);
    setTimeout(() => setFlash((f) => (f === v ? null : f)), 120);
  };

  const generate = async (text?: string) => {
    const q = (text ?? prompt).trim();
    if (q.length < 2) return;
    setPrompt(q);
    const res = await gen.mutateAsync(q);
    const tracks = res.pattern.tracks
      .filter((t) => (VOICES as readonly string[]).includes(t.id))
      .map((t) => ({ id: t.id as VoiceId, steps: t.steps, volume: t.volume, muted: t.muted, note: t.note ?? Array(16).fill(0) }));
    setPattern({ bpm: res.pattern.bpm, swing: res.pattern.swing, tracks });
    setAiName(res.name);
    setPresetName("");
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <T variant="label">Studio</T>
            <T variant="display" style={{ fontSize: 26 }}>
              Beat Pad
            </T>
          </View>

          {/* AI prompt */}
          <View style={{ marginHorizontal: 20, marginTop: 16, borderRadius: 22, overflow: "hidden" }}>
            <LinearGradient colors={["rgba(255,61,165,0.22)", "rgba(192,38,211,0.12)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, borderWidth: 1, borderColor: "rgba(255,61,165,0.3)", borderRadius: 22, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={16} color={c.primary} />
                <T style={{ fontFamily: Fonts.semibold }}>AI pattern generator</T>
              </View>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="Describe a groove… e.g. dark rolling techno"
                placeholderTextColor={c.dim}
                multiline
                style={{ minHeight: 56, color: c.foreground, fontFamily: Fonts.body, fontSize: 14, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 14, padding: 12, textAlignVertical: "top" }}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
                {IDEAS.map((i) => (
                  <Pressable key={i} onPress={() => void generate(i)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.3)" }}>
                    <Text style={{ color: c.blush, fontFamily: Fonts.medium, fontSize: 11 }}>{i}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <GradientButton label={gen.isPending ? "Cooking pattern…" : "Generate pattern"} icon="flash" loading={gen.isPending} onPress={() => void generate()} disabled={prompt.trim().length < 2} />
              {gen.error ? <T variant="small" style={{ color: c.destructive }}>{gen.error.message}</T> : null}
              {aiName ? <T variant="small" style={{ color: c.lime }}>Loaded “{aiName}” · {pattern.bpm} BPM</T> : null}
            </LinearGradient>
          </View>

          {/* Presets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 16 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p.name}
                label={p.name}
                active={presetName === p.name}
                onPress={() => {
                  setPattern(fromPreset(p));
                  setPresetName(p.name);
                  setAiName(null);
                }}
              />
            ))}
          </ScrollView>

          {/* Transport */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, marginTop: 16 }}>
            <Pressable onPress={playing ? stop : start} accessibilityLabel={playing ? "Stop" : "Play"} style={{ width: 56, height: 56, borderRadius: 28, overflow: "hidden" }}>
              <LinearGradient colors={GRADIENT} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={playing ? "stop" : "play"} size={24} color="#fff" style={{ marginLeft: playing ? 0 : 3 }} />
              </LinearGradient>
            </Pressable>
            <Stepper label="BPM" value={String(pattern.bpm)} onMinus={() => setBpm(-2)} onPlus={() => setBpm(2)} />
            <Stepper label="Swing" value={`${Math.round(pattern.swing * 100)}%`} onMinus={() => setSwing(-0.05)} onPlus={() => setSwing(0.05)} />
          </View>

          {/* Grid */}
          <Card style={{ marginHorizontal: 20, marginTop: 16, padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
              <View style={{ flexDirection: "row", backgroundColor: c.surface2, borderRadius: 999, padding: 3 }}>
                {[0, 1].map((pg) => (
                  <Pressable key={pg} onPress={() => setPage(pg)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: page === pg ? c.primary : "transparent" }}>
                    <Text style={{ color: page === pg ? "#fff" : c.mutedForeground, fontFamily: Fonts.semibold, fontSize: 11 }}>{pg === 0 ? "1–8" : "9–16"}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1, flexDirection: "row", gap: 3, justifyContent: "flex-end" }}>
                {Array.from({ length: 16 }, (_, i) => (
                  <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === step ? c.primary : Math.floor(i / 8) === page ? "#3A3545" : c.surface2 }} />
                ))}
              </View>
            </View>
            <View style={{ gap: GAP }}>
              {pattern.tracks.map((t, vi) => (
                <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: GAP }}>
                  <Pressable onPress={() => toggleMute(vi)} onLongPress={() => hit(t.id)} style={{ height: CELL, width: 62, justifyContent: "center" }}>
                    <Text numberOfLines={1} style={{ color: t.muted ? c.dim : c.foreground, fontFamily: Fonts.semibold, fontSize: 11, textDecorationLine: t.muted ? "line-through" : "none" }}>
                      {VOICE_META[t.id].label}
                    </Text>
                  </Pressable>
                  {t.steps.slice(page * 8, page * 8 + 8).map((on, k) => {
                    const si = page * 8 + k;
                    const isStep = si === step;
                    return (
                      <Pressable
                        key={si}
                        onPress={() => toggleCell(vi, si)}
                        accessibilityLabel={`${VOICE_META[t.id].label} step ${si + 1}`}
                        style={{
                          flex: 1,
                          height: CELL,
                          borderRadius: 7,
                          marginLeft: k === 4 ? 4 : 0,
                          backgroundColor: on ? (t.muted ? c.dim : VOICE_META[t.id].color) : k % 4 === 0 ? "#2A2633" : c.surface2,
                          borderWidth: isStep ? 2 : 0,
                          borderColor: "#fff",
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <GhostButton label="Randomize" icon="shuffle" onPress={() => { setPattern((p) => randomize(p)); setPresetName(""); }} style={{ flex: 1 }} />
              <GhostButton label="Clear" icon="trash-outline" onPress={() => { setPattern((p) => ({ ...blank(), bpm: p.bpm, swing: p.swing })); setPresetName(""); }} style={{ flex: 1 }} />
            </View>
            <T variant="small" style={{ marginTop: 10 }}>Tap a cell to toggle · tap a name to mute · long-press a name to preview</T>
          </Card>

          {/* Live pads */}
          <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
            <T variant="h2" style={{ marginBottom: 12 }}>
              Live pads
            </T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {VOICES.map((v) => (
                <Pressable
                  key={v}
                  onPressIn={() => hit(v)}
                  style={{ width: "22.5%", flexGrow: 1, aspectRatio: 1, borderRadius: 18, backgroundColor: flash === v ? VOICE_META[v].color : c.card, borderWidth: 1, borderColor: flash === v ? VOICE_META[v].color : c.border, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VOICE_META[v].color, marginBottom: 6 }} />
                  <Text style={{ color: flash === v ? "#0B0A0F" : c.foreground, fontFamily: Fonts.semibold, fontSize: 11 }}>{VOICE_META[v].label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Web studio */}
          <Card style={{ marginHorizontal: 20, marginTop: 22, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="options" size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: Fonts.semibold }}>Mix Pad & AI Song</T>
                <T variant="small">Two decks, EQ, filters, FX rack and full AI song generation live on the web studio.</T>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <GhostButton label="Open Mix Pad" icon="open-outline" onPress={() => void Linking.openURL(`${API_URL}/studio?tab=mix`)} style={{ flex: 1 }} />
              <GhostButton label="AI Song" icon="sparkles" onPress={() => void Linking.openURL(`${API_URL}/studio?tab=song`)} style={{ flex: 1 }} />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingHorizontal: 6, height: 56 }}>
      <Pressable onPress={onMinus} hitSlop={6} accessibilityLabel={`${label} down`} style={{ padding: 6 }}>
        <Ionicons name="remove" size={18} color={c.mutedForeground} />
      </Pressable>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={{ color: c.mutedForeground, fontFamily: Fonts.medium, fontSize: 10 }}>{label}</Text>
        <Text style={{ color: c.foreground, fontFamily: Fonts.display, fontSize: 16 }}>{value}</Text>
      </View>
      <Pressable onPress={onPlus} hitSlop={6} accessibilityLabel={`${label} up`} style={{ padding: 6 }}>
        <Ionicons name="add" size={18} color={c.mutedForeground} />
      </Pressable>
    </View>
  );
}
