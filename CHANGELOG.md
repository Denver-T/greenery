# Changelog

A working log of what changed and why. The lessons-learned notes are the most
valuable section — they're how the project gets smarter over time.

---

## 2026-04-12 — feat: Monday sync outbound + web design token foundation + button system

**Commits:** _pending_ (single large checkpoint covering Phases 2, 2.5, 2.6, 2.7 of the web launch sprint; split into atomic commits on stage)

### What changed

**Phase 2 — API: Monday.com outbound sync + retry queue**
- New migration `004_monday_sync_up.sql` / `004_monday_sync_down.sql`:
  - Adds `work_reqs.monday_item_id VARCHAR(32)` + `monday_synced_at TIMESTAMP` + index on `monday_item_id`.
  - Creates `monday_sync_queue` (id PK, work_req_id FK ON DELETE SET NULL, operation ENUM, payload JSON, attempts, last_error, next_attempt_at, timestamps) + indexes.
  - Creates `work_req_sequences` (year PK, next_seq, updated_at). **No pre-seed row** — see the first lesson below.
- New `src/services/reqSequenceService.js` — atomic `INSERT ... ON DUPLICATE KEY UPDATE next_seq = LAST_INSERT_ID(next_seq + 1)` for `WR-YYYY-NNNN` reference numbers. **Explicitly pulls a pooled connection and runs both queries on it** — the bare `db.query()` shortcut uses separate pool connections and would have broken the session-local `LAST_INSERT_ID()` contract. See the second lesson below.
- New `src/lib/env.js` — Zod schema covering every env var the API reads. Validated at first import, throws with a structured message on misconfiguration. `server.js` and `src/db/index.js` migrated to read from it; Firebase config still reads directly (deferred).
- New `src/lib/mondayClient.js` — GraphQL wrapper around `api.monday.com/v2`. `createItem`, `updateItem`, `deleteItem`, and the low-level `call()` helper. Sends `Authorization` + `API-Version: 2024-10` headers. Unit tests mock `global.fetch`.
- New `src/lib/mondayColumnValues.js` — `toMondayColumnValues(workReq)` / `fromMondayColumnValues(columns)` / `fromWebhookPayload(event)`. 19-field mapping mirrored from `.agents/monday-board-map.md`. Round-trip test verifies light-mode bidirectionality.
- New `src/services/mondaySyncService.js` — `pushCreate`/`pushUpdate`/`pushDelete` (fire-and-forget from route handlers via IIFE wrapper) + `enqueue` + `drainQueue` (called by the worker). Exponential backoff (30s → 2min → 10min → 1hr), dead after 10 attempts.
- New `src/workers/mondaySyncWorker.js` — `setInterval(30s)` drain worker with an in-flight guard so overlapping ticks skip. Started from `server.js` after `app.listen`. Skips cleanly when Monday env is not configured.
- Modified `src/routes/reqs.js`:
  - POST generates a server-side reference number via `nextReferenceNumber()` (was client-timestamped `REQ-...`), inserts, then fires `mondaySyncService.pushCreate` in an IIFE.
  - PUT and DELETE fire `pushUpdate` / `pushDelete` in IIFE after their DB mutations. DELETE fetches the row BEFORE deleting so it has the `monday_item_id` for the sync call.
  - GET list now returns both `REQ-*` and `WR-*` rows and includes `monday_item_id` + `monday_synced_at` in the select columns. (The `REQ-%` LIKE filter on the legacy query was removed.)
  - `getReqById` rewritten to enumerate columns explicitly (no `SELECT *`).
