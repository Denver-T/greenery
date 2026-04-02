// Shared mobile design tokens
// ---------------------------
// Mobile screens should import from this file instead of redefining one-off greens, grays,
// or spacing values. Keeping the palette centralized makes cross-screen polish easier and
// reduces the risk of the UI drifting back into inconsistent styles.

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
