import { FlatList, Linking, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts, PLATFORMS } from "@/constants/theme";
import { useArtist, useLeaderboard } from "@/queries/catalog";
import { fmtCount, usePlayer } from "@/lib/player";
import { Cover, Empty, GhostButton, GradientButton, Loading, ScreenHeader, T, TrackRow, type IconName } from "@/components/ui";
import { MiniPlayer } from "@/components/mini-player";
import { DonationBar } from "@/components/donation";
import { API_URL } from "@/lib/auth";

export default function ArtistScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useArtist(id);
  const board = useLeaderboard();
  const p = usePlayer();
  const d = q.data;
  const tracks = d?.tracks ?? [];
  const entry = board.data?.ranked.find((r) => r.userId === id);
  const champ = board.data?.champion?.userId === id;
  const links = Object.entries((d?.profile.links ?? {}) as Record<string, string>).filter(([, v]) => !!v);

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader back />
      {!d ? (
        q.error ? <Empty icon="person" title="Artist not found" /> : <Loading />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={tracks}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <LinearGradient colors={["rgba(255,61,165,0.3)", "transparent"]} style={{ alignItems: "center", padding: 20, gap: 8 }}>
              <View style={{ borderWidth: 3, borderColor: c.primary, borderRadius: 56 }}>
                <Cover uri={d.profile.avatarUrl} size={104} radius={52} />
              </View>
              {champ ? (
                <View style={{ backgroundColor: c.lime, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                  <T style={{ color: "#0B0A0F", fontFamily: Fonts.semibold, fontSize: 11 }}>BEST AI DJ</T>
                </View>
              ) : null}
              <T variant="display" style={{ textAlign: "center" }}>{d.profile.artistName}</T>
              <T variant="small">
                {tracks.length} tracks · {fmtCount(d.totalPlays)} plays{entry ? ` · ${entry.points} pts · #${entry.rank}` : ""}
              </T>
              {d.profile.bio ? <T variant="small" style={{ textAlign: "center", color: c.foreground, maxWidth: 320 }}>{d.profile.bio}</T> : null}
              {links.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 6 }}>
                  {links.map(([k, url]) => {
                    const meta = PLATFORMS.find((x) => x.key === k);
                    return <GhostButton key={k} label={meta?.label ?? k} icon={(meta?.icon ?? "link") as IconName} color={meta?.color} onPress={() => void Linking.openURL(url)} />;
                  })}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {tracks.length ? <GradientButton label="Play all" icon="play" small onPress={() => p.play(tracks[0], tracks)} /> : null}
                <GhostButton
                  label="Share"
                  icon="share-social-outline"
                  onPress={() => {
                    const url = `${API_URL}/artist/${id}`;
                    void Share.share({ message: `${d.profile.artistName} on Earbass — ${url}`, url, title: d.profile.artistName }).catch(() => {});
                  }}
                />
              </View>
              <View style={{ alignSelf: "stretch", marginTop: 12 }}>
                <DonationBar recipientId={id} />
              </View>
            </LinearGradient>
          }
          ListEmptyComponent={<Empty icon="lock-closed" title={d.profile.approved ? "No tracks yet" : "Not approved yet"} body={d.profile.approved ? undefined : "This artist's uploads are private until approval."} />}
          renderItem={({ item }) => <TrackRow track={item} queue={tracks} />}
        />
      )}
      <MiniPlayer />
    </SafeAreaView>
  );
}