- Modified `src/middleware/errorHandler.js` — wire shape flipped from flat `{status, code, message, details, timestamp}` to nested `{error: {code, message, details}, timestamp}` per the Monday plan's committed decision. All existing tests that asserted on the flat shape were updated to match.
- Modified `apps/web/src/lib/api/api.js` — `fetchApi` error-extraction handles **both** the new nested shape (from the updated errorHandler) and the legacy flat `{error: "string"}` shape (from 14+ existing `res.status().json({error: "..."})` direct-return paths in reqs.js/schedule.js/employeesController.js). Strings fall through to be treated as raw error messages. Third lesson below.
- `apps/api/package.json` — added `zod@^4.3.6`, `jsonwebtoken@^9.0.3`.

**Phase 2.5 — Web: design token foundation**
- `apps/web/src/app/globals.css` — major restructure, purely additive for existing code.
  - `:root` and `.dark` keep only theme-variant values. Added semantic colors (`--success`/`--success-soft`, `--warning`/`--warning-soft`, `--danger`/`--danger-soft`/`--danger-border`, `--info`/`--info-soft`) mirrored exactly from `apps/mobile/theme.js` COLORS / COLORS_DARK. Also added `--fg-primary`/`--fg-soft`/`--fg-on-brand` — prefixed `fg-` specifically to avoid collision with Tailwind v4's `--text-*` font-size namespace.
  - `@theme inline` extended with: the semantic color aliases (`--color-success: var(--success)` etc. — which means `bg-success`, `text-danger-soft`, etc. respond to dark-mode automatically via the `:root`/`.dark` cascade); the full canonical spacing scale `--spacing-0` through `--spacing-32`; the type scale `--text-xs` through `--text-6xl`; leading tokens; radius scale `--radius-sm` through `--radius-full` (with `--radius-lg` aliasing the legacy `--radius-card`); shadow scale; motion durations; easings. Everything generates matching Tailwind utilities on demand.
  - Light-tint hex-escape aliases (`--surface-warm`, `--surface-warm-alt`, `--badge-green`) moved out of `@theme inline` and into the `:root`/`.dark` cascade so they have proper dark-mode values. This fixed the "Generated Reference" card on `/req` which was rendering as a cream island in dark mode with invisible near-white text.
  - `--brand-700` in dark mode changed from `#d7c8a2` (cream) to `#3d5a30` (darker forest) — decision D1. Dashboard `ActionCard` "Open queue" button was appearing cream-on-dark (read as disabled) because the brand token flipped to a warm gold accent in dark mode that only worked for text, not button fills.
  - `.dark .theme-button` hardcoded `#6f8fc7` (cold blue, left over from an earlier dark-mode attempt) removed. `.theme-button` now cascades through the (now-correct) `--brand-700` value.
  - Added `.dark :is(input[type="date"], ...)` block setting `color-scheme: dark` so native date picker UI honors the theme in browsers that don't cascade the `html.dark` scheme property to inputs.
- `.claude/design/tokens.md` flipped from "aspirational" to "canonical" — new "Canonical sources" header identifies `globals.css` + `apps/mobile/theme.js` as runtime sources of truth. Section labels updated throughout. **Not committed** per `.claude/`-is-private rule.
- `.claude/design/web.md` checklist now references `apps/web/src/app/globals.css` instead of `design/tokens.md`. **Not committed.**

**Phase 2.6 — Web: design + UX audit and Fix-now punch list**
- Ran `/design-review` and `/ux-review` in sequence. Produced a triaged punch list of 9 Fix-now items + 3 deferred classes of issues (full-file `text-gray-*`/`bg-white` migration, cold→warm dark palette rework, full a11y audit — all flagged for post-launch plans).
- Two product decisions locked:
  - Phase 3 will build `/req/[id]` as dedicated routes. `/tasks` modal detail view will migrate to `router.push('/req/${id}')` on row click, and the in-page modal code will be deleted during Phase 3.
  - `--brand-700` dark mode stays forest green (decision D1 above).
