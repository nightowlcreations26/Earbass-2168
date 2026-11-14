import { useState } from "react";
import { FlatList, Image, ImageBackground, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts, GENRES, GRADIENT } from "@/constants/theme";
import { useHome } from "@/queries/catalog";
import { useLeaderboard } from "@/queries/catalog";
import { useMe } from "@/queries/me";
import { usePlayer, fmtCount } from "@/lib/player";
import { PlatformDonationBanner } from "@/components/donation";
import { Chip, Cover, Loading, SectionHeader, T, TrackRow, TrackTile, genreLabel } from "@/components/ui";

const hero = require("@/assets/hero.jpg");

export default function HomeScreen() {
  const c = useColors();
  const home = useHome();
  const board = useLeaderboard();
  const { session } = useMe();
  const p = usePlayer();
  const [q, setQ] = useState("");
  const d = home.data;
  const champ = board.data?.champion;
  const name = session.data?.user?.name?.split(" ")[0];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => { void home.refetch(); void board.refetch(); }} tintColor={c.primary} />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <T variant="small">{name ? `Hey ${name}` : "Welcome to"}</T>
            <T variant="display" style={{ fontSize: 26 }}>
              Earbass<T variant="display" style={{ fontSize: 26, color: c.primary }}>.</T>
            </T>
          </View>
          <Pressable onPress={() => router.push("/library")} style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden" }}>
            <LinearGradient colors={GRADIENT} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ marginHorizontal: 20, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface2, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1, borderColor: c.border }}>
          <Ionicons name="search" size={18} color={c.mutedForeground} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search tracks, artists, genres"
            placeholderTextColor={c.dim}
            returnKeyType="search"
            onSubmitEditing={() => q.trim() && router.push({ pathname: "/search", params: { q } })}
            style={{ flex: 1, color: c.foreground, fontFamily: Fonts.body, fontSize: 14, paddingVertical: 12 }}
          />
        </View>

        <PlatformDonationBanner />

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 16 }}>
          <Chip label="All" active />
          {GENRES.map((g) => (
            <Chip key={g.id} label={g.label} onPress={() => router.push(`/genre/${g.id}`)} />
          ))}
        </ScrollView>

        {home.isLoading || !d ? (
          <Loading />
        ) : (
          <>
            {/* Featured */}
            {d.featured ? (
              <Pressable onPress={() => router.push(`/track/${d.featured!.id}`)} style={{ marginHorizontal: 20, marginTop: 20, borderRadius: 26, overflow: "hidden" }}>
                <ImageBackground source={d.featured.coverUrl ? { uri: d.featured.coverUrl } : hero} style={{ height: 210 }} resizeMode="cover">
                  <LinearGradient colors={["rgba(255,61,165,0.55)", "rgba(192,38,211,0.55)", "rgba(11,10,15,0.95)"]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.35)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                      <Ionicons name="star" size={11} color="#FFD1E8" />
                      <T style={{ fontFamily: Fonts.semibold, fontSize: 11, color: "#FFD1E8" }}>FEATURED SHOW</T>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <T variant="display" numberOfLines={2} style={{ fontSize: 26, color: "#fff" }}>
                          {d.featured.title}
                        </T>
                        <T style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }} numberOfLines={1}>
                          {d.featured.artistName} · {genreLabel(d.featured.genre)} · {fmtCount(d.featured.plays)} plays
                        </T>
                      </View>
                      <Pressable onPress={() => p.play(d.featured!, [d.featured!, ...d.popular])} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={p.current?.id === d.featured.id && p.playing ? "pause" : "play"} size={24} color={c.primary} style={{ marginLeft: p.current?.id === d.featured.id && p.playing ? 0 : 3 }} />
                      </Pressable>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ) : null}

            {/* New updates */}
            <SectionHeader title="New Updates" />
            <FlatList
              horizontal
              data={d.newUpdates}
              keyExtractor={(t) => String(t.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              renderItem={({ item }) => <TrackTile track={item} queue={d.newUpdates} />}
            />

            {/* Browse genres grid */}
            <SectionHeader title="Categories" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, gap: 10 }}>
              {d.categories.map((g, i) => {
                const meta = GENRES.find((x) => x.id === g.id);
                return (
                  <Pressable key={g.id} onPress={() => router.push(`/genre/${g.id}`)} style={{ width: "31%", flexGrow: 1, borderRadius: 16, overflow: "hidden" }}>
                    <LinearGradient
                      colors={i % 3 === 0 ? ["#FF3DA5", "#8B1E6B"] : i % 3 === 1 ? ["#C026D3", "#3B0A4A"] : ["#2A2633", "#16141C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 12, height: 78, justifyContent: "space-between" }}
                    >
                      <Ionicons name={(meta?.icon ?? "musical-notes") as never} size={18} color="#fff" />
                      <View>
                        <T style={{ fontFamily: Fonts.semibold, fontSize: 13, color: "#fff" }} numberOfLines={1}>
                          {g.label}
                        </T>
                        <T style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{g.count} tracks</T>
                      </View>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>

            {/* Champion */}
            {champ ? (
              <Pressable onPress={() => router.push(`/artist/${champ.userId}`)} style={{ marginHorizontal: 20, marginTop: 26, borderRadius: 22, overflow: "hidden" }}>
                <LinearGradient colors={["#2A0F22", "#16141C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1, borderColor: "rgba(255,61,165,0.3)", borderRadius: 22 }}>
                  <View>
                    <Cover uri={champ.avatarUrl} size={56} radius={28} />
                    <View style={{ position: "absolute", right: -4, bottom: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: c.lime, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="trophy" size={12} color="#0B0A0F" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="label" style={{ color: c.lime }}>Best AI DJ</T>
                    <T variant="h2" numberOfLines={1}>{champ.artistName}</T>
                    <T variant="small">
                      {champ.points} pts · {fmtCount(champ.plays)} plays · {champ.uploads} uploads
                    </T>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
                </LinearGradient>
              </Pressable>
            ) : null}

            {/* Popular & trending */}
            <SectionHeader title="Popular & Trending" />
            {d.trending.slice(0, 8).map((t, i) => (
              <TrackRow key={t.id} track={t} queue={d.trending} index={i} />
            ))}

            {/* Artists */}
            <SectionHeader title="Top Artists" action="Ranks" onAction={() => router.push("/ranks")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
              {d.artists.map((a) => (
                <Pressable key={a.userId} onPress={() => router.push(`/artist/${a.userId}`)} style={{ alignItems: "center", width: 76 }}>
                  {a.avatarUrl ? <Image source={{ uri: a.avatarUrl }} style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 2, borderColor: c.primary }} /> : <Cover size={68} radius={34} />}
                  <T variant="small" numberOfLines={1} style={{ marginTop: 6, color: c.foreground }}>
                    {a.artistName}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
