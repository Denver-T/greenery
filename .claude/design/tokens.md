# Design Tokens

> **Mobile canonical source**: For React Native / Expo screens, `apps/mobile/theme.js` is the canonical token source. This file mirrors those values for documentation. The web app does not yet use a token system; the CSS-variable sections below are aspirational and will be filled in when web tokens are implemented.

This file defines the token system for this project.
Claude reads this file during `/execute` and `/design-review` to verify implementation.

---

## Aesthetic Direction

**Chosen direction:** Warm, organic, field-grounded — Greenery's brand voice. Forest greens, parchment surfaces, moss accents.

**Reasoning:** Greenery is an operations platform for plant maintenance teams. The aesthetic deliberately avoids cold/SaaS defaults (purple gradients, grey cards, Inter) in favor of an earthy, intentional palette that connects to the product domain (plants, fieldwork, outdoor environments). The visual language should feel hand-tended, not generic.

---

## Typography

**Primary typeface:** Space Grotesk — used for all weights (regular, medium, bold). Loaded via `@expo-google-fonts/space-grotesk` on mobile and `next/font` on web.

**Secondary typeface:** None — Space Grotesk is used throughout. The weight extremes (regular vs bold) provide hierarchy.

**Mobile font usage** (from `apps/mobile/theme.js`):
```javascript
FONTS = {
  regular: "SpaceGrotesk_400Regular",
  medium:  "SpaceGrotesk_500Medium",
  bold:    "SpaceGrotesk_700Bold",
}
```

**Scale (web — aspirational):**
```css
--text-xs:   0.75rem;   /* 12px — minimum, labels only */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px — body minimum */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */
--text-6xl:  3.75rem;   /* 60px */
```

**Mobile type sizes**: defined per-component in StyleSheet (no central scale yet). Body min 16pt, labels min 13pt per `mobile.md`.

**Line heights (web — aspirational):**
```css
--leading-tight:   1.1;   /* headings */
--leading-snug:    1.3;   /* subheadings */
--leading-normal:  1.5;   /* UI text */
--leading-relaxed: 1.65;  /* body copy */
--leading-loose:   1.8;   /* long-form reading */
```

**Font weights:** 400 (regular), 500 (medium), 700 (bold). Mobile uses these three weights only — the global standards file calls for weight extremes (200/900) but `mobile.md` accepts 400/700 as a practical baseline given the font loading cost on mobile.

---

## Color System

**Mobile canonical palette** (from `apps/mobile/theme.js`):

```javascript
// Light mode (default)
COLORS = {
  // Greens — brand identity
  forest:       "#294733",
  forestDeep:   "#1F3427",
  moss:         "#5F7D4B",
  mossBright:   "#73915B",
  sage:         "#93AB7A",
  sageMist:     "#D9E2CC",

  // Surfaces
  parchment:    "#F4F1E8",
  surface:      "#FFFCF6",
  surfaceMuted: "#F1ECDD",
  surfaceGlass: "rgba(255, 252, 246, 0.96)",
  surfaceHero:  "rgba(255, 252, 246, 0.9)",
  border:       "#D4DCC6",

  // Text
  textPrimary:    "#223126",  // ~13:1 on surface
  textMuted:      "#617060",  // ~5.3:1 on surface (passes AA, thin margin)
  textSoft:       "#8A9486",
  textOnBrand:    "#F7F8F3",
  textHeroSub:    "rgba(247, 248, 243, 0.82)",
  textHeroMuted:  "rgba(247, 248, 243, 0.74)",
  textHeroLabel:  "rgba(247, 248, 243, 0.86)",

  // Accents
  accent:       "#C98B45",   // warm earthen orange
  accentSoft:   "#F3E0C7",

  // Semantic
  success:      "#2F7D4E",
  successSoft:  "#DDF1E4",
  warning:      "#A8771E",
  warningSoft:  "#F7E7BF",
  danger:       "#B5463C",
  dangerSoft:   "#F4DEDA",
  dangerBorder: "rgba(181, 70, 60, 0.2)",
  info:         "#3E6E79",
  infoSoft:     "#DDECF0",

  // Misc
  tint:         "rgba(31, 52, 39, 0.24)",
  overlay:      "rgba(244, 241, 232, 0.18)",
  shadow:       "#122117",
  gray100:      "#E6EBDD",
}
```

### Mobile Dark Palette

A minimal dark palette is defined in `apps/mobile/theme.js` as `COLORS_DARK`, accessed via the `useTheme()` hook. It currently covers the tokens used by the Settings screen (the first dark-mode-aware screen). Other screens continue to use the static light `COLORS` export until they migrate to `useTheme()`.

