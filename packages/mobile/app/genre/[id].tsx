import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { GENRES } from "@/constants/theme";
import { useGenre } from "@/queries/catalog";
import { usePlayer } from "@/lib/player";
import { Chip, Empty, GradientButton, Loading, ScreenHeader, T, TrackRow } from "@/components/ui";
import { MiniPlayer } from "@/components/mini-player";

export default function GenreScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useGenre(id);
  const p = usePlayer();
  const tracks = q.data?.tracks ?? [];

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader back />
      <FlatList showsVerticalScrollIndicator={false}
        data={tracks}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          <View>
            <FlatList
              horizontal
              data={GENRES as unknown as { id: string; label: string }[]}
              keyExtractor={(g) => g.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              renderItem={({ item }) => <Chip label={item.label} active={item.id === id} onPress={() => router.replace(`/genre/${item.id}`)} />}
            />
            <LinearGradient colors={["rgba(255,61,165,0.35)", "rgba(192,38,211,0.1)", "transparent"]} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 22, gap: 6 }}>
              <T variant="label">Genre</T>
              <T variant="display">{q.data?.genre.label ?? ""}</T>
              <T variant="small">{tracks.length} tracks</T>
              {tracks.length ? <GradientButton label="Play all" icon="play" small onPress={() => p.play(tracks[0], tracks)} style={{ alignSelf: "flex-start", marginTop: 8 }} /> : null}
            </LinearGradient>
          </View>
        }
        ListEmptyComponent={q.isLoading ? <Loading /> : <Empty icon="musical-notes" title="No tracks yet" body="Be the first to upload in this genre." />}
        renderItem={({ item, index }) => <TrackRow track={item} queue={tracks} index={index} />}
      />
      <MiniPlayer />
    </SafeAreaView>
  );
}
