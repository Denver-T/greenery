# Changelog

A working log of what changed and why. The lessons-learned notes are the most
valuable section — they're how the project gets smarter over time.

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
