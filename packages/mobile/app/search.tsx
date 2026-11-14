import { useEffect, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { useSearch } from "@/queries/catalog";
import { Empty, Loading, ScreenHeader, TrackRow } from "@/components/ui";
import { MiniPlayer } from "@/components/mini-player";

export default function SearchScreen() {
  const c = useColors();
  const params = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(params.q ?? "");
  const [q, setQ] = useState(params.q ?? "");
  useEffect(() => {
    const t = setTimeout(() => setQ(text), 250);
    return () => clearTimeout(t);
  }, [text]);
  const res = useSearch(q);
  const data = res.data ?? [];

  return (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScreenHeader back title="Search" />
        <View style={{ marginHorizontal: 20, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface2, borderRadius: 999, paddingHorizontal: 16, borderWidth: 1, borderColor: c.border }}>
          <Ionicons name="search" size={18} color={c.mutedForeground} />
          <TextInput value={text} onChangeText={setText} placeholder="Tracks, artists, genres" placeholderTextColor={c.dim} style={{ flex: 1, color: c.foreground, fontFamily: Fonts.body, fontSize: 14, paddingVertical: 12 }} />
        </View>
        <FlatList showsVerticalScrollIndicator={false}
          data={data}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(t) => String(t.id)}
          ListEmptyComponent={res.isFetching ? <Loading /> : q.trim() ? <Empty icon="search" title="No matches" /> : undefined}
          renderItem={({ item }) => <TrackRow track={item} queue={data} />}
        />
        <MiniPlayer />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
