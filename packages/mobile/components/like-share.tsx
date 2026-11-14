import { Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Fonts } from "@/constants/theme";
import { useColors } from "@/hooks/use-colors";
import { API_URL } from "@/lib/auth";
import { useMe } from "@/queries/me";
import { useLikedIds, useToggleLikeById } from "@/queries/catalog";

/** Heart + share icons for any track surface. Standalone (no ui.tsx import) to avoid cycles. */
export function LikeShare({ trackId, title, likes, size = 16 }: { trackId: number; title: string; likes?: number; size?: number }) {
  const c = useColors();
  const { signedIn } = useMe();
  const ids = useLikedIds(signedIn);
  const toggle = useToggleLikeById();
  const liked = !!ids.data?.includes(trackId);
  const share = async () => {
    const url = `${API_URL}/track/${trackId}`;
    try {
      await Share.share({ message: `${title} on Earbass — ${url}`, url, title });
    } catch {
      /* dismissed */
    }
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable
        hitSlop={8}
        accessibilityLabel={liked ? "Unlike" : "Like"}
        onPress={() => (signedIn ? toggle.mutate(trackId) : router.push("/sign-in"))}
        style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
      >
        <Ionicons name={liked ? "heart" : "heart-outline"} size={size} color={liked ? c.primary : c.mutedForeground} />
        {likes !== undefined ? <Text style={{ color: c.mutedForeground, fontFamily: Fonts.body, fontSize: 12 }}>{likes}</Text> : null}
      </Pressable>
      <Pressable hitSlop={8} accessibilityLabel="Share" onPress={() => void share()}>
        <Ionicons name="share-social-outline" size={size} color={c.mutedForeground} />
      </Pressable>
    </View>
  );
}
