# Mobile Design Standards (React Native / Expo)

## Platform
App must feel native on both iOS and Android — not a web app in a shell.
Follow iOS HIG + Android Material Design 3. Test both before calling anything done.
Platform differences: `Platform.select()`. Avoid sprawling `Platform.OS === 'ios'` blocks.

## Safe Areas & Layout
`useSafeAreaInsets()` on every screen. Never hardcode status bar height or notch padding.
No interactive elements behind: status bar, home indicator, notch, gesture nav bar.
`KeyboardAvoidingView` on every screen with inputs: `behavior="padding"` iOS, `behavior="height"` Android.
`ScrollView keyboardDismissMode="on-drag"` for scroll containers with inputs.

## Touch & Gestures
Minimum touch target: **44×44pt**. Use `hitSlop` if visual element is smaller.
Every tap: instant visual feedback within one frame (opacity/scale/highlight).
`react-native-gesture-handler` for all custom gestures. Never `PanResponder`.
`react-native-reanimated` for all animations. Never the legacy `Animated` API.
Support iOS swipe-to-go-back. Handle Android hardware back button.

## Navigation
Bottom tabs: primary nav (max 5 items). Top tabs: secondary content switching.
Stack: drill-down flows. Modals: focused tasks only — not primary navigation.
Deep linking configured for every primary route.
Android back button behavior must work correctly everywhere.

## Typography
`allowFontScaling={true}` on all Text — never disable it.
Test at largest Dynamic Type (iOS) and largest font scale (Android).
Body minimum: 16sp/pt. Labels minimum: 13sp/pt. Never below 12sp/pt.

## Color & Dark Mode
Every screen supports light and dark mode. Required.
All colors from theme tokens — never inline in StyleSheet.
Use tokens from `design/tokens.md` adapted for React Native.
`useColorScheme()` for system preference. `StatusBar` style adapts to theme.

## Contrast
All text must meet WCAG AA minimums:
- Body text: 4.5:1 against background
- Large text (18sp+ or 14sp+ bold): 3:1
- UI elements and icons: 3:1
Verify contrast for both light and dark mode separately.
`opacity` on text is not a substitute for a properly contrasted muted token.

## Animation & Haptics
All performant animations: `react-native-reanimated` on the UI thread.
Haptics (Expo Haptics):
- Light impact: list item taps, tab switches
- Medium impact: confirmations, successful submissions
- Heavy impact: destructive actions, critical errors
- Success/Warning/Error notifications for async outcomes
- Never trigger haptics on passive events or more than once per action

## Lists
`FlashList` for lists > ~20 items. `FlatList` fallback. Never `ScrollView` for dynamic lists.
`keyExtractor`: stable unique ID, never array index.
Pull-to-refresh on all data lists. Infinite scroll with `onEndReached` + loading footer.

## Forms
Set `keyboardType`, `textContentType`, `returnKeyType`, `autoCapitalize` on every `TextInput`.
Auto-advance focus to next field on submit. Last field: `returnKeyType="done"`.
Inline validation on blur. Show errors on submit.

## Accessibility
Every interactive element: `accessible={true}` + `accessibilityLabel` + `accessibilityRole`.
`accessibilityState` for checked/selected/disabled.
`accessibilityViewIsModal={true}` on modals.
Test VoiceOver (iOS) and TalkBack (Android) before shipping any new screen.

## Performance
60fps. Profile with React Native DevTools before shipping new screens.
`expo-image` over built-in `Image`. `FlashList` over `FlatList`.
No StyleSheet objects created inside render functions.
Audit bundle size with `expo-bundle-visualizer` before major releases.

---

## Per-Screen / Per-Component Checklist

Run this for every screen and component before marking it complete.

### Tokens & Values
- [ ] All colors use theme tokens — zero inline hex or rgb values in StyleSheet
- [ ] All spacing uses values from the spacing scale in `design/tokens.md`
- [ ] No arbitrary spacing (e.g. `padding: 13` — use `space-3` = 12 or `space-4` = 16)
- [ ] Font sizes use the defined type scale

### Contrast
- [ ] Body text passes 4.5:1 on light mode background
- [ ] Body text passes 4.5:1 on dark mode background
- [ ] Muted/secondary text passes 4.5:1 (do not assume `opacity: 0.6` is sufficient)
- [ ] Icons and UI elements pass 3:1
- [ ] Disabled state is visually distinct

### Layout & Safe Areas
- [ ] `useSafeAreaInsets()` applied on this screen
- [ ] No content hidden behind status bar, notch, or home indicator
- [ ] `KeyboardAvoidingView` used if screen has inputs
- [ ] Tested on small screen (iPhone SE equivalent)
- [ ] Tested on large screen (iPhone Pro Max equivalent)

### Touch
- [ ] All touch targets are minimum 44×44pt
- [ ] `hitSlop` added where visual size is smaller than 44×44pt
- [ ] Every tap has instant visual feedback (opacity/scale change)
- [ ] Custom gestures use `react-native-gesture-handler`

### Typography
- [ ] `allowFontScaling={true}` on all Text components
- [ ] Body text minimum 16sp/pt
- [ ] Labels minimum 13sp/pt
- [ ] No text below 12sp/pt

### Dark Mode
- [ ] Screen renders correctly in light mode
- [ ] Screen renders correctly in dark mode
- [ ] No hardcoded colors that only work in one mode
- [ ] StatusBar style adapts to theme

### States
- [ ] Loading state implemented for async data
- [ ] Empty state implemented for lists and data-dependent screens
- [ ] Error state implemented with recovery action
- [ ] Pull-to-refresh on lists

### Accessibility
- [ ] `accessible={true}` on all interactive elements
- [ ] `accessibilityLabel` describes the action, not just the visual
- [ ] `accessibilityRole` set correctly
- [ ] `accessibilityState` set for checked/selected/disabled
- [ ] Modals have `accessibilityViewIsModal={true}`

### AI Slop Check
- [ ] No generic list item with icon + title + chevron as the only pattern
- [ ] No default blue/gray navigation bar with no personality
- [ ] Colors feel intentional — not just system defaults
- [ ] Spacing feels considered — not just default StyleSheet values

---

## Common React Native AI Slop Patterns — Flag and Fix These

| Pattern | Why It's Wrong | Fix |
|---|---|---|
| `color: '#333333'` in StyleSheet | Hardcoded, breaks dark mode | Use theme token |
| `padding: 10` | Off-scale spacing | Use `space-2` (8) or `space-3` (12) |
| `fontSize: 14` on body | Below 16sp minimum | Use type scale token |
| `opacity: 0.5` on text | Likely fails 4.5:1 contrast | Use a proper muted color token |
| `Animated` API | Legacy, JS thread | Use `react-native-reanimated` |
| `ScrollView` for long lists | Performance | Use `FlashList` |
| `PanResponder` | Legacy gesture API | Use `react-native-gesture-handler` |
| No `hitSlop` on small icons | Touch target too small | Add `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` |
| `allowFontScaling={false}` | Breaks accessibility | Remove — always allow font scaling |
| No dark mode tokens | Broken in dark mode | Define all colors in theme with dark overrides |
