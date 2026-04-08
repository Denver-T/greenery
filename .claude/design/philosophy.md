# Design Philosophy

## The Core Problem: AI Slop
LLMs converge toward statistically average outputs. In UI: Inter font, purple-to-blue gradients on white, flat gray cards, generic SaaS dashboard layouts. Arbitrary spacing values. Contrast ratios that are never verified. Colors hardcoded instead of tokenized.

Every design decision must feel intentional and specific to the project.

---

## Before Writing a Single Component

**Do these four things first. In order. No skipping.**

1. **Commit to an aesthetic direction.** Pick one and state it explicitly.
   Examples: editorial brutalism, warm consumer, cold technical, premium minimal, playful, dense data-heavy.

2. **Choose a font pairing.** State it before writing any code.
   See `web.md` or `mobile.md` for options by aesthetic. High contrast pairings work best.

3. **Fill in `design/tokens.md`.** Define the full color system, spacing scale, type scale, and motion rules as CSS variables before touching components. Every component must use these tokens — no exceptions.

4. **Define motion rules.** Snappy and immediate, or does it breathe? Stick to that decision throughout.

Once these four are done, every component decision has a reference point. Without them, Claude will fill the gaps with AI defaults.

---

## Making the Positive Choice

**Ask: what is this product about?**
- A tool for developers → monospace, precision, density, dark-mode-first
- A consumer app → warmth, rounded forms, generous whitespace, approachable type
- A creative or editorial product → expressive type, unexpected layout, textured backgrounds
- A data-heavy dashboard → information hierarchy, tight spacing, muted palette with sharp accent highlights

**Then make three decisions before writing any code:**
1. Typeface pairing (see `web.md` or `mobile.md`)
2. Primary color + accent — something with character, not a default
3. Spacing philosophy — generous and airy vs. dense and efficient

---

## The Contrast and Spacing Problem

These are the two most common ways AI slop gets through:

**Contrast:** Claude will use `opacity: 0.6` or `color: #999` thinking it looks "muted and elegant." It almost always fails 4.5:1. The fix is a proper token system where muted colors are pre-calculated to pass contrast, not eyeballed.

**Spacing:** Claude will use `padding: 10px`, `gap: 13px`, `margin: 7px` — values that feel reasonable but aren't on any scale. The fix is a strict spacing scale in `design/tokens.md` and a rule that no other values are allowed.

Both problems are solved at the token level, not the component level. Fill in `design/tokens.md` first.

---

## Anti-Patterns to Never Reproduce
- Purple gradient hero on white background
- Bootstrap-default blue buttons
- Gray placeholder cards with centered text
- Every section: identical padding + centered headline + subtext + CTA button
- Dark mode that's just `background: #1a1a1a; color: white` with no real token system
- Stock photo of people laughing at a laptop
- Hero with ghost button on colored background labeled "Sign up free"
- Inter as the primary typeface
- `opacity: 0.6` as a substitute for a proper muted color token
- Arbitrary spacing values that aren't on the defined scale
- Hardcoded hex colors anywhere in component code
