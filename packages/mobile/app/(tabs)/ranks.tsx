import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { useLeaderboard } from "@/queries/catalog";
import { fmtCount } from "@/lib/player";
import { Cover, Loading, T } from "@/components/ui";

export default function RanksScreen() {
  const c = useColors();
  const q = useLeaderboard();
  const d = q.data;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      {!d ? (
        <Loading />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={d.ranked}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.primary} />}
          ListHeaderComponent={
            <View style={{ padding: 20, gap: 16 }}>
              <View>
                <T variant="label">Leaderboard</T>
                <T variant="display" style={{ fontSize: 26 }}>
                  Ranks
                </T>
              </View>
              {d.champion ? (
                <Pressable onPress={() => router.push(`/artist/${d.champion!.userId}`)} style={{ borderRadius: 26, overflow: "hidden" }}>
                  <LinearGradient colors={["#FF3DA5", "#C026D3", "#3B0A4A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 }}>
                      <Ionicons name="trophy" size={13} color="#C6FF3D" />
                      <T style={{ fontFamily: Fonts.semibold, fontSize: 11, color: "#C6FF3D", letterSpacing: 1 }}>BEST AI DJ</T>
                    </View>
                    <View style={{ borderWidth: 3, borderColor: "#fff", borderRadius: 46 }}>
                      <Cover uri={d.champion.avatarUrl} size={84} radius={42} />
                    </View>
                    <T variant="h1" style={{ color: "#fff" }}>{d.champion.artistName}</T>
                    <T style={{ color: "rgba(255,255,255,0.85)" }}>
                      {d.champion.points} pts · {fmtCount(d.champion.plays)} plays · {d.champion.uploads} uploads
                    </T>
                  </LinearGradient>
                </Pressable>
              ) : null}
              <View style={{ flexDirection: "row", gap: 10, backgroundColor: c.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
                <Ionicons name="information-circle" size={18} color={c.primary} />
                <T variant="small" style={{ flex: 1 }}>
                  Every {d.rules.every} uploads (AI or original) earns +{d.rules.points} points. #1 by points, then plays, holds the Best AI DJ title.
                </T>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/artist/${item.userId}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: pressed ? c.card : "transparent" })}>
              <T style={{ width: 28, fontFamily: Fonts.display, fontSize: 15, color: item.rank <= 3 ? c.primary : c.dim }}>{item.rank}</T>
              <Cover uri={item.avatarUrl} size={46} radius={23} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: Fonts.semibold }} numberOfLines={1}>
                  {item.artistName}
                </T>
                <T variant="small">
                  {item.uploads} uploads · {fmtCount(item.plays)} plays
                </T>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T style={{ fontFamily: Fonts.display, color: c.primary }}>{item.points}</T>
                <T variant="small" style={{ fontSize: 10 }}>pts</T>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
