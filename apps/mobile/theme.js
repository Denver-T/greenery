// Shared mobile design tokens
// ---------------------------
// Mobile screens should import from this file instead of redefining one-off greens, grays,
// or spacing values. Keeping the palette centralized makes cross-screen polish easier and
// reduces the risk of the UI drifting back into inconsistent styles.

import { useColorScheme } from "react-native";

export const COLORS = {
  forest: "#294733",
  forestDeep: "#1F3427",
  moss: "#5F7D4B",
  mossBright: "#73915B",
  sage: "#93AB7A",
  sageMist: "#D9E2CC",
  parchment: "#F4F1E8",
  surface: "#FFFCF6",
  surfaceMuted: "#F1ECDD",
  surfaceGlass: "rgba(255, 252, 246, 0.96)",
  surfaceHero: "rgba(255, 252, 246, 0.9)",
  border: "#D4DCC6",
  textPrimary: "#223126",
  textMuted: "#617060",
  textSoft: "#8A9486",
  textOnBrand: "#F7F8F3",
  textHeroSub: "rgba(247, 248, 243, 0.82)",
  textHeroMuted: "rgba(247, 248, 243, 0.74)",
  textHeroLabel: "rgba(247, 248, 243, 0.86)",
  accent: "#C98B45",
  accentSoft: "#F3E0C7",
  success: "#2F7D4E",
  successSoft: "#DDF1E4",
  warning: "#A8771E",
  warningSoft: "#F7E7BF",
  danger: "#B5463C",
  dangerSoft: "#F4DEDA",
  dangerBorder: "rgba(181, 70, 60, 0.2)",
  info: "#3E6E79",
  infoSoft: "#DDECF0",
  tint: "rgba(31, 52, 39, 0.24)",
  overlay: "rgba(244, 241, 232, 0.18)",
  shadow: "#122117",
  gray100: "#E6EBDD",
};

export const FONTS = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  bold: "SpaceGrotesk_700Bold",
};

export const RADII = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
};

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

// Minimal dark palette covering tokens used by SettingsPage.
// Other screens continue to import the static COLORS export and remain
// light-only until each screen migrates to useTheme().
const COLORS_DARK = {
  forest: "#1F3427",
  forestDeep: "#142019",
  moss: "#8DA86F",
  mossBright: "#9CB97D",
  sage: "#A8BF8C",
  sageMist: "#3A4A33",
  parchment: "#1A1F18",
  surface: "#1E241B",
  surfaceMuted: "#262D22",
  surfaceGlass: "rgba(30, 36, 27, 0.96)",
  surfaceHero: "rgba(30, 36, 27, 0.9)",
  border: "#3A4A33",
  textPrimary: "#F1ECDD",
  textMuted: "#B8C3AC", // verified ≥4.5:1 against #1E241B
  textSoft: "#9CA890",
  textOnBrand: "#F7F8F3",
  textHeroSub: "rgba(247, 248, 243, 0.82)",
  textHeroMuted: "rgba(247, 248, 243, 0.74)",
  textHeroLabel: "rgba(247, 248, 243, 0.86)",
  accent: "#E0A867",
  accentSoft: "#3A2D1A",
  success: "#5BAF73",
  successSoft: "#1F3327",
  warning: "#D9A04A",
  warningSoft: "#3A2E18",
  danger: "#E07268",
  dangerSoft: "#3A1F1C",
  dangerBorder: "rgba(224, 114, 104, 0.35)",
  info: "#6FA0AB",
  infoSoft: "#1B2D32",
  tint: "rgba(241, 236, 221, 0.18)",
  overlay: "rgba(20, 32, 25, 0.6)",
  shadow: "#000000",
  gray100: "#2A3325",
};

/**
 * Hook returning the active palette + token bundle based on system color scheme.
 * Use this on screens that have been audited for dark-mode support.
 * Other screens may continue importing the static COLORS export — this is the
 * incremental migration path.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return {
    COLORS: isDark ? COLORS_DARK : COLORS,
    FONTS,
    RADII,
    SPACING,
    isDark,
  };
}