Dark palette key pairings (verified for WCAG AA):
- `textPrimary (#F1ECDD)` on `surface (#1E241B)` → ≥7:1
- `textMuted (#B8C3AC)` on `surface (#1E241B)` → ≥4.5:1
- `danger (#E07268)` on `surface (#1E241B)` → ≥3:1 (UI element)

### Semantic Token Mapping (web — aspirational)

When the web app adopts a token system, map mobile values to CSS variables:
```css
:root {
  --bg-base:        #FFFCF6; /* mobile: surface */
  --bg-subtle:      #F1ECDD; /* mobile: surfaceMuted */
  --bg-muted:       #F4F1E8; /* mobile: parchment */
  --text-primary:   #223126; /* mobile: textPrimary */
  --text-muted:     #617060; /* mobile: textMuted */
  --border-default: #D4DCC6; /* mobile: border */
  --color-success:  #2F7D4E;
  --color-warning:  #A8771E;
  --color-error:    #B5463C;
  --color-info:     #3E6E79;
  --color-accent:   #C98B45;
  --color-primary:  #294733; /* mobile: forest */
}
```

---

## Spacing Scale

> **KNOWN DEVIATION**: The mobile app uses an off-canonical spacing scale (`6/10/14/18/24` instead of the standards-recommended `4/8/12/16/20/24`). This is existing tech debt that predates the design-token system. Migrating it requires touching every screen and is tracked as a separate future plan: `mobile-spacing-scale-migration` (not yet planned). Until migration, mobile screens use the existing `theme.js` `SPACING` values.

**Mobile spacing (from `apps/mobile/theme.js` — current):**
```javascript
SPACING = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
}
```

**Web spacing (aspirational — canonical scale):**
```css
:root {
  --space-0:   0px;
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;
  --space-16:  64px;
  --space-20:  80px;
  --space-24:  96px;
  --space-32:  128px;
}
```

**Spacing philosophy:** Generous and airy on hero sections; tight and efficient inside data-dense surfaces (lists, dashboards). Settings screens lean airy.

---

## Border Radius

> **KNOWN DEVIATION**: Mobile radius scale (`10/14/18`) is also off-canonical (standards: `4/8/12/16`). Same migration story as spacing.

**Mobile radii (from `apps/mobile/theme.js` — current):**
```javascript
RADII = {
  sm:   10,
  md:   14,
  lg:   18,
  pill: 999,
}
```

**Web radii (aspirational — canonical scale):**
```css
:root {
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;
}
```

**Radius philosophy:** Soft to rounded — every surface is at least `sm` (10px on mobile, 4px on web). Pills used for badges and avatars. No sharp corners.

---

## Shadows

Mobile uses `shadowColor: COLORS.shadow` with platform-default `shadowOffset` / `shadowOpacity` per component. No central shadow scale yet on mobile.

**Web (aspirational):**
```css
:root {
  --shadow-sm:    0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:    0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg:    0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl:    0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
}
```

---

## Motion

**Motion philosophy:** Snappy and immediate. State changes happen fast (< 200ms). Page transitions breathe slightly more (250–350ms). No bouncy springs except for playful micro-interactions.

**Mobile**: Defined per-component until a motion system is built. Use `react-native-reanimated` on the UI thread for any new animations.

**Web (aspirational):**
```css
:root {
  --duration-instant: 50ms;
  --duration-fast:    150ms;  /* micro-interactions */
  --duration-normal:  250ms;  /* state changes */
  --duration-slow:    350ms;  /* layout changes */
  --duration-page:    500ms;  /* page transitions */

  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);
  --ease-inout:  cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Contrast Requirements

All text must meet these minimums. Verify before shipping any component.

| Text Type | Minimum Ratio | WCAG Level |
|---|---|---|
| Body text | 4.5:1 | AA |
| Large text (18px+ or 14px+ bold) | 3:1 | AA |
| UI components and icons | 3:1 | AA |
| Decorative / disabled | No requirement | — |
| Enhanced target | 7:1 | AAA |

**How to check:**
- Browser DevTools → Accessibility → Color Contrast
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Known thin margins:**
- `textMuted (#617060)` on `surface (#FFFCF6)` ≈ 5.3:1 — passes AA but only by ~0.8. Worth widening if any future palette tightening is planned.

---

## Breakpoints

```css
/* Mobile first */
--bp-sm:  640px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1280px;
--bp-2xl: 1536px;
```

---

## Claude Usage Notes

When implementing UI, Claude must:
1. Read this file before writing any component
2. Use only tokens defined here — for mobile, this means importing from `apps/mobile/theme.js`; for web, currently use Tailwind utility classes that approximate these values until web tokens are formalized
3. Flag any gap in the token system rather than inventing values
4. Verify contrast ratios for any new color pairing
5. Use spacing values from the appropriate scale (mobile current, web canonical)
