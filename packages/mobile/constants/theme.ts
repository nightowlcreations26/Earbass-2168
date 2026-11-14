import { Platform } from "react-native";

/**
 * Earbass brand tokens — dark-first (the app always renders dark).
 * Mirrors packages/web/src/web/styles.css.
 */
const dark = {
  background: "#0B0A0F",
  foreground: "#F7F4FA",
  card: "#16141C",
  cardForeground: "#F7F4FA",
  surface2: "#1F1C27",
  primary: "#FF3DA5",
  primaryForeground: "#FFFFFF",
  magenta: "#C026D3",
  blush: "#FFB3DA",
  lime: "#C6FF3D",
  secondary: "#1F1C27",
  secondaryForeground: "#F7F4FA",
  muted: "#1F1C27",
  mutedForeground: "#9C97A8",
  dim: "#6B6677",
  accent: "#2A2633",
  accentForeground: "#F7F4FA",
  border: "rgba(255,255,255,0.07)",
  destructive: "#F87171",
  success: "#C6FF3D",
  warning: "#FBBF24",
};

export const Colors = { light: dark, dark } as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = typeof dark;

export const GRADIENT = ["#FF3DA5", "#C026D3"] as const;
export const GRADIENT_SOFT = ["#FFD1E8", "#FF8AC6"] as const;

/** Loaded in app/_layout.tsx via useFonts. */
export const Fonts = {
  display: "Unbounded_700Bold",
  displayBlack: "Unbounded_800ExtraBold",
  body: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
};

export const GENRES = [
  { id: "edm", label: "EDM", icon: "flash" },
  { id: "techno", label: "Techno", icon: "disc" },
  { id: "dnb", label: "DnB", icon: "pulse" },
  { id: "melodic", label: "Melodic", icon: "sparkles" },
  { id: "mextech", label: "Mextech", icon: "flame" },
  { id: "house", label: "House", icon: "musical-notes" },
  { id: "night-bass", label: "Night Bass", icon: "moon" },
  { id: "bass-boosted", label: "Bass Boosted", icon: "volume-high" },
  { id: "breakbeats", label: "Breakbeats", icon: "water" },
] as const;
export type GenreId = (typeof GENRES)[number]["id"];

export const PLATFORMS = [
  { key: "spotify", label: "Spotify", color: "#1DB954", icon: "musical-note" },
  { key: "soundcloud", label: "SoundCloud", color: "#FF5500", icon: "cloud" },
  { key: "appleMusic", label: "Apple Music", color: "#FA243C", icon: "logo-apple" },
  { key: "youtube", label: "YouTube", color: "#FF0000", icon: "logo-youtube" },
  { key: "suno", label: "Suno", color: "#F7F4FA", icon: "sparkles" },
  { key: "udio", label: "Udio", color: "#C6FF3D", icon: "planet" },
  { key: "bandcamp", label: "Bandcamp", color: "#1DA0C3", icon: "albums" },
] as const;
