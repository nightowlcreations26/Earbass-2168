import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, Text, View, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts, GRADIENT, GENRES } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { fmtCount, usePlayer } from "@/lib/player";
import type { TrackItem } from "@/lib/api";
import { LikeShare } from "@/components/like-share";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

export const genreLabel = (id: string) => GENRES.find((g) => g.id === id)?.label ?? id;

export function T({ children, style, variant = "body", numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; variant?: "display" | "h1" | "h2" | "body" | "small" | "label"; numberOfLines?: number }) {
  const c = useColors();
  const base: TextStyle =
    variant === "display"
      ? { fontFamily: Fonts.displayBlack, fontSize: 28, letterSpacing: -0.5, color: c.foreground }
      : variant === "h1"
        ? { fontFamily: Fonts.display, fontSize: 22, letterSpacing: -0.3, color: c.foreground }
        : variant === "h2"
          ? { fontFamily: Fonts.display, fontSize: 16, color: c.foreground }
          : variant === "small"
            ? { fontFamily: Fonts.body, fontSize: 12, color: c.mutedForeground }
            : variant === "label"
              ? { fontFamily: Fonts.semibold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: c.mutedForeground }
              : { fontFamily: Fonts.body, fontSize: 14, color: c.foreground };
  return (
    <Text style={[base, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function GradientButton({ label, icon, onPress, disabled, loading, style, small }: { label: string; icon?: IconName; onPress?: () => void; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ opacity: disabled ? 0.5 : pressed ? 0.85 : 1, borderRadius: 999, overflow: "hidden" }, style]}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: small ? 14 : 20, paddingVertical: small ? 8 : 13 }}>
        {loading ? <ActivityIndicator color="#fff" size="small" /> : icon ? <Ionicons name={icon} size={small ? 15 : 18} color="#fff" /> : null}
        <Text style={{ color: "#fff", fontFamily: Fonts.semibold, fontSize: small ? 13 : 15 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ label, icon, onPress, style, active, color }: { label: string; icon?: IconName; onPress?: () => void; style?: StyleProp<ViewStyle>; active?: boolean; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: active ? c.primary : c.surface2, borderWidth: 1, borderColor: active ? c.primary : c.border, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={color ?? (active ? "#fff" : c.foreground)} /> : null}
      <Text style={{ color: active ? "#fff" : c.foreground, fontFamily: Fonts.medium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useColors();
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9 }}>
      {icon ? <Ionicons name={icon} size={14} color={active ? "#fff" : c.blush} /> : null}
      <Text style={{ color: active ? "#fff" : c.foreground, fontFamily: Fonts.medium, fontSize: 13 }}>{label}</Text>
    </View>
  );
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ borderRadius: 999, overflow: "hidden", opacity: pressed ? 0.8 : 1, backgroundColor: active ? undefined : c.surface2, borderWidth: active ? 0 : 1, borderColor: c.border })}>
      {active ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 26, marginBottom: 12 }}>
      <T variant="h2">{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: c.primary, fontFamily: Fonts.medium, fontSize: 13 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Cover({ uri, size, radius = 14 }: { uri?: string | null; size: number; radius?: number }) {
  const c = useColors();
  if (!uri)
    return (
      <LinearGradient colors={GRADIENT} style={{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="musical-notes" size={size * 0.35} color="#fff" />
      </LinearGradient>
    );
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: c.surface2 }} />;
}

export function OriginBadge({ origin }: { origin: string }) {
  const c = useColors();
  const ai = origin === "ai";
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: ai ? "rgba(255,61,165,0.16)" : "rgba(198,255,61,0.14)" }}>
      <Text style={{ fontFamily: Fonts.semibold, fontSize: 9, letterSpacing: 0.8, color: ai ? c.primary : c.lime }}>{ai ? "AI" : "ORIGINAL"}</Text>
    </View>
  );
}