- New `apps/web/src/components/Button.js` — shared Button component, forwardRef, primary/secondary/ghost/danger variants. sm/md/lg sizes. Built-in `loading` spinner state (sets `aria-busy`). Renders as `<Link>` when `href` is provided and not disabled, otherwise `<button>`. `clsx` imported properly (now a direct dependency, not transitive).
- Migrated four high-visibility surfaces to the new Button: dashboard `ActionCard` ("Open queue" etc.), employees `createEmployee`/`refresh`, assigntasks `assignTasks`, req `Cancel`/`Submit`.
- Replaced hardcoded `border-emerald-400 bg-emerald-50/60 ring-emerald-300/40` on the assigntasks employee selection cards with `border-brand-700 bg-success-soft ring-brand-700/40`. Added `aria-pressed={active}` and explicit `focus-visible` ring for keyboard a11y.
- Fixed the employee-card text wrapping in assigntasks — "Denver - Administrator - 0 active" was wrapping awkwardly on narrow `sm:grid-cols-2` cards. Now role and active count are on separate truncated lines, initials badge uses `bg-surface` (not `bg-white`), and the name column has `flex-1` + `min-w-0` to allow proper truncation.
- Removed the dead notification bell from `TopBar.js`. The button had a "1 new notification" badge but no onClick handler — known tech debt from an earlier session because the backend notifications service was never implemented. A comment remains in place so a future re-implementation is obvious.
- Added a form abandonment guard to `/req`: `formDirty` state tracked via `onInput` on the form, `beforeunload` listener warns on browser close/refresh when dirty, Cancel button confirms before discarding. Cleared before successful submit navigation.

