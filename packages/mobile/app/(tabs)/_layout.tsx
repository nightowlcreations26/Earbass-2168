import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { Fonts, GRADIENT } from "@/constants/theme";
import { MiniPlayer } from "@/components/mini-player";
import type { IconName } from "@/components/ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS: Record<string, { on: IconName; off: IconName; label: string }> = {
  index: { on: "home", off: "home-outline", label: "Home" },
  studio: { on: "grid", off: "grid-outline", label: "Studio" },
  upload: { on: "add", off: "add", label: "Upload" },
  ranks: { on: "trophy", off: "trophy-outline", label: "Ranks" },
  library: { on: "person", off: "person-outline", label: "Library" },
};

function EarTabBar({ state, navigateToTab }: TabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.background, paddingTop: 6 }}>
      <MiniPlayer />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.background,
        }}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = ICONS[route.name];
          if (!meta) return null;
          const onPress = () => {
            if (!focused) navigateToTab(route.key);
          };
          if (route.name === "upload") {
            return (
              <Pressable key={route.key} onPress={onPress} accessibilityLabel="Upload" style={{ marginTop: -22 }}>
                <LinearGradient
                  colors={GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: c.background, shadowColor: c.primary, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}
                >
                  <Ionicons name="add" size={28} color="#fff" />
                </LinearGradient>
              </Pressable>
            );
          }
          return (
            <Pressable key={route.key} onPress={onPress} style={{ alignItems: "center", gap: 3, minWidth: 56, paddingVertical: 4 }}>
              <Ionicons name={focused ? meta.on : meta.off} size={22} color={focused ? c.primary : c.mutedForeground} />
              <Text style={{ fontSize: 10, fontFamily: focused ? Fonts.semibold : Fonts.medium, color: focused ? c.primary : c.mutedForeground }}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <EarTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "#0B0A0F" } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="studio" />
      <Tabs.Screen name="upload" />
      <Tabs.Screen name="ranks" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