/** Square card for horizontal rows (New Updates). */
export function TrackTile({ track, queue }: { track: TrackItem; queue: TrackItem[] }) {
  const c = useColors();
  const p = usePlayer();
  const isCur = p.current?.id === track.id;
  return (
    <Pressable onPress={() => router.push(`/track/${track.id}`)} style={{ width: 150 }}>
      <View>
        <Cover uri={track.coverUrl} size={150} radius={18} />
        <Pressable
          onPress={() => p.play(track, queue)}
          hitSlop={6}
          style={{ position: "absolute", right: 8, bottom: 8, width: 36, height: 36, borderRadius: 18, overflow: "hidden" }}
        >
          <LinearGradient colors={GRADIENT} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={isCur && p.playing ? "pause" : "play"} size={16} color="#fff" style={{ marginLeft: isCur && p.playing ? 0 : 2 }} />
          </LinearGradient>
        </Pressable>
      </View>
      <T style={{ fontFamily: Fonts.semibold, marginTop: 9, color: isCur ? c.primary : c.foreground }} numberOfLines={1}>
        {track.title}
      </T>
      <T variant="small" numberOfLines={1}>
        {track.artistName} · {genreLabel(track.genre)}
      </T>
      <View style={{ marginTop: 6 }}>
        <LikeShare trackId={track.id} title={track.title} likes={track.likes} size={15} />
      </View>
    </Pressable>
  );
}

/** List row (Popular & Trending, genre lists). */
export function TrackRow({ track, queue, index, right }: { track: TrackItem; queue: TrackItem[]; index?: number; right?: ReactNode }) {
  const c = useColors();
  const p = usePlayer();
  const isCur = p.current?.id === track.id;
  return (
    <Pressable
      onPress={() => router.push(`/track/${track.id}`)}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: pressed ? c.card : "transparent" })}
    >
      {index !== undefined ? <Text style={{ width: 20, color: index < 3 ? c.primary : c.dim, fontFamily: Fonts.display, fontSize: 13 }}>{index + 1}</Text> : null}
      <Cover uri={track.coverUrl} size={54} radius={12} />
      <View style={{ flex: 1, gap: 3 }}>
        <T style={{ fontFamily: Fonts.semibold, color: isCur ? c.primary : c.foreground }} numberOfLines={1}>
          {track.title}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <OriginBadge origin={track.origin} />
          <T variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>
            {track.artistName} · {fmtCount(track.plays)} plays
          </T>
        </View>
      </View>
      {right ?? <LikeShare trackId={track.id} title={track.title} size={17} />}
      {right ? null : (
        <Pressable onPress={() => p.play(track, queue)} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: isCur ? c.primary : c.surface2 }}>
          <Ionicons name={isCur && p.playing ? "pause" : "play"} size={16} color={isCur ? "#fff" : c.foreground} style={{ marginLeft: isCur && p.playing ? 0 : 2 }} />
        </Pressable>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16 }, style]}>{children}</View>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useColors();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", backgroundColor: color ?? c.primary, borderRadius: 3 }} />
    </View>
  );
}

export function ScreenHeader({ title, back, right }: { title?: string; back?: boolean; right?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
      {back ? (
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={20} color={c.foreground} />
        </Pressable>
      ) : null}
      <T variant="h2" style={{ flex: 1 }} numberOfLines={1}>
        {title ?? ""}
      </T>
      {right}
    </View>
  );
}

export function Loading() {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

export function Empty({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: "center", padding: 32, gap: 10 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={26} color={c.primary} />
      </View>
      <T variant="h2" style={{ textAlign: "center" }}>
        {title}
      </T>
      {body ? (
        <T variant="small" style={{ textAlign: "center", maxWidth: 280 }}>
          {body}
        </T>
      ) : null}
      {children}
    </View>
  );
}

export function inputStyle(c: ReturnType<typeof useColors>) {
  return { color: c.foreground, fontFamily: Fonts.body, fontSize: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 } as const;
}