**Phase 2.7 — Review-driven fixes (this session's final pass)**
- **C1 (critical):** `reqSequenceService.js` was calling `db.query()` twice in sequence — once for the upsert and once for `SELECT LAST_INSERT_ID()`. Because `db.query()` is a shortcut for pool `getConnection → query → release`, the two calls could land on DIFFERENT connections in the mysql2 pool. `LAST_INSERT_ID()` is session-local, so reading it on a different connection returned 0 or stale state, silently breaking the uniqueness guarantee for WR numbers. **Rewritten to explicitly `db.getConnection()` once, run both queries on that connection, and `release()` in `finally`.** The test suite was also updated to mock `getConnection` returning independent mock connections per call — simulating the pool behavior so the 20-concurrent-call test is now meaningful instead of passing for the wrong reason.
- **C2 (critical):** Migration 004's `INSERT INTO work_req_sequences (year, next_seq) VALUES (YEAR(NOW()), 1)` pre-seed defeated the fresh-insert path in the service. First `nextReferenceNumber()` call of the year always hit the `ON DUPLICATE KEY UPDATE` branch (incrementing 1 → 2), so the first visible WR of the year was `WR-2026-0002` and slot 0001 was permanently skipped. Pre-seed line removed. Dev DB `work_req_sequences` row truncated so the next call really starts at 0001.
- **I1 (important):** `fetchApi` error extraction. Phase 2's errorHandler shape change flipped the wire format from `{error: "string"}` flat to `{error: {code, message, details}}` nested, and I updated `fetchApi` to do `payload?.error?.message`. But 14+ routes still use the legacy direct-return pattern `res.status(400).json({error: "string"})` which bypasses the global errorHandler entirely. Result: users saw "HTTP Error 400" instead of the actual validation messages. Fixed by making `fetchApi` try both shapes: if `typeof payload.error === "string"`, use it directly; otherwise try `payload.error.message` / `payload.message`.
- **I2 (important):** `clsx` was being imported into `Button.js` without being declared in `apps/web/package.json`. It was present only as a transitive dependency (via recharts/next). If a future `npm install` dropped the transitive chain, the Button component would break silently. Now a direct dependency. The existing local `function clsx(...xs)` in `assigntasks/page.js` can stay — it's harmless co-existing with the real module.
- **I3 (important):** Button `secondary` variant was using `text-brand-700` for text, which in dark mode resolves to `#3d5a30` on a dark `--background` — contrast ratio ~1.9:1, failing WCAG AA (needs 4.5:1 for body, 3:1 for UI). Switched to `text-foreground` so the text stays theme-aware and high-contrast in both modes. Border stays `border-brand-700` so the button still reads as "brand-aligned".

### Why

**The Friday 2026-04-17 web launch demo is the forcing function.** Monday.com bidirectional sync is the headline deliverable (it eliminates the pen-and-paper → JotForm → Monday.com workflow the real company currently uses). Without outbound sync working end-to-end, there's no demo story. Phase 2 was the biggest chunk of that plan.

Phase 2.5 was scoped in mid-session after a user request for a "source of truth for styling." Scoping the problem revealed ~227 token violations across 18 of 41 web files, but the audit separated *fixing components* (deferred to `web-token-sweep.md` post-launch) from *establishing the token infrastructure itself* (doable in a few hours, unblocks Phase 3 UI work). The split was important — interleaving a 16-file migration with sprint work before a public demo was too risky. This phase is purely additive and leaves all existing code working.

Phase 2.6 was triggered by the user manually walking dark mode after Phase 2.5 and immediately hitting contrast issues. Rather than fixing them one-at-a-time, we ran `/design-review` and `/ux-review` in sequence to produce a punch list. The review found the button color inconsistency was systemic — three competing button styles across five pages, no shared component, `.dark .theme-button` hardcoded a cold blue, and `--brand-700` dark mode was a cream that made primary buttons look ghosted. Building a shared `<Button>` component first and then migrating the critical surfaces (instead of incremental whack-a-mole) was the right lever.

Phase 2.7 was triggered by the first formal `/review` of the session. The review caught a real connection-pool race condition (C1) that would have generated duplicate reference numbers in production, and an off-by-one in the migration pre-seed (C2) that would have made the first demo work request appear as `WR-2026-0002`. Both are now fixed, plus three important issues (I1–I3).

### Scope notes

- **Phase 3 (work request list/detail/edit UI)** is the natural next step but was deliberately NOT started in this session. All decisions needed to execute it are now locked: `Button` component exists, semantic tokens are canonical, `/req/[id]` is the committed route shape, `--brand-700` dark is `#3d5a30`.
- `apps/api/scripts/monday-introspect.js`, `monday-provision-board.js`, `seed-demo-data.js`, `clean-demo-data.js` were created in the prior session and carried into this session's work. They ARE committable (unlike `.agents/*`) and should ride along in the commit.
- The existing `tasks/page.js` modal detail view is intentionally left in place for this commit. It will be deleted during Phase 3 when `/req/[id]` ships — the detail view surface migrates from in-page modal to a route. Until then, the modal continues working normally.
- The `text-gray-*` / `bg-white` band-aid block in `globals.css:147–203` is intentionally left untouched. Removing it is `web-token-sweep.md`'s job after the 18 affected component files migrate.
- **Monday dark-mode cold/warm drift** (`--background: #181a1f` is cold gray vs. mobile's `parchment: #1A1F18` warm dark forest) is still present. That's `web-dark-rework.md` territory, out of scope for this sprint.
- Monday Phase 4 (inbound webhook + loop prevention), Phase 5 (admin endpoint + backfill), and Phase 6 (integration tests + perf) are still pending — days 3–5 of the sprint schedule.

### Validation

- `cd apps/api && npm run lint` — 0 errors (baseline preserved)
- `cd apps/api && npm test` — **243/243** across 21 suites (211 baseline + 32 new: sequence service, env, monday client, column values, sync service)
- `cd apps/web && npm run lint` — 0 errors, 4 pre-existing warnings (same baseline)
- `cd apps/web && npm test` — **29/29** across 8 suites (unchanged; no test changes this session)
- `cd apps/web && npm run build` — clean production build
- Migration `004_monday_sync_up.sql` + `004_monday_sync_down.sql` — up → down → up cycles cleanly on the dev MySQL container
- Manual verification: API server boots clean, `mondaySyncWorker.start()` logs and takes the interval, env validation throws on missing required vars with structured messages
- Token system: probe file with every new utility class was compiled against the build output — all 23 classes resolved correctly, including `bg-success`, `text-danger`, `rounded-lg`, `shadow-md`, `p-4`, `gap-6`, `leading-relaxed`
- Visual regression walk-through of dark mode uncovered the contrast issues that became Phase 2.6; Phase 2.7 fixes re-validated via lint/test/build

### Lessons learned

- **Never rely on `db.query()` shortcut for multi-query atomic operations.** mysql2's `pool.query()` is a checkout → query → release shortcut that DOES NOT pin a connection across calls. Anything that depends on session-local state (`LAST_INSERT_ID()`, session variables, user-defined variables, temporary tables) MUST go through `db.getConnection()` → `conn.query()` → `conn.release()` in a `finally`. This was the C1 critical bug in `reqSequenceService` — the test was mocking `db.query` with `jest.fn()` which doesn't model connection pooling, so the bug was invisible to unit tests. **Writing the test to simulate `getConnection` returning independent mock connections** (as it now does) is the minimum viable reproduction of production pool behavior.
- **Don't pre-seed sequence tables unless the service code expects it.** The migration pre-seed `INSERT (YEAR(NOW()), 1)` was added "to make the atomic upsert simpler" but actively broke the `row.seq === 0 ? 1 : row.seq` branch in the service that handles the fresh-insert case. The first work request of the year silently started at 0002. **Test the first-of-year path against an empty sequence table**, not just against pre-seeded state, or the bug hides behind a symptomless mock.
- **Changing an error wire shape has a blast radius you don't see until fetchApi runs against real legacy routes.** Phase 2's errorHandler refactor updated both the errorHandler and fetchApi at the same time, but MANY routes use `res.status(400).json({error: "string"})` direct-returns that bypass the error middleware. Those routes were returning the "legacy" shape the entire time, and the new fetchApi couldn't extract a message from them — so users saw "HTTP Error 400" instead of "Invalid id" or "Account is required". **When changing an error shape contract, the client must accept both shapes during the migration window** (which may be forever if the legacy routes never get refactored). Belt-and-suspenders error extraction is cheap.
- **Tailwind v4 `@theme inline` is not interchangeable with `:root`.** `--text-*` is Tailwind v4's font-size namespace. Putting `--text-primary: #223126` in `:root` does NOT create a `text-primary` color utility — it either silently does nothing or corrupts the size scale. Color tokens that need to be theme-aware must live in `:root`/`.dark` under non-prefixed names (e.g. `--fg-primary`) and then be aliased into `@theme inline` as `--color-fg-primary: var(--fg-primary)`. Tokens that don't vary by theme (spacing, type, radius, shadow, motion) can live directly in `@theme inline`.
- **Semantic color tokens must have dark-mode values that preserve the semantic role.** `--brand-700` dark was set to `#d7c8a2` (cream/gold) to achieve a warm accent look. That's fine for text highlights but breaks when the token is used as a button FILL — cream-on-dark reads as "disabled". When a token is overloaded (text color, border color, button fill), its dark-mode value must work for every role, not just the prettiest one. Decision D1 restored forest green because button fills have higher visibility requirements than decorative highlights.
- **Review cadence matters.** This session piled three phases of work on top of each other before running `/review`. The review found 2 critical bugs that should have been caught at the Phase 2 → Phase 2.5 boundary. Going forward: **run `/review` at every phase boundary, before commit.** Not every file edit, not once per day — once per "this is a commit-sized chunk" checkpoint. The cost of the review is trivial compared to finding a connection-pool race three phases later.
- **`clsx` is a transitive dep trap.** Many Next.js projects pull in `clsx` via recharts, tailwind-merge, or next itself — so `import clsx from "clsx"` works WITHOUT declaring it. Until the transitive chain changes and the imports silently break. **If a component uses `clsx`, declare it as a direct dep.** `assigntasks/page.js` inlines its own local function as a workaround — the new Button.js takes the proper route.
- **Token renaming requires the probe-file approach for verification.** Tailwind v4 JIT only compiles utilities that are actually used in source files. When adding new tokens, the production build output shows nothing different until a component uses them. To verify tokens are actually reachable as utilities, write a throwaway file that uses every new class (`bg-success`, `text-danger-soft`, `rounded-lg`, etc.), build, grep the CSS output, then delete the probe. (I created `_token-probe.tsx` briefly during Phase 2.5 — Next.js auto-generated a `tsconfig.json` because of the `.tsx` extension, which then conflicted with the existing `jsconfig.json`'s `@/*` path mapping. Lesson within a lesson: **in an all-JavaScript Next.js project, never create even a temporary `.tsx` file.**)
- **The review skill's punch-list framing is more valuable than its pass/fail verdict.** Phase 2.6 ran `/design-review` and `/ux-review` consecutively, then manually consolidated the findings into a Fix-now / Fix-during-Phase-3 / Defer triage. That triage was more useful than "review failed, N violations found" — it told us which issues blocked the next phase, which ones would be absorbed naturally, and which were genuinely post-launch. Keep the habit: after any audit skill run, produce a triage, not just a list.

---

## 2026-04-10 — refactor(web): lift AppShell into (app) route group

**Commits:** `4934461` (scaffolding + dashboard proof), `31efa67` (remaining 8 pages)

### What changed
- Created `apps/web/src/lib/routes.js` with a `ROUTES` map + `getTopBarTitle(pathname)` helper. Single source of truth for per-route top-bar titles. Includes a prefix-collision guard (the `"+ '/'"` suffix prevents `/req` from matching `/reqs`).
- Created `apps/web/src/app/(app)/layout.js` — client component that calls `usePathname()`, resolves the title via `getTopBarTitle()`, and wraps children in `<AppShell title={title}>`. This is the persistent shell instance.
- Moved 9 authenticated page directories from `apps/web/src/app/*` into `apps/web/src/app/(app)/*` via `git mv`: dashboard, tasks, req, calendar, assigntasks, employees, inventory, profile, superadmin. Two co-located page tests (employees, inventory) rode along.
- Removed the per-page `<AppShell title="...">` wrapper and import from all 9 pages. Pages now return their content directly. The login page at `app/page.js` stays at the root, outside the route group, so it does NOT inherit the shell.
- Profile had a relative import `../lib/firebaseClient` that broke after the move (path depth changed). Fixed to use the `@/app/lib/firebaseClient` alias already used elsewhere in the codebase.
- Stripped unnecessary single-child fragment wrappers from 6 pages (tasks, calendar, assigntasks, employees, superadmin, profile — both loading and main branches) via an awk dedent. Kept the fragment wrappers on dashboard (multi-child conditional), req (two top-level sections), and inventory (section + sibling conditional block).
- Added 8 new tests: 6 in `routes.test.js` (all 9 routes + fallback + nested path + prefix collision guard), 2 in `(app)/layout.test.js` (title resolution + fallback via mocked `usePathname`). Suite went from 21 → 29 across 8 files.
- IDE auto-formatter ran on several moved files during the session (tasks, calendar, assigntasks, dashboard, profile, superadmin), producing line-wrapping changes that are mixed into the refactor diff. No behavioral impact; pure style normalization.

### Why
- The original per-page `<AppShell>` pattern meant every navigation unmounted and remounted the entire shell tree: Sidebar, TopBar, MobileNavDrawer, TopBarUserMenu all tore down and re-created. Each remount fired its own `onAuthStateChanged` listener and its own `/auth/me` fetch, producing 3 concurrent shell-level requests per navigation (desktop `Sidebar` + drawer `Sidebar` inside `MobileNavDrawer` + `TopBarUserMenu`). Users saw a brief flicker on every nav click; theme state re-initialized from localStorage each time.
- After the lift, `(app)/layout.js` mounts `<AppShell>` **once per session**. Navigating between `/dashboard`, `/tasks`, `/req`, etc. now only swaps `children` — the shell, its auth listeners, its theme state, and its drawer state all persist. Shell-level `/auth/me` calls drop from `3 × nav count` to `3 × 1` per session.

### Scope notes
- 4 page-level `/auth/me` fetchers (`employees/page.js:340`, `superadmin/page.js:57`, `calendar/page.js:253`, `req/page.js:58`) are **orthogonal to this refactor** and still fire on every visit to those pages. Collapsing them into a shared `useCurrentUser` hook (or finally wiring the dead `AuthProvider.js`) is the natural follow-up.
- `Sidebar.js` still hardcodes its own `baseSections` array instead of consuming the new `ROUTES` map. The `sidebarLabel` field was included in `ROUTES` to give a future Sidebar refactor an obvious hook — do not delete it.

### Validation
- `cd apps/web && npm run lint` — 0 errors, 4 pre-existing warnings (same baseline)
- `cd apps/web && npm test` — **29/29** across 8 suites (21 baseline + 8 new)
- `cd apps/web && npm run build` — clean production build, all 14 routes discovered (9 authenticated + `/` + `/api/req` + `/_not-found` + 2 static)
- Dev-server curl matrix: every authenticated route returns HTTP 200 with the correct per-route top-bar title in the server-rendered HTML, and every route has exactly 1 `Control Center` (sidebar) + 1 `Greenery Operations` (topbar) + 1 `Live Workspace` (topbar badge). Login page at `/` has **zero** shell markers, confirming the route group boundary works.
- Manual browser matrix (zero flicker + exactly 3 shell-level `/auth/me` per session + matrix total of 7): **deferred to Denver** — requires a real browser with Firebase auth and DevTools Network tab; not automatable via curl.

### Lessons learned
- **`(app)` parens MUST be double-quoted in every shell command.** Unquoted `apps/web/src/app/(app)/dashboard` is a bash/zsh syntax error (parens start a subshell). Every `git mv`, `ls`, `mkdir`, and path reference in a shell pipeline needs quotes. An early draft of the plan said "should always quote" — that understated it. Corrected during plan review before execution; zero failures during /execute as a result.
- **Rename + modify + auto-format can drop git's rename similarity below 50%.** Two files (`assigntasks`, `superadmin`) had enough IDE auto-format churn that `git log --follow` no longer stitches them to their pre-move history at the default threshold. Workaround: `git log --follow --find-renames=30% -- <path>`. Not a bug — a consequence of combining structural refactors with style passes in the same commit. Next time: do a style-only pass BEFORE the structural refactor (or after, in a separate commit) so the rename detection stays clean.
- **`helmet({contentSecurityPolicy: false})` does NOT remove an existing CSP header** (carried over from last session). Still true.
- **Plan-review caught a load-bearing error before /execute ran.** The first draft of the plan claimed "2 total `/auth/me` calls per session" as a pass criterion, but the real shell count is 3 (I'd forgotten that `MobileNavDrawer` always mounts its own Sidebar instance in the React tree regardless of viewport, because `md:hidden` is CSS-only). The review caught it, and the plan was patched before execute ran — avoiding a false-fail on the manual nav matrix. The workflow discipline (plan → review the plan → execute) paid for itself again.
- **IDE format-on-save is invisible friction during refactors.** Several files got auto-formatted during the session without explicit action. The result is cleaner code but a noisier diff that mixes style with substance. Long-term answer: either commit a `.prettierrc` + run it as a pre-commit hook (so formatting is uniform and never mid-session), or disable format-on-save during refactor sessions. Current state: works, but every large refactor will have this noise.
- **When a single-child fragment strip requires subtree dedent, use awk with range matching.** Dedenting hundreds of lines across 7 files via individual Edit calls would have been error-prone and slow. A 6-line awk script with `in_main` state + `sub(/^  /, "")` did it in one pass. Kept for reference.

---

## 2026-04-10 — feat(api): security hardening (helmet, CORS, env validation, params)

**Commit:** `db59ab4`

### What changed
- Added helmet for baseline security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc).
- Removed CSP only on `/api-docs` via a `res.removeHeader` middleware so swagger-ui's inline scripts can execute.
- Locked CORS to a `CORS_ORIGINS` allowlist with `403 CORS_ORIGIN_DENIED` rejection (no wildcard).
- Validated required DB env vars (`DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`) at module load — fail-fast at startup.
- Created `apps/api/.env.example` with placeholders for all required env vars.
- Validated `:id` in `schedule.js` PUT and DELETE via the existing `toPositiveInt` helper.
- Replaced three `console.error` lines in `authMiddleware.js` with a single structured log line: ISO timestamp, 8-char request id, method, path, error code, error message.
- 27 new tests across 4 files. Suite went from 184 → 211 passing across 17 files.

### Why
- Closes 5 critical 🔴 + 1 medium 🟡 findings from the API security audit (2026-04-09).
- Sets the baseline for production hardening before the validation-layer and test-coverage plans land.

### Lessons learned
- **Test the mechanism, not the symptom.** The original Swagger CSP fix shipped through `/execute` and `/reflect` because the test only checked the response body for `swagger-ui` text, not the actual CSP header. The bug — `helmet({ contentSecurityPolicy: false })` does not remove a CSP header that the global helmet already set — was caught only in `/review` when a header-level assertion was added. **Rule:** when testing middleware behavior, assert on headers (the mechanism), not on downstream content (the symptom). A passing test on the wrong layer is worse than no test.
- **Structured logs prove their value on the first real failure.** The new `[auth] <ts> req=<id> <method> <path> — <code>: <msg>` format made it possible to scan 21 lines and instantly see "every request is dying with ECONNREFUSED 127.0.0.1:3307" when MySQL was down. The previous three-lines-per-failure `console.error` format would have been 63 un-correlated lines for the same incident.
- **Always patch the plan with concrete code, not "remember to verify."** During the first `/review` of the plan, the Swagger UI risk was flagged in NOTES with "Document this for /reflect to verify." That deferral was the seed of the bug. Patching the plan to require an actual test case + browser smoke would have caught it in `/execute`.
- **Restart the dev server after touching middleware composition.** The earlier "404 on login" wasn't a regression — it was MySQL not being started. But it took two minutes of investigation to rule out the hardening code as the cause. **Rule:** when manual smoke fails after a middleware-touching change, the first action is to confirm the dev server actually restarted and the dependencies (DB, etc.) are up.
- **`helmet({ contentSecurityPolicy: false })` does NOT remove an existing CSP header.** It only stops the CSP module from running. To actually disable CSP on a subroute when a global helmet is already set, you need to call `res.removeHeader("Content-Security-Policy")` explicitly in a middleware that runs before the route handler. Documented in the comment block above the `/api-docs` mount in `app.js`.
- **The plan-`/review`-on-the-plan step caught two issues that would have wasted execute cycles:** the comprehensive secret-leak scan and the missing CORS substring-match test. Don't skip plan review even on "small" plans.
- **Pre-existing tech debt surfaced for follow-up:** the auth middleware's catch block currently swallows ALL inner errors and returns 401, including DB connection failures (ECONNREFUSED). The errorHandler already has a 503 `DATABASE_UNAVAILABLE` path for DB-class errors but the auth middleware never reaches it. Out of scope for this PR — flagged as `api-auth-error-classification` for a future plan.
