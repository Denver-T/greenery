# Web Design Standards

## Typography
Never use as primary typeface: Inter, Roboto, Open Sans, Lato, Arial, system fonts.

By aesthetic:
- **Technical**: JetBrains Mono, Space Grotesk, IBM Plex Sans/Mono
- **Editorial**: Playfair Display, Crimson Pro, Fraunces, Newsreader
- **Bold/Startup**: Clash Display, Satoshi, Cabinet Grotesk, Bricolage Grotesque
- **Premium**: Cormorant Garamond, DM Serif Display

Pairing: high contrast = interesting. Display serif + geometric sans. Monospace + humanist sans.
Weight extremes: 100/200 vs 800/900 — not 400 vs 600. Size jumps 3×+, not 1.5×.
Body: minimum 16px, line-height 1.5–1.7. Headings: line-height 1.05–1.2.
Load via `next/font`. No external CDN links.

---

## Color System
All colors as CSS custom properties — use tokens from `design/tokens.md`.
Never hardcode hex values in components. Never.
Contrast: 4.5:1 body text, 3:1 large text and UI elements (WCAG AA).
Color must never be the only means of conveying information.
Dark mode: override every semantic token in `[data-theme="dark"]` — not just background and text.

---

## Layout & Spacing
Mobile-first. Base styles for mobile, `@media (min-width: ...)` to enhance up.
Use only spacing values from `design/tokens.md` spacing scale.
Never invent spacing values — if it doesn't fit the scale, question the design.
`rem` for font sizes. `px` for borders/shadows. `%` / `fr` / `clamp()` for layout.
Max content width: 1200–1440px layouts, 680–720px prose.

---

## Backgrounds
Never default to solid white or black — create atmosphere.
Layer CSS gradients with `mix-blend-mode`. Subtle grain/noise for tactility.
Match background treatment to the aesthetic. Don't mix warm textures with cold tech accents.

---

## Components

Every interactive element requires all five states. No exceptions:
- default
- hover
- focus (visible, WCAG-compliant — never `outline: none` without replacement)
- active
- disabled (visually distinct, `cursor: not-allowed`)

Every async operation requires all three states. No exceptions:
- loading (skeleton for content areas, spinner for action feedback)
- empty (illustration/icon + helpful message + CTA)
- error (plain-language explanation + recovery action)

---

## Animation
CSS transitions for state changes. Use `transition-property` specifically — never `transition: all`.
Motion (Framer Motion) for complex sequences, gestures, physics.
One orchestrated page-load entrance > scattered micro-interactions everywhere.
Use timing and easing values from `design/tokens.md`.

Always ship this:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Accessibility
Semantic HTML required: `<button>`, `<nav>`, `<main>`, `<header>`, `<section>` — not `<div>` for everything.
All images: descriptive `alt`. Decorative: `alt=""`.
All inputs: associated `<label>`. Placeholder text is not a label.
Keyboard navigable end-to-end. Logical tab order.
ARIA only when semantic HTML is insufficient.

---

## Per-Component Checklist

Run this checklist for every UI component before marking it complete.
This is not optional. Do not skip items.

### Tokens & Values
- [ ] All colors use CSS variables from `design/tokens.md` — zero hardcoded hex values
- [ ] All spacing uses values from the spacing scale — zero arbitrary values (e.g. `padding: 13px`)
- [ ] All font sizes use the type scale — no arbitrary sizes
- [ ] Border radius uses defined radius tokens
- [ ] Shadows use defined shadow tokens

### Contrast
- [ ] Body text passes 4.5:1 contrast against its background
- [ ] Large text (18px+ regular or 14px+ bold) passes 3:1
- [ ] Interactive elements (buttons, inputs, icons) pass 3:1
- [ ] Placeholder text passes 3:1 (not just aesthetically dimmed)
- [ ] Disabled state is visually distinct but does not need to pass contrast
- [ ] Dark mode contrast verified — not just assumed to work

### States
- [ ] Default state implemented
- [ ] Hover state implemented (color shift, not just cursor change)
- [ ] Focus state implemented — visible ring, WCAG-compliant color
- [ ] Active/pressed state implemented
- [ ] Disabled state implemented — visually distinct, non-interactive
- [ ] If async: loading state implemented
- [ ] If async: empty state implemented
- [ ] If async: error state implemented

### Typography
- [ ] Font is from the project's chosen typeface — not a fallback or system font
- [ ] Body text minimum 16px
- [ ] Line height appropriate (1.5–1.7 body, 1.05–1.2 headings)
- [ ] No weight values outside the defined scale

### Layout
- [ ] Mobile layout tested — not just desktop
- [ ] Spacing is consistent with surrounding components
- [ ] No overflow issues on small screens
- [ ] Max-width applied where needed

### Accessibility
- [ ] Semantic HTML element used (not a styled `<div>`)
- [ ] Interactive elements are keyboard accessible
- [ ] Images have descriptive `alt` text
- [ ] Inputs have associated `<label>` elements
- [ ] `aria-label` added where visual label is absent

### AI Slop Check
- [ ] No generic gradient backgrounds (purple-to-blue, blue-to-teal)
- [ ] No generic card with centered icon + heading + subtext
- [ ] No bootstrap-blue or default-purple buttons
- [ ] Aesthetic direction matches the rest of the project
- [ ] `prefers-reduced-motion` handled

---

## Common AI Slop Patterns — Flag and Fix These

| Pattern | Why It's Wrong | Fix |
|---|---|---|
| `color: #333` on white background | Hardcoded, untokenized, often fails contrast | Use `--text-primary` token |
| `padding: 10px 15px` | Off-scale spacing | Use `--space-3` + `--space-4` |
| `font-size: 14px` on body | Below 16px minimum | Use `--text-base` |
| `opacity: 0.6` on text | Likely fails 4.5:1 contrast | Calculate actual ratio, use a proper muted token |
| `transition: all 0.3s` | Causes unexpected transitions | Use `transition-property` specifically |
| `outline: none` | Removes focus visibility | Replace with custom focus ring |
| `Inter` as primary font | AI default, no character | Use a font from the project's chosen pairing |
| Hardcoded `#fff` or `#000` | Breaks dark mode | Use `--bg-base` and `--text-primary` |
| `gap: 20px` | Off-scale spacing | Use `--space-5` (20px is on scale) or closest token |
| `border-radius: 6px` | Off-scale radius | Use `--radius-sm` (4px) or `--radius-md` (8px) |
