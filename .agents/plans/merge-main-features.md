# Feature: Merge origin/main Feature Work into Denver Branch

Read the context references and validate patterns before starting.
Pay attention to naming, imports, and existing utilities — don't reinvent what exists.

## Feature Description

Merge 4 inbound commits from `origin/main` (Matt's `matt-deluxe` branch + PR #69 merge) into the Denver branch. The API changes merge cleanly. The web app has 14 conflicting files because both branches did heavy work on the same pages.

**Strategy**: Merge with `--strategy-option ours` for web conflicts to preserve Denver's design system as the base, then systematically integrate Matt's functional additions into Denver's pages.

## User Story
As the development team
I want Matt's functional features (plant CRUD, calendar custom events, employee enhancements, assignment UX, req auto-fill, dark mode, input sanitization) integrated into Denver's design system
So that the branch is up to date with main and all features work with the current token/component architecture

## Feature Metadata
- **Type**: Enhancement (merge integration)
- **Complexity**: High
- **Systems Affected**: apps/web (14 files), apps/api (clean merge, no manual work)
- **Dependencies**: multer (already in Matt's API changes), Google Maps Places API key (optional)

---

## Standards & Design Constraints

### Testing
- No test suite exists. Manual validation only.
- Verify each page loads, renders data, and CRUD operations work after integration.

### Security
- inputSafety.js is client-side only — profanity filter is UX, not security enforcement
- File upload validation already handled server-side by multer in API
- Google Maps API key must be in env var, never hardcoded

### Performance
- No new performance concerns — Matt's changes are standard CRUD
- Plant image uploads have 5MB server limit already

### Design
- **Denver's design system is the base** — Space Grotesk font, warm green/earth tokens, light-mode-first
- Matt uses `Avenir Next` — we keep Space Grotesk
- Matt's `.theme-*` classes should be adapted to use Denver's CSS custom properties instead of hardcoded hex
- Matt's dark mode variables should use Denver's token naming conventions
- Matt's `.dark [class~="bg-white"]` overrides are brittle — prefer token-based approach where possible
- All new UI must use Denver's existing tokens: `bg-surface`, `text-foreground`, `border-border-soft`, etc.

---

## CONTEXT REFERENCES

### Files to Read Before Implementing

**Denver's current versions (base to preserve):**
- `apps/web/src/app/globals.css` — token system, utilities
- `apps/web/src/app/layout.js` — root layout with Space Grotesk
- `apps/web/src/components/Sidebar.js` — nav structure
- `apps/web/src/components/AppShell.js` — page shell
- `apps/web/src/components/TopBar.js` — header
- `apps/web/src/components/UserChip.js` — user display
- `apps/web/src/components/WorkspaceHeader.js` — page headers
- `apps/web/src/components/WorkspaceToolbar.js` — toolbar pattern
- `apps/web/src/app/inventory/page.js` — current inventory (read-only)
- `apps/web/src/app/calendar/page.js` — current calendar
- `apps/web/src/app/employees/page.js` — current employees
- `apps/web/src/app/assigntasks/page.js` — current assignments
- `apps/web/src/app/dashboard/page.js` — current dashboard
- `apps/web/src/app/req/page.js` — current request form

**Matt's versions on origin/main (features to extract):**
- `git show origin/main:<path>` for each of the above files
- `git show origin/main:apps/web/src/lib/inputSafety.js` — new utility
- `git show origin/main:apps/web/src/components/ThemeToggle.js` — new component

**API changes (auto-merged):**
- `apps/api/src/controllers/plantController.js` — plant CRUD + validation
- `apps/api/src/services/plantService.js` — plant service with image/cost/quantity
- `apps/api/src/routes/plants.js` — multer upload + new routes
- `apps/api/src/routes/schedule.js` — custom events CRUD + audience filtering
- `apps/api/src/services/employeesService.js` — enhanced validation
- `apps/api/db/init/01_schema.sql` — new columns

### New Files to Create
- `apps/web/src/lib/inputSafety.js` — adopted from Matt's version
- `apps/web/src/components/ThemeToggle.js` — adopted from Matt's version

### Patterns to Follow

**Denver's token usage pattern (from existing pages):**
```jsx
// Background/surface
className="bg-surface"
className="bg-surface-muted"
className="bg-background"

// Text
className="text-foreground"
className="text-muted"
className="text-brand-700"

// Borders
className="border-border-soft"

// Brand
className="bg-brand"
className="bg-brand-700"
className="text-brand"

// Accent
className="bg-accent"
className="text-accent"
```

**Denver's page structure pattern:**
```jsx
<AppShell title="Page Title">
  <WorkspaceHeader eyebrow="Section" title="Title" description="..." stats={[...]} />
  <WorkspaceToolbar left={...} right={...} />
  {/* Content sections */}
</AppShell>
```

**Denver's fetch pattern:**
```jsx
const data = await fetchApi("/endpoint", { cache: "no-store" });
```

**Naming Conventions:** camelCase for JS, kebab-case for CSS
**Error Handling:** try/catch with error state display

---

## IMPLEMENTATION PLAN

### Phase 1: Git Merge (API + non-conflicting files)
Merge origin/main into Denver using `ours` strategy for conflicts. This gets all API changes and non-conflicting files in automatically, while preserving Denver's web files.

### Phase 2: New Standalone Files
Add inputSafety.js and ThemeToggle.js from Matt's branch.

### Phase 3: Design Token Integration
Merge globals.css: keep Denver's base tokens + add dark mode support + add theme-* utility classes adapted to use CSS vars.

### Phase 4: Layout & Component Integration
Update layout.js and shared components with Matt's functional additions while keeping Denver's styling.

### Phase 5: Page Feature Integration
For each page with conflicts, integrate Matt's functional features into Denver's version:
- inventory: plant image, cost, full CRUD, quantity grouping
- calendar: custom events, audience filtering, event CRUD
- employees: phone formatting, enhanced validation, tone-based cards
- assigntasks: top employees, due date validation, assignment preview
- dashboard: adopt theme-* classes for consistency
- req: auto-fill tech name, Google Places, input sanitization

### Phase 6: Validation
Lint all apps, verify pages load.

---

## STEP-BY-STEP TASKS

### TASK 1: GIT MERGE — merge origin/main with ours strategy for conflicts
- **IMPLEMENT**: Run `git merge origin/main --strategy-option ours` to merge. This auto-resolves all conflicts by keeping Denver's version. API changes and non-conflicting files merge in.
- **GOTCHA**: After merge, verify API files came through: `git diff HEAD~1 -- apps/api/` should show changes
- **VALIDATE**: `git log --oneline -5` shows merge commit. `git diff HEAD -- apps/api/src/routes/plants.js` confirms API changes present.

### TASK 2: ADD — `apps/web/src/lib/inputSafety.js`
- **IMPLEMENT**: Copy Matt's inputSafety.js from origin/main. This is a new file with no conflict. Contains: sanitizePlainText, sanitizeObjectStrings, isValidEmailAddress, date utilities, profanity filter.
- **PATTERN**: Standalone utility, no Denver-specific patterns to mirror
- **VALIDATE**: File exists and exports are importable

### TASK 3: ADD — `apps/web/src/components/ThemeToggle.js`
- **IMPLEMENT**: Copy Matt's ThemeToggle.js from origin/main. Toggles `.dark` class on document root. Uses localStorage for persistence.
- **GOTCHA**: Denver's globals.css currently has `color-scheme: light` hardcoded. Must update globals to support dark mode for this to work.
- **VALIDATE**: File exists with correct export

### TASK 4: UPDATE — `apps/web/src/app/globals.css`
- **IMPLEMENT**: Keep Denver's existing tokens and utilities as base. Add:
  1. `@custom-variant dark (&:where(.dark, .dark *));` after Tailwind import
  2. `--border-strong: #bcc8b1;` to `:root` (Matt added, Denver missing)
  3. `.dark { }` block with dark mode token overrides — adopt Matt's values as-is for now:
     ```css
     .dark {
       --background: #181a1f;
       --foreground: #ece8de;
       --surface: #23262d;
       --surface-muted: #2d3139;
       --border-soft: #3b4049;
       --border-strong: #4a5160;
       --brand: #8ea77b;
       --brand-700: #d7c8a2;
       --accent: #d79b53;
       --muted: #a6acb6;
     }
     ```
     These are blue-gray toned rather than warm — acceptable for initial dark mode. Palette refinement is a follow-up task, not in scope here.
  4. `html.dark { color-scheme: dark; }` rule
  5. `.dark body { }` with dark background gradients (from Matt's version)
  6. Dark mode form input overrides (from Matt's version)
  7. Matt's `.dark [class~="bg-*"]` overrides — **KNOWN TECH DEBT**: these use `!important` and match Tailwind class strings, which is brittle. Include them because Matt's pages depend on them, but flag for follow-up migration to proper token usage.
  8. `.theme-title`, `.theme-copy`, `.theme-kpi`, `.theme-subcard`, `.theme-panel`, `.theme-panel-muted`, `.theme-tag`, `.theme-button` classes with light and dark variants (from Matt's version). Where possible, use CSS vars instead of hardcoded hex (e.g., `.theme-title { color: var(--brand-700); }` instead of `color: #1f3427;`).
  9. `--color-border-strong: var(--border-strong);` in @theme block
  10. `@media (prefers-reduced-motion: reduce)` block — required by web design standards:
      ```css
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          transition-duration: 0.01ms !important;
        }
      }
      ```
- **GOTCHA**: Keep Denver's `--font-sans: "Space Grotesk"`. Matt changed to Avenir Next — do NOT adopt that.
- **GOTCHA**: Keep Denver's surface variant tokens (`--color-surface-warm`, `--color-surface-warm-alt`, `--color-badge-green`, `--color-border-dashed`, brand variants). Matt dropped these — keep them.
- **GOTCHA**: Matt's `@utility field` uses hardcoded `#111827` instead of `var(--foreground)`. Keep Denver's var-based version.
- **VALIDATE**: `cd apps/web && npm run lint`

### TASK 5: UPDATE — `apps/web/src/app/layout.js`
- **IMPLEMENT**: Keep Denver's Space Grotesk import and font className. Apply these changes from Matt's version:
  1. Add `suppressHydrationWarning` to `<html>` tag — required to prevent React hydration warnings when the inline script adds `.dark` before React hydrates
  2. Add FOUC-prevention inline script as the first child of `<body>`, before `{children}`:
     ```jsx
     <script
       dangerouslySetInnerHTML={{
         __html: `
           (function () {
             try {
               var theme = localStorage.getItem("greenery-theme");
               var isDark = theme === "dark";
               document.documentElement.classList.toggle("dark", isDark);
               document.documentElement.style.colorScheme = isDark ? "dark" : "light";
             } catch (e) {}
           })();
         `,
       }}
     />
     ```
  3. Keep `className={`${spaceGrotesk.className} antialiased`}` on body — Matt removed the font; we keep it
- **GOTCHA**: Without the inline script, dark mode users see a white flash on every page load. Without `suppressHydrationWarning`, React throws hydration mismatch warnings.
- **VALIDATE**: Page loads without console errors. Toggle dark mode, refresh — no white flash.

### TASK 6: UPDATE — `apps/web/src/components/Sidebar.js`
- **IMPLEMENT**: Keep Denver's nav structure and styling. Add Matt's functional changes:
  1. Import `{ auth }` from `@/app/lib/firebaseClient` and `{ onAuthStateChanged }` from `firebase/auth` (verified: `apps/web/src/app/lib/firebaseClient.js` exists on Denver)
  2. Add `normalizeLevel(user)` function: returns `user?.permissionLevel || user?.role || "Technician"`
  3. Add `authUser` state + `useEffect` with `onAuthStateChanged` listener (cleanup on unmount)
  4. Compute `chipName` (currentUser.name → authUser.displayName → email prefix → "Greenery Team"), `chipLevel` (normalizeLevel), `chipPhoto` (authUser.photoURL)
  5. Pass `name={chipName} level={chipLevel} photoURL={chipPhoto}` to UserChip
  6. For dark mode classes: use token-based `dark:bg-background` and `dark:text-foreground` where possible. Only use hardcoded dark hex for gradient-specific values that can't be tokenized (e.g., sidebar gradient).
- **GOTCHA**: Denver's Sidebar already fetches `/auth/me` for currentUser. Matt adds Firebase listener for authUser (photo, displayName). Both are needed — `/auth/me` provides employee data, Firebase provides auth-specific data (photo, display name).
- **VALIDATE**: Sidebar renders with user name, permission level, and photo (if Google OAuth user)

### TASK 7: UPDATE — `apps/web/src/components/AppShell.js`
- **IMPLEMENT**: Add dark mode classes to the two container divs. Use tokens where possible:
  - Outer div: add `dark:bg-background dark:text-foreground` (NOT Matt's `dark:bg-[#191c22] dark:text-[#ece8de]` — the `.dark` block overrides these vars)
  - Inner div: add `dark:bg-[linear-gradient(180deg,#20232a_0%,#191c22_100%)]` (gradient must stay hardcoded — can't tokenize gradient stops)
- **VALIDATE**: Shell renders in both light and dark mode

### TASK 8: UPDATE — `apps/web/src/components/TopBar.js`
- **IMPLEMENT**: Two changes:
  1. Import and add `<ThemeToggle />` in the right-side controls div, before the "Live Workspace" badge
  2. Add dark mode classes using tokens where possible:
     - Header: `dark:border-border-soft dark:bg-surface/90` (token-based, not Matt's `dark:border-white/10 dark:bg-[#23262de0]`)
     - H1: `dark:text-foreground` (not `dark:text-[#f1ece3]`)
     - Live badge: `dark:border-white/10 dark:bg-white/5 dark:text-muted`
     - Notification button: `dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10`
- **VALIDATE**: TopBar renders with theme toggle button. Toggle works.

### TASK 9: UPDATE — `apps/web/src/components/UserChip.js`
- **IMPLEMENT**: Update props and add features:
  1. Accept `{ name, level, photoURL }` instead of just `{ name }`
  2. Increase avatar size from `h-11 w-11` / `grid-cols-[44px_1fr]` to `h-13 w-13` / `grid-cols-[52px_1fr]`
  3. Add photo support: if `photoURL` exists, render `<img>` in avatar; else render initial `<span>`
  4. Replace static "Online" text with `{level || "Technician"}` (shows permission level)
  5. Add `truncate` and `min-w-0` to text container for overflow handling
  6. Dark mode: `dark:bg-white/6 dark:hover:bg-white/10` on link, gradient on avatar fallback
- **VALIDATE**: UserChip shows name, level, and photo in Sidebar

### TASK 10: UPDATE — `apps/web/src/components/WorkspaceHeader.js`
- **IMPLEMENT**: Add dark mode classes to 5 elements. Use tokens where possible:
  - Eyebrow badge: `dark:bg-surface-muted dark:text-accent`
  - Title h2: `dark:text-foreground`
  - Description p: `dark:text-muted`
  - Stats container: `dark:border-border-soft dark:bg-surface`
  - Stat value span: `dark:text-foreground`
- **VALIDATE**: Headers render correctly in both modes

### TASK 11: UPDATE — `apps/web/src/components/WorkspaceToolbar.js`
- **IMPLEMENT**: Add dark mode to toolbar container: `dark:border-border-soft dark:bg-surface`
- **VALIDATE**: Toolbars render in both modes

### TASK 12: UPDATE — `apps/web/src/app/inventory/page.js`
- **APPROACH**: Read Matt's full version via `git show origin/main:apps/web/src/app/inventory/page.js`. Extract these specific features and integrate into Denver's existing page structure:
  1. **Helper functions** to extract from Matt's version:
     - `getPlantImage(plant)` — resolves API base URL + image_url, falls back to placeholder
     - `formatCurrency(value)` — Intl.NumberFormat en-CA CAD
     - Image preview state (`imageFile`, `imagePreview`) + useEffect for URL.createObjectURL
  2. **Create plant form** — extract Matt's form JSX + state + submit handler. Must use FormData for file upload. Wire to POST `/plants`.
  3. **Update plant modal** — extract Matt's edit form + handler. Wire to PUT `/plants/:id`.
  4. **Delete plant flow** — extract confirmation + handler. Wire to DELETE `/plants/:id`.
  5. **Plant card display** — extract Matt's card layout showing image, name, location, cost, quantity. Apply Denver's tokens (`bg-surface`, `border-border-soft`, `text-foreground`).
  6. Import `sanitizePlainText` from `@/lib/inputSafety` for form inputs
- **PATTERN**: Use Denver's WorkspaceHeader, WorkspaceToolbar, token classes. Replace any `theme-panel`/`theme-title` with Denver token equivalents where cleaner.
- **GOTCHA**: Image upload uses FormData with fetchApi — fetchApi handles this (skips JSON Content-Type for FormData).
- **VALIDATE**: Page loads, shows plants with images/cost, create/edit/delete all work

### TASK 13: UPDATE — `apps/web/src/app/calendar/page.js`
- **APPROACH**: Read Matt's full version via `git show origin/main:apps/web/src/app/calendar/page.js`. Extract these specific features:
  1. **Permission state** — extract `currentUser` fetch (GET `/auth/me`) and `isAdmin` derivation. Denver's calendar doesn't currently fetch user data.
  2. **Custom event modal** — extract the entire modal component/JSX block including:
     - `emptyEventForm` default object
     - Modal state (`showModal`, `editingEvent`)
     - `validateCustomEventPayload()` or equivalent form validation
     - Submit handler for POST `/schedule` (create) and PUT `/schedule/:id` (update)
  3. **Delete handler** — extract DELETE `/schedule/:id` with confirmation
  4. **Event type badge** — extract visual differentiation for "request" vs "custom" events in the day agenda
  5. **Audience level filter** — extract dropdown (admin-only) that filters visible events
  6. **"Create Event" button** — admin-only, opens modal. Place in WorkspaceToolbar or header actions.
- **PATTERN**: Use Denver's calendar layout/styling as base. Modal styling should use `bg-surface`, `border-border-soft`, `text-foreground`.
- **GOTCHA**: Schedule API now returns `event_type`, `audience_level`, `details`, `created_by_email` — update any field references in event display.
- **GOTCHA**: Non-admin users see read-only calendar with no create/edit/delete controls.
- **VALIDATE**: Calendar loads. Technician sees events, no edit controls. Admin sees events + create/edit/delete.

### TASK 14: UPDATE — `apps/web/src/app/employees/page.js`
- **APPROACH**: Denver already has full employee CRUD. This is enhancement only. Read Matt's version via `git show origin/main:apps/web/src/app/employees/page.js` and extract:
  1. **`formatPhoneNumber(value)`** — extract this function. Auto-formats input to `xxx-xxx-xxxx` on change. Wire to phone input's onChange.
  2. **`getEmployeeTone(employee)`** — extract this function. Returns tone string based on role/status: inactive→gray, admin→emerald, manager→amber, default. Use for card border/background styling.
  3. **Permission level normalization** — extract `normalizeLevel()` if different from Sidebar's version.
- **PATTERN**: Keep Denver's existing CRUD, form, and card structure. Layer in the phone formatter and tone-based styling.
- **GOTCHA**: Keep Denver's existing validation limits (30 char name, 45 char email) — they're more permissive and already in production. Only add the phone format validation (new).
- **VALIDATE**: Employee page loads, CRUD works, phone auto-formats to xxx-xxx-xxxx, cards show role-based border colors

### TASK 15: UPDATE — `apps/web/src/app/assigntasks/page.js`
- **APPROACH**: Read Matt's full version via `git show origin/main:apps/web/src/app/assigntasks/page.js`. This is a significant layout change. Extract:
  1. **Helper functions**:
     - `getEmployeeInitials(name)` — first letter of first 2 name parts
     - `validateDueDateRange()` import from `@/lib/inputSafety`
     - `getTodayDateInputValue()`, `getMaxDueDateInputValue()` imports from `@/lib/inputSafety`
  2. **Two-column layout** — extract the `xl:grid-cols-[380px_1fr]` grid structure: sticky left command panel + scrollable right task list. Apply to Denver's page, replacing current single-column layout.
  3. **Top employees cards** — extract the derived `topEmployees` (sorted by task count, limit 4) + card JSX with initials avatars. Place in the command panel.
  4. **Assignment preview card** — extract the preview block showing selected count, employee, due date, first 3 task titles + "X more".
  5. **Due date validation** — extract `dueDateError` state + validation on change using `validateDueDateRange()`.
  6. **Enhanced task cards** — extract reference number badge, due date badge, status pill styling.
  7. **Selection metrics** — extract "X selected / X in view / X ready" display.
- **PATTERN**: Use Denver's WorkspaceHeader + tokens. Apply `bg-surface`, `border-border-soft` etc. to new layout sections.
- **VALIDATE**: Page loads, employee quick-select works, due date validates, assignment preview shows, bulk assign succeeds

### TASK 16: UPDATE — `apps/web/src/app/dashboard/page.js`
- **APPROACH**: Read the diff via `git diff HEAD...origin/main -- apps/web/src/app/dashboard/page.js`. Changes are styling-only — no new features or data. Apply Matt's theme token classes to Denver's version:
  1. Replace `text-[#1f3427]` with `theme-title` class on headings
  2. Replace `text-gray-600` with `theme-copy` class on body text
  3. Apply `theme-kpi` class to KPI value elements
  4. Apply `theme-button` class to CTA buttons
  5. Apply `theme-panel` / `theme-subcard` to card components
- **PATTERN**: Denver's dashboard is already well-structured. This is styling alignment only.
- **VALIDATE**: Dashboard loads with all KPIs, cards, and visualizations. Dark mode renders correctly.

### TASK 17: UPDATE — `apps/web/src/app/req/page.js`
- **APPROACH**: Read Matt's full version via `git show origin/main:apps/web/src/app/req/page.js`. Extract these specific features into Denver's existing form:
  1. **Tech name auto-fill** — extract `currentEmployeeName` state + useEffect fetching GET `/auth/me` on mount. Make `techName` field read-only and pre-populated.
  2. **Request date auto-set** — extract `getTodayDateInputValue()` import and set `requestDate` to today as read-only field.
  3. **REQ_LIMITS config** — extract the limits object defining maxLength per field. Apply as `maxLength` attributes on corresponding inputs.
  4. **Input sanitization** — extract `sanitizeObjectStrings()` call before form submission with field-specific config.
  5. **Google Places autocomplete** — extract the entire Google Maps integration block:
     - `useRef` for `accountAddressRef`
     - `useEffect` that injects Google Maps script (conditional on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
     - Autocomplete listener setup + cleanup
     - Must degrade gracefully when env var is missing
  6. **Theme class adoption** — apply `theme-panel`, `theme-tag` etc. where Matt used them, or substitute Denver token equivalents.
- **GOTCHA**: Google Maps script injection needs cleanup on unmount to prevent memory leaks.
- **GOTCHA**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var is optional — form must work without it.
- **VALIDATE**: Form loads, tech name auto-fills, date is read-only, maxLength enforced, form submits. If Google API key set, address autocomplete works.

### TASK 18: VERIFY — `apps/web/src/app/tasks/page.js` (auto-merged)
- **IMPLEMENT**: This file auto-merged cleanly (no conflict). Matt added `useRouter`/`usePathname` imports and URL cleanup logic that removes the `?open=` param when closing a task detail. Spot-check that the merge applied correctly — read the file and confirm the new imports and the `closeDetail` function changes are present.
- **VALIDATE**: Tasks page loads, opening and closing a task detail works.

### TASK 19: LINT ALL APPS
- **IMPLEMENT**: Run lint across all three apps
- **VALIDATE**: `cd apps/api && npm run lint && cd ../web && npm run lint && cd ../mobile && npm run lint`

---

## TESTING STRATEGY

### Unit Tests
No test suite exists. Skip.

### Integration Tests
No test suite exists. Skip.

### Manual Validation
For each page after integration:
1. Page loads without console errors
2. Data fetches and displays correctly
3. New CRUD operations work (create, edit, delete)
4. Forms validate correctly
5. Permission-based features show/hide appropriately
6. Dark mode toggle works across all pages
7. Mobile responsive layout is intact

### Edge Cases
- Inventory: plant with no image, plant with no cost, quantity > 1
- Calendar: non-admin user cannot see create/edit/delete controls
- Employees: phone number partial input, max length enforcement
- Assignments: due date in the past (should be rejected), no employee selected
- Req: Google Maps API key missing (should degrade gracefully)

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
cd apps/api && npm run lint
cd apps/web && npm run lint
cd apps/mobile && npm run lint
```

### Level 2: Build Check
```bash
cd apps/web && npm run build
```

### Level 3: Manual Validation
1. Start API: `cd apps/api && npm run dev`
2. Start web: `cd apps/web && npm run dev`
3. Walk through each page and verify features per manual validation list above

---

## ACCEPTANCE CRITERIA
- [ ] origin/main fully merged into Denver branch
- [ ] All API changes present and functional
- [ ] inputSafety.js and ThemeToggle.js added
- [ ] globals.css has dark mode tokens and theme-* classes
- [ ] All 14 conflicting pages/components have Matt's functional features integrated
- [ ] Denver's design system (Space Grotesk, warm green tokens, component patterns) preserved throughout
- [ ] All lint passes with zero errors
- [ ] Web app builds successfully
- [ ] No regressions in existing functionality

---

## NOTES

### Key Decisions
1. **Font**: Space Grotesk (Denver) wins over Avenir Next (Matt). Design standards are explicit about this.
2. **Token approach**: Denver's CSS var approach is cleaner than Matt's hardcoded hex in theme-* classes. Adapt theme classes to use vars where possible.
3. **Validation limits**: Keep Denver's existing limits (30 char name, 45 char email) unless there's a reason to tighten. Discuss with team.
4. **Dark mode**: Adopting Matt's approach (`.dark` class + localStorage + ThemeToggle) since Denver hasn't implemented dark mode yet. Adapt colors to fit Denver's palette.
5. **inputSafety profanity filter**: Client-side only — acceptable for UX but not a security measure.

### Known Tech Debt (introduced by this merge)
- `.dark [class~="bg-*"]` overrides in globals.css use `!important` and match Tailwind class strings — brittle, should be migrated to token-based approach in follow-up
- Dark mode palette is blue-gray toned (from Matt), not warm earth-toned like Denver's light palette — palette refinement is a future task
- `ensureScheduleColumns()` in schedule.js runs runtime ALTER TABLE on every GET /schedule — should be migrated to run-once-per-boot or removed after all DBs are updated

### Risks
- **Page rewrites may lose subtle Matt features** — mitigated by specifying exact functions/blocks to extract per page
- **Dark mode may look off** if token values aren't carefully tuned for Denver's palette — accepted for now, refinement is follow-up
- **Runtime schema migration** (`ensureScheduleColumns`) in schedule.js may cause issues if DB is in unexpected state
- **Google Maps Places** requires env var — feature degrades gracefully, but must document in README/.env.example

### Execution Order Matters
Tasks 1-4 establish the foundation (merge, new files, tokens). Tasks 5-11 update shared components. Tasks 12-17 update pages. Task 18 spot-checks auto-merged file. Task 19 validates everything. Each page task depends on the token/component work being done first.
