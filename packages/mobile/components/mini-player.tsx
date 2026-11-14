import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { usePlayer } from "@/lib/player";
import { Cover } from "./ui";

export function MiniPlayer() {
  const c = useColors();
  const p = usePlayer();
  if (!p.current) return null;
  const t = p.current;
  const pct = p.duration ? Math.min(1, p.position / p.duration) : 0;
  return (
    <Pressable
      onPress={() => router.push(`/track/${t.id}`)}
      style={{ marginHorizontal: 12, marginBottom: 8, borderRadius: 18, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, overflow: "hidden" }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, paddingRight: 10 }}>
        <Cover uri={t.coverUrl} size={42} radius={10} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: c.foreground, fontFamily: Fonts.semibold, fontSize: 13 }}>
            {t.title}
          </Text>
          <Text numberOfLines={1} style={{ color: c.mutedForeground, fontFamily: Fonts.body, fontSize: 11 }}>
            {p.buffering ? "Loading…" : t.artistName}
          </Text>
        </View>
        <Pressable onPress={p.prev} hitSlop={6} style={{ padding: 6 }}>
          <Ionicons name="play-skip-back" size={18} color={c.foreground} />
        </Pressable>
        <Pressable onPress={p.toggle} hitSlop={6} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={p.playing ? "pause" : "play"} size={18} color="#fff" style={{ marginLeft: p.playing ? 0 : 2 }} />
        </Pressable>
        <Pressable onPress={p.next} hitSlop={6} style={{ padding: 6 }}>
          <Ionicons name="play-skip-forward" size={18} color={c.foreground} />
        </Pressable>
      </View>
      <View style={{ height: 2, backgroundColor: "rgba(255,255,255,0.06)" }}>
        <View style={{ width: `${pct * 100}%`, height: 2, backgroundColor: c.primary }} />
      </View>
    </Pressable>
  );
}
