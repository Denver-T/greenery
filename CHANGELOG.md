# Changelog

A working log of what changed and why. The lessons-learned notes are the most
valuable section — they're how the project gets smarter over time.

---

## 2026-04-14 — feat: Mark Complete + PUT /reqs/:id transaction + auto-close

**Commits:** `786febb` feat(api), `044715e` feat(web)

### What changed

Chunk D (Phase 6) of `work-request-schedule-coupling`. Ships the Mark Complete flow end-to-end plus the load-bearing API refactor underneath it.

**API — PUT /reqs/:id transaction refactor.** Explicit `getConnection → beginTransaction → UPDATE → optional DELETE → commit/rollback/release`, mirroring the DELETE handler from Chunk A. PUT now writes the `status` column (it didn't before — status transitions went through `PATCH /tasks/:id/status` via `taskService`). `VALID_WORK_REQ_STATUSES` is built from `taskService.VALID_STATUSES` with an explicit `.filter((s) => s !== "unassigned")` so the one-way door (only the assign endpoint can un-assign because it also clears the FK) is enforced locally, not transitively via taskService's enum shape.

**API — autoCloseScheduleEvents request-body hook.** When the client opts in AND the status transitions `→ completed`, linked `schedule_events` rows are deleted inside the **same transaction** as the status UPDATE. Rollback of the DELETE reverts the status change. `activityLogger.logActivity('schedule.request.autoclose', ...)` fires post-commit; Monday outbound `pushUpdate` also fires post-commit (outbound HTTP in a DB transaction would stall the pool). The guard is strict equality on `req.body.autoCloseScheduleEvents === true` so a multipart `"true"` string can't silently trigger auto-close — current UI is JSON-only so it doesn't matter today, but the intent is documented.

**API — latent Date-object bug fixed in `buildReqPayload`.** mysql2 returns DATE columns as JS `Date` objects, and the old `normalizeString(existing.requestDate)` path stringified them to `"Tue Apr 14 2026 00:00:00 GMT-0600 (…)"` which MySQL rejected with `Incorrect date value`. The edit form masked this for the entire life of the codebase because that form always resends `body.requestDate`; Mark Complete's partial `{status, autoClose}` payload is the first caller that actually fell through to the `existing.requestDate` branch and would have 500'd on its first click in production. Introduced `toDateOnlyString` helper. Fix bundled with this chunk because Mark Complete depends on it.

**API — new real-DB integration test harness.** `apps/api/src/routes/reqs.integration.test.js` is the first project example of a route-level test that connects to the dev docker-compose MySQL (`127.0.0.1:3307/greenery`), overrides env vars at file top before `require("../db")`, and skips gracefully with a console warning when MySQL is unreachable so `npm test` never fails on a machine without Docker. Four tests: happy path, counter-case, no-transition guard, invalid-enum rollback. This is the reference implementation for future integration tests — previous chunks planned but never shipped one.

**Web — MarkCompleteDialog.** Accessible confirm dialog: `role="dialog"`, `aria-modal`, `aria-labelledby`/`describedby`, focus trap via shared `trapFocus`, Escape close, focus return on unmount, initial focus on Cancel, backdrop dismiss, inline error surface, submit spinner. Unchecked-by-default "Remove scheduled calendar events for this request" checkbox. Submits `{ status: 'completed', autoCloseScheduleEvents }` via JSON PUT.

**Web — /req/[id] wiring.** New "Mark Complete" button leftmost in the actions row (most-common-action-first). Gated by `MARK_COMPLETABLE_STATUSES = new Set(["assigned", "in_progress"])` — hidden on `completed` (no-op), `cancelled` (terminal, shouldn't jump), and `unassigned` (shouldn't skip the assign/in-progress lifecycle in one click). Parent `handleMarkComplete` awaits `load()` **before** unmounting the dialog, so the dialog's submit spinner stays visible through the reload and the page re-renders with fresh status in the same tick the dialog disappears — the reverse ordering caused a stale-state flash in cycle 3. Dialog guards its post-success `setSubmitting(false)` with a `mountedRef` so it cleanly no-ops when the parent has already unmounted it.

### Why

Per the work-request-schedule-coupling plan's Decision D: when a manager marks a request complete via the web UI, they should have a one-click option to clear any linked calendar events in the same write so the calendar doesn't keep showing a completed event as a live appointment. The transaction wrapper is load-bearing — two separate writes without a transaction would leak partial state on a mid-sequence failure, and the operator would have to manually diagnose whether the status changed, whether the events cleared, or both. The `toDateOnlyString` fix is a prerequisite: Mark Complete sends a partial payload, which was the first caller that actually exercised the `existing.requestDate` fallback path and surfaced the latent Date-object bug.

### Lessons learned

- **Review cycles 3 and 4 caught a critical timezone regression that the cycle-2 test did not.** The first cut of `toDateOnlyString` (cycle 2) read `new Date("2026-04-14")` with local getters. ECMAScript parses bare ISO date strings as UTC midnight, so in America/Edmonton (UTC-6/-7) `getDate()` returned 13. The helper silently shifted every requestDate and dueDate backward by one day for POST /reqs (new creation) and PUT edit form (HTML date inputs emit YYYY-MM-DD strings). **The cycle-2 unit test "locked" the regression with a format-only assertion (`^\d{4}-\d{2}-\d{2}$`)** which passes on any shifted value — so the test was green while shipping a live bug. Fix: short-circuit YYYY-MM-DD through a real-date probe (rejects `"2026-02-30"`), only invoke `new Date()` for non-ISO input, use exact-value assertions in the test, and add a dedicated string-path test. Two follow-on lessons: (1) format regex assertions are worse than useless when they replace value assertions — they provide false confidence. (2) When writing a test fixture for "what mysql2 actually emits," verify empirically what mysql2 emits (`new Date(y, m-1, d)` local midnight) instead of guessing (`new Date("2026-04-01T00:00:00Z")` UTC midnight, which hides timezone bugs the test claims to catch).
- **`isValidDateString("2026-02-30")` returns `true`** because V8 silently rolls the date to March 2. Any validator built on `!isNaN(new Date(x).getTime())` is broken for impossible days. The new `toDateOnlyString` probe (`new Date(y, m-1, d)` + post-check on getFullYear/getMonth/getDate) is stricter, which made the old `isValidDateString` branches in `buildReqPayload` dead code — removed in the same commit.
- **Transitive invariants rot.** The cycle-2 comment said "`unassigned` is deliberately absent from the PUT enum" but only worked because `taskService.VALID_STATUSES` happened to not include it. A future dev adding `unassigned` to taskService would silently open the PUT /reqs/:id one-way door. The invariant has to be enforced at the boundary (`.filter((s) => s !== "unassigned")`) with a pinning test, not left as a documented coincidence.
- **Dialog close ordering is subtle.** Closing a modal via `setXOpen(false)` BEFORE the reload finishes gives the user a flash of stale state — the dialog disappears, then a beat later the page re-renders with the new status. Reversing to `await load(); setXOpen(false);` keeps the submit spinner visible through the reload and the two state changes land in the same React tick. Small UX polish but very visible.
- **`<input type="date">` always emits YYYY-MM-DD, but "valid ECMAScript date string" ≠ "string that round-trips through `new Date()` without timezone shift."** This is the core of the regression. Any helper that converts date strings to date strings should short-circuit the trivial case instead of bouncing through `new Date`.
- **Real-DB integration tests belong in the same file tree as unit tests, with env override at file top.** Jest's per-file module registry means `process.env.DB_HOST = "127.0.0.1"` before the first `require("../db")` cleanly redirects that test file's pool to the dev docker-compose instance without touching other tests. The `checkDbAvailable` + `itIfDb` pattern in `reqs.integration.test.js` makes the suite skip gracefully when MySQL isn't running, so `npm test` stays green on CI and on fresh clones. Reference implementation for future integration tests.

---

## 2026-04-14 — fix(web): harden unscheduled inbox races and a11y per /review

**Commit:** `76da046`

### What changed

Cycle-2 `/review` fixes against Chunk C (`f065de3`). Six findings — 3 🟡 Important + 3 🟢 Minor — all fixed inline, no deferrals.

**Out-of-order fetch guard** — `loadPage` now tags every invocation with a monotonic `requestIdRef` counter and discards its own response in `try`/`catch`/`finally` if a newer call has started. Rapid filter toggles + keystrokes could otherwise let stale responses overwrite fresh rows. The commit message on `f065de3` claimed race-correctness but only addressed the page-reset race — out-of-order responses were untreated until now.

**Page clamp on last-row schedule** — `handleScheduled` detects `rows.length === 1 && page > 1` before the optimistic removal and steps `page` back by one, which triggers a `queryString` refetch via the existing effect. Prior behavior: user scheduling the last row on page 2 got left staring at an empty "Page 2 of 1".

**Ref-based rapid-click gate replaces `disabled` on row buttons** — the cycle-1 fix (`disabled={!!scheduleTarget}`) worked for the double-click race but broke dialog focus return: the row button was blurred mid-commit when `disabled` flipped to true, so `ScheduleRequestDialog`'s `previouslyFocusedRef = document.activeElement` captured `body` instead of the button, and focus on close dropped to document start. Replaced with a synchronous `scheduleTargetRef.current` guard in `openScheduleFor` that early-returns on a stale click without touching the button's DOM state. Focus now returns correctly to the opener on cancel/escape/backdrop. (Happy-path focus after a successful schedule still lands on `body` because the row unmounts — logged as a 🟢 minor for post-launch, strictly better than the cycle-1 state.)

**Per-row `aria-label` on Schedule buttons** — every row now has `aria-label={`Schedule ${referenceNumber}`}` so screen-reader users can distinguish "Schedule WR-2026-0001" from "Schedule WR-2026-0002". Before this, all 25 row buttons had the same accessible name "Schedule →".

**Calendar reference chip `text-[10px]` → `text-xs`** — the Chunk C diff introduced an arbitrary Tailwind font size in `calendar/page.js`, banned by `.claude/rules/components.md` ("zero arbitrary font sizes — all sizes from the defined type scale"). Swapped for the on-scale `text-xs`.

**Locked-state test assertion was a no-op** — `expect(calls).not.toContain(expect.stringContaining("/reqs/unscheduled"))` never fails: `toContain` uses `Object.is` equality, which can never match an asymmetric matcher. The assertion passed regardless of whether the technician path fetched the inbox endpoint. Replaced with an explicit `.some()` check. This one is a reminder that tests can lie silently — a green check mark isn't always proof of coverage.

**Two new regression tests** — one resolves two in-flight fetches in reverse order and asserts the stale payload doesn't overwrite the fresh rows; one pages to page 2, schedules the lonely row, and asserts the post-schedule refetch hits `page=1`. The cycle-1 "disables every row's Schedule button" test was replaced by a rapid-click regression test that fires two synchronous clicks and asserts only the first opens the dialog.

### Why

Every 🟡 Important finding fixed inline per the locked workflow rule. The out-of-order race and page-clamping bugs were real correctness issues — low-probability under normal use, but Friday is a live demo and "the inbox randomly shows stale rows under a fast click" is the kind of thing that gets noticed. The focus-return regression from the cycle-1 `disabled` fix was a new accessibility hole that the cycle-2 review caught before shipping.

### Lessons learned

- **A passing test isn't proof of coverage.** `expect(array).not.toContain(expect.stringContaining(...))` compiles, runs, and is always green, because `toContain` uses `Object.is` and asymmetric matchers never equal strings under `Object.is`. This is a Jest/Vitest API footgun. Rule of thumb: if an assertion mixes `toContain`/`toBe`/`toEqual` with an asymmetric matcher like `expect.stringContaining`, check the docs. For negative existence assertions on arrays of strings, prefer an explicit `.some()` or `.find()` with a manual predicate.
- **`disabled` attribute is not a free defensive primitive.** Adding `disabled={busy}` to a button as a "just in case" race guard blurs the button mid-commit and silently breaks any focus-return logic that captures `document.activeElement` after the commit. Cycle-1 fix shipped with this bug because I only tested the click-through path, not the dialog-close-focus path. Lesson: when a button's `disabled` flips during the same commit that opens a modal, assume focus is lost and use a different gate (ref, early-return, aria-disabled). This now goes in the team feedback memory.
- **React state reads are stale within a single handler tick.** `openScheduleFor` checking `scheduleTarget === null` before setting state doesn't actually guard rapid double-clicks — two back-to-back clicks both see the stale `null` because neither has committed yet. The synchronous `scheduleTargetRef.current` mirror is the idiomatic fix. This is a React 18 concurrent-mode-safe pattern — safer than reading from `useState` for deduplication purposes.
- **Commit messages can overstate correctness.** Chunk C's original commit message said "filter changes reset page synchronously... to avoid a double-fetch race" — which was TRUE for the page-reset race it fixed but read like a general race-freeness claim. It wasn't. Out-of-order responses were a separate untreated race. Future lesson: when claiming race correctness, be specific about WHICH race and note which ones you did NOT address.
- **Cycle-1 fixes can introduce cycle-2 bugs.** This is the first time this session a `/review` cycle 2 turned up a net-new finding (happy-path focus loss) that didn't exist in cycle 1 — the cycle-1 `disabled` fix improved the rapid-click guard but broke focus return. Cycle 2 caught it. The workflow rule "two cycles → stop and surface blocker" was tested and held: cycle 2 passed, so we proceed. Good guardrail.

---

## 2026-04-14 — feat(web): unscheduled requests inbox and calendar sync badges

**Commit:** `f065de3`

### What changed

Phase 4-5 of the `work-request-schedule-coupling` plan. Manager+ users now have a single-screen inbox for "what needs to be scheduled?", and the calendar surfaces work-request status + Monday sync state directly on request-type events.

**New `/req/unscheduled` inbox page** — lists work_reqs that have no linked `schedule_events` row. Paginated, filterable by account name (debounced 300ms), "Assigned only", and "Show older" (bypasses the default 30-day server-side window). Four empty-state variants with explicit recovery paths: unfiltered empty (everything's scheduled), filter-matched empty (clear filters button), locked (Technician) with "Back to work requests" button, and error state (retry). Per-row "Schedule →" button opens the existing `ScheduleRequestDialog` inline with optimistic row removal on successful schedule — no full reload.

**Race-free filter changes** — filter toggles reset `page` to 1 synchronously in the change handlers, batched with the filter state update in the same render. The initial implementation reset via a post-commit effect which caused a double-fetch race: React's render order meant one fetch fired with the OLD page number and the new filter, then a second fetch fired with `page=1`. Out-of-order responses could leave stale rows on screen. Caught during `/review` cycle 1, fixed inline.

**All Schedule buttons disable while a dialog is open** — clicking a second row's Schedule while the first dialog is still mounted would reuse the mounted component and leak its form state across rows (same `scheduleTarget` variable, no re-mount, no state reset). Disabling every row's button whenever `scheduleTarget != null` rules out the bug without needing a `key` prop hack.

**Routes + Sidebar** — `/req/unscheduled` added to the static `ROUTES` list before `/req` so pathname resolution hits the exact match. Sidebar inserts a Manager+ "Not Yet Scheduled" nav item after "Work Requests" in the Requests section; description text matches the page subtitle ("Work requests waiting to be placed on the calendar") so nav hover and page header echo.

**Calendar page enhancement** — `fetchScheduleRows` now carries Phase 1.6's joined `work_req_*` metadata through to the local entry shape. Request-type event cards render a `SyncStatusBadge` (size `sm`) and a monospace reference chip with the friendly-formatted work_req status (`in_progress` → "In progress" via a `WORK_REQ_STATUS_LABELS` map). Custom events render unchanged. The existing "Open request" button on the event modal already linked to `/req/:id` — Phase 5.1 verification only.

**Tests** — 9 new inbox-page tests (locked state, row rendering, empty state, dialog opens from row click, all-row-button disable during dialog, filter forwarding, pagination visibility, pagination click refetches with `page=2`, debounced search). Web tests 84/84 (was 75), lint clean, build clean, 16 routes.

### Why

Phase 2-3 (Chunk B) gave managers the ability to schedule a work request from its detail page, but required them to already know which work request needed scheduling. The inbox closes that gap — it's the answer to "what's on my plate today?" in dispatch terms. Combined with the calendar card enhancement, a manager can now see at a glance both "what needs to be scheduled" and "what's scheduled but not yet synced to Monday," without visiting the detail page.

### Lessons learned

- **React effect chains hide race conditions easily.** The filter-change double-fetch race only surfaces on skeptical re-reading of the useEffect dependencies. Unit tests didn't catch it (each test mocks fetchApi statically, so out-of-order responses are invisible). Rule going forward: when a state update triggers another state update via an effect, AND both feed the same network query, reset synchronously in the handler — don't chain through effects.
- **`/review` caught a second "lazy" deferral pattern.** I initially noted the double-fetch race as a 🟡 Important finding but would have been tempted to defer it because "the second fetch is always the correct one anyway." The principle locked in earlier this session (fix minor issues inline) extended naturally to this: "fix race conditions that might produce the right answer today but can't be relied on" — the right fix was the synchronous reset, not a rationalization about response ordering.
- **Friendly labels belong in the display layer.** The first version of the reference chip rendered `work_req_status` directly: `WR-2026-0042 · in_progress`. Ugly. One-line fix (a label map + `formatWorkReqStatus` helper) and the UI stops leaking DB enum values at users. This pattern generalizes — anywhere a raw enum reaches the UI, there should be a label map in between.
- **Manager+ sidebar gating reuses the existing SuperAdmin pattern cleanly.** The sidebar already had one role-gated item (SuperAdmin → Super Admin link). Extending it for Manager+ was symmetric: check the user's permissionLevel against a set, splice the item into the right section if it passes. No new "role-aware nav" abstraction needed. Sometimes the right pattern is the one that's already there.
- **Optimistic row removal on successful schedule is tiny but feels instant.** When a manager clicks Schedule → submits the dialog → sees the row fade out immediately vs. waits for a re-fetch of the inbox. The optimistic path is 3 lines (`setRows(prev => prev.filter(...)); setTotalCount(c => c - 1)`) and transforms the feel of the inbox from "I'm filing paperwork" to "I'm working through a list." Small UX detail, large perceived-speed payoff.

---

## 2026-04-13 — feat(web): schedule dialog and linked schedule list on req detail

**Commits:** `ccb4893` `5ccf5cf`

### What changed

Two commits shipping Phase 2-3 (UI) of the `work-request-schedule-coupling` plan. Manager+ users can now put a work request on the calendar from its detail page and see the linked schedule events inline.

**`ccb4893` — refactor(web): extract shared trapFocus and SelectChevron**
- `apps/web/src/lib/dialogA11y.js` — exports `trapFocus(event, container)`. Was inlined at the bottom of `DeleteWorkRequestDialog.js`; now imported by both that dialog and the new `ScheduleRequestDialog`. Tiny module, no external deps
- `apps/web/src/components/SelectChevron.js` — decorative chevron SVG for `appearance-none` native selects, positioned absolutely inside a `relative` wrapper. Uses `currentColor` + `text-muted` so it inherits the muted token in light AND dark mode automatically
- `WorkRequestForm.js` — drops the `SELECT_STYLE` constant (which had a hardcoded `data:image/svg+xml,...stroke='%236b7280'...` data URL). Each of the three selects now wraps in `<div class="relative">` with a `<SelectChevron />` sibling. Same visual result, but the chevron color follows the token cascade instead of being a hex literal
- No behavioral changes. Web tests 75/75 still pass

**`5ccf5cf` — feat(web): schedule dialog and linked schedule list on req detail**
- New `ScheduleRequestDialog.js` — modal form with start/end `datetime-local` inputs, tech `<select>` (lazy-loaded from `/employees`, includes "Unassigned"), and an optional details textarea (max 500 chars). Inline validation: end must be after start, submit disabled until both times are set. Submits to `POST /reqs/:id/schedule-events`, fires `onScheduled` on success, parent reloads
- Accessibility: `role="dialog"` + `aria-modal="true"`, focus trap via the shared `dialogA11y.trapFocus`, Escape close, backdrop close, focus return on unmount. **Initial focus on the Start time input** — not Cancel — because this is a form, not a confirm dialog (deliberate spec divergence from `DeleteWorkRequestDialog`)
- New `LinkedScheduleList.js` — presentational list component. Empty state, time-range formatting, tech name with italic "Unassigned" fallback, details preview with a muted "No details" fallback. When the parent work_req `status === 'completed'`, rows render dimmed with a "Completed" pill and the Unschedule button is hidden. Per-row Unschedule button only renders when the parent passes a function for `onUnschedule` — role gating happens at the parent layer
- `req/[id]/page.js` — new "Linked Schedule" section below the existing detail body, with an event count chip ("3 events") next to the heading when `scheduleEvents.length > 0`. "+ Schedule this request" button (Manager+ only) opens the dialog. `openScheduleDialog` opens immediately and fires the `/employees` fetch as a detached IIFE so cold page loads do not stall on the network roundtrip — the previous implementation awaited the fetch first, which created a visible ~200ms dead click. `handleUnschedule` uses a **separate `scheduleError` local state** instead of the page-level `error` state, so a transient unschedule failure shows inline next to the list and does NOT replace the entire detail view with `DetailErrorState`
- 20 new tests (11 dialog + 9 list). Web tests 75/75 (was 52)

### Why

Phase 1 (backend) shipped a fully functional API for scheduling work requests but had no UI. Managers had to call the endpoints with curl. This phase puts the action behind a single button on the detail page so a manager looking at "WR-2026-0042" can click "Schedule this request", pick a date and a tech, and the work request appears on the calendar — closing half of the work-request ↔ schedule-events mental gap that the plan exists to fix.

### Lessons learned

- **Self-reflection caught the `openScheduleDialog` blocking bug.** First implementation awaited `/employees` BEFORE opening the dialog; the button felt dead for ~200ms on cold loads. Caught during `/reflect`, fixed inline by wrapping the fetch in a detached `(async () => { ... })()` IIFE. Lesson: when a button click triggers both a state change and a network fetch, do the state change first and the fetch second — never gate UI feedback on network latency.
- **Self-review caught a worse bug: `setError` for unschedule failures replaces the entire page.** The detail page's `error` state drives `DetailErrorState`, which replaces the whole body. I initially called `setError(err.message)` inside `handleUnschedule`'s catch — meaning a single failed DELETE would nuke the user's view. Fixed by introducing a `scheduleError` local state for section-scoped errors. Lesson: shared state for "errors" is a smell — different error sources need different recovery paths and different visual treatments. Keep them separate.
- **`/review` cycle caught me trying to defer 3 minor findings as a backlog.** User pushed back: "we should fix all the minor issues as well so we don't build a backlog of minor issues." The chevron hex was the biggest one — fixing it required extracting `SelectChevron` and refactoring 4 call sites (1 new in `ScheduleRequestDialog`, 3 pre-existing in `WorkRequestForm`). The result is cleaner than just fixing the new one would have been, AND retroactively fixed an existing token violation. Lesson: minor findings deferred at chunk boundaries become permanent technical debt — fix them at the moment they are identified.
- **Vitest + React Testing Library is the web test pattern; Jest is API-only.** I almost wrote `import { describe, it } from "@jest/globals"` out of habit. The web tests use `import { describe, it, expect, vi } from "vitest"` and `vi.fn()` not `jest.fn()`. Worth noting in CLAUDE.md or similar — easy footgun for cross-app work.
- **The `onUnschedule || null` pattern is the right way to role-gate an action button** without prop-drilling permission flags. The `LinkedScheduleList` component doesn't know what a Manager is; it just renders the button when handed a function. The parent decides. This kept the presentational component clean and made the test setup trivial (`onUnschedule={vi.fn()}` vs `onUnschedule={null}`).

---

## 2026-04-13 — feat(api): work request schedule coupling — Phase 1 backend

**Commits:** `cde3c69` `b645b30`

### What changed

Two commits shipping Phase 1 (backend) of the `work-request-schedule-coupling` plan, plus a prior UI cleanup that had been sitting uncommitted.

**`cde3c69` — fix(web): remove stub helper copy and truncate select chevrons**
- Deleted the "Browser autofill works / Google Places…" stub helper text under the Account Address input on the work request form (Google Places activation is logged as a post-launch task since it requires a GCP billing account)
- Deleted the "Pulled from the signed-in employee account" stub under Tech Name (the readOnly input is self-explanatory)
- Extracted shared `SELECT_CLASS` + `SELECT_STYLE` constants for the three form selects (plantSize, plantHeight, lighting). Selects now use `appearance-none` + a custom inline SVG chevron at `right 0.875rem center` with `pr-10`, and `truncate` clips long option labels with an ellipsis instead of overlapping the arrow

**`b645b30` — feat(api): work request schedule coupling — Phase 1 backend**
- Migration 006 (up + down) plus `01_schema.sql` update adds `idx_schedule_workreq` on `schedule_events(work_req_id)` so the upcoming LEFT JOIN queries and linked-event lookups are indexed
- New service `workReqScheduleService.js` owns all SQL for the feature. Public surface: `listLinkedEvents(workReqId)`, `createLinkedEvent({workReqId, body, req})`, `deleteLinkedEvent({workReqId, eventId, req})`, `listUnscheduledWorkReqs({pageSize, offset, filters})`. Private helpers: `validateRequestScheduleEventPayload`, `normalizeDateTime`, `buildEventTitle`, `getLinkedEventById`
- Invariants enforced at the service layer (not the route): `event_type = 'request'` is hardcoded on insert; title is server-derived from the work request's `referenceNumber` + truncated `actionRequired`; employee_id (when provided) must reference an `Active` employees row, else 400 `EMPLOYEE_NOT_FOUND`; the unscheduled inbox hides work_reqs older than 30 days by default unless `includeOlder=true`
- 4 new sub-resource routes on `/reqs`:
  - `GET /reqs/unscheduled` (manager+) — paginated inbox with `account` LIKE, `assignedTo` exact, `assignedToPresent`, and `includeOlder` filters
  - `GET /reqs/:id/schedule-events` (technician+) — list linked events
  - `POST /reqs/:id/schedule-events` (manager+) — create
  - `DELETE /reqs/:id/schedule-events/:eventId` (manager+) — unschedule with ownership guard
- Route ordering is explicit: `/unscheduled` is registered BEFORE `/:id` so Express doesn't try to parse "unscheduled" as an id. Verified by the new route-level regression test
- `GET /reqs/:id` now inlines a `scheduleEvents` array so the detail page renders linked events in one round trip
- `GET /schedule` gains an unconditional LEFT JOIN to `work_reqs` that adds `work_req_status`, `work_req_reference`, `work_req_monday_item_id`, `work_req_monday_synced_at` to every event row (null for custom events). Strictly additive — no existing consumer sees a regression
- `DELETE /reqs/:id` now wraps in a transaction and pre-deletes linked `schedule_events` rows BEFORE deleting the work_req. The FK is `ON DELETE SET NULL` — without this pre-delete, deleting a work request leaves orphaned calendar events with null `work_req_id` that render as broken request cards. Transaction uses `db.getConnection()` + nested try/catch so rollback only runs after a successful `beginTransaction`. Monday sync push still fires fire-and-forget AFTER commit (never inside a txn — outbound HTTP in a DB transaction is a classic footgun)
- All new routes use `httpError(status, message, code)` via `next()` for the structured `{error: {code, message}}` error shape
- 37 service unit tests + 11 route-level tests. The route-level file (`reqs.routes.test.js`) is new and establishes the supertest pattern for future route tests. 379/379 total API tests pass, lint clean

### Why

Schedule events (`schedule_events`) and work requests (`work_reqs`) have always shared a `work_req_id` FK in the schema, but nothing in the application ever used it end-to-end. Techs didn't know what they were scheduled to do; managers didn't know what had been put on the calendar. This phase wires the backend so the upcoming dialog + inbox UI has something to call. Target ship: Friday 2026-04-17 launch.

### Lessons learned

- **Three deferrals in the first /review were drift, not judgment.** Initial review cycle flagged error-shape inconsistency, no DELETE transaction test, and no route-ordering regression test. All three were deferred on thin reasoning ("matches pre-existing pattern", "would need new test infra"). The user pushed back and was correct — supertest was already a project dependency (used by `mondayWebhook.test.js`), the infra existed, and fixing all three inline took ~30 minutes. Rule going forward: defer only for genuine risk or scope, not because a fix is "additional work." Saved this as a feedback memory + global CLAUDE.md rule earlier this session.
- **Route ordering under Express parameterized paths is a latent footgun.** `/reqs/unscheduled` vs `/reqs/:id` only works because the file happens to register `/unscheduled` first. A careless refactor could re-order the file and silently break the inbox. The new route-level regression test is the guardrail; visual review alone is not enough for ordering concerns.
- **FK `ON DELETE SET NULL` creates orphans that look correct at the schema level but break the UI.** The schedule_events FK was defined years ago with `ON DELETE SET NULL`, which is a sensible default — until you have a type column like `event_type` that implies the linked row exists. The pre-delete-in-transaction pattern fixes the immediate bug without a schema migration (we didn't want to flip the FK to CASCADE during launch prep).
- **Single-file transaction refactors compose.** Phase 1 only needed the DELETE side wrapped. Phase 6 will wrap PUT /reqs/:id similarly for the auto-close hook. The two plans (schedule-coupling and inventory-reconciliation) both need the PUT-side refactor — whichever ships first pays the cost, second inherits it. Plan explicitly documented this coordination point so neither execution run is surprised.
- **`reqs.routes.test.js` is the first route-level test in the whole API.** Every prior test was either service-level (mock-DB) or middleware-level. This file establishes the pattern: mock `verifyToken` / `authorize` / `writeLimiter` / `mondaySyncService` at the module boundary, wire a synthetic Express app with the real router + errorHandler, drive it with supertest. Future route tests can copy this shape line-for-line.

---

## 2026-04-13 — fix(api): webhook rate limiter and board-id env invariant

### What changed

Two 🟡 Important findings from the Phase 4 `/review` applied as a single fix.

- `apps/api/src/middleware/rateLimiters.js` — added `webhookLimiter`
  (300 events/minute/IP, configurable via `RATE_LIMIT_WEBHOOK_*` env).
  Cap is intentionally higher than `writeLimiter` so legitimate Monday
  bursts (batch column edits, board imports) aren't throttled.
- `apps/api/src/app.js` — mounted `webhookLimiter` on `/monday` ahead of
  `createMondayWebhookRouter()`.
- `apps/api/src/lib/env.js` — added a Zod `.refine()` requiring
  `MONDAY_BOARD_ID` whenever `MONDAY_WEBHOOK_SECRET` is set. Boot fails
  fast with a precise message if the pair is half-configured.

### Why

Both findings hardened defenses against a leaked URL secret. The secret
was leaked once during the Phase 4 session (rotated immediately), so
the threat model isn't theoretical.

- Rate limiter caps blast radius on a leaked secret without changing
  steady-state behavior. The route's primary auth is still the timing-
  safe URL-path secret comparison.
- The env invariant prevents a misconfigured prod (secret set, board id
  empty) from silently disabling the inbound `boardId !== expected`
  defense-in-depth filter inside `mondayWebhookHandler.js`.

### Lessons learned

- `express-rate-limit` ships with sensible defaults — wiring a third
  limiter took two lines once the existing pattern was in place. Worth
  investing in shared middleware modules early.
- Zod `.refine()` cross-field invariants are the right fit for "if A
  then B must be present" config rules. Catching this at boot time is
  much better than discovering the misconfiguration via a stolen-secret
  incident in production.
- Tests already covered the surface area being touched — no new tests
  were needed. The existing `mondayWebhook.test.js` route tests still
  pass because `webhookLimiter` is mounted upstream of the synthetic
  test app's router factory.



**Commits:** `c6badc5` `543804f`

### What changed

Two commits closing out Phase 4 after a full end-to-end walkthrough of the
web-UI-driven bidirectional sync path ("Path B"):

**`c6badc5` — chore(api): consolidate Monday webhook scripts into node CLI**
- Deleted four one-shot bash scripts from the Phase 4.2.0 capture work:
  `monday-diag.sh`, `monday-introspect-webhook-events.sh`,
  `monday-webhook-register-capture.sh`, `monday-webhook-teardown.sh`
- Added `scripts/monday-register-webhook.js` — production-grade CLI that
  handles `--register`, `--list`, `--delete <id>`, `--delete-all --yes`,
  with partial-rollback on registration failure, existing-webhook detection,
  secret-redacted logging, and a sanity guard that rejects a `--url` that
  already contains the webhook path fragment
- Added `scripts/monday-smoke-seed.js` — one-shot seed for smoke tests
  (inserts a throwaway `work_req`, calls `pushCreate`, prints the resulting
  `monday_item_id` for the driver to edit/delete on the Monday UI)
- Rewrote the `.env.example` Monday section to explain that blank values
  are fine but non-empty-short values crash boot, with a reference to the
  `emptyToUndefined` preprocess in `env.js`

**`543804f` — fix(api): Monday webhook decoder aliases + sentinel + review hardening**

*Critical bug fixes caught during the Path B e2e walkthrough:*

1. Monday sends `columnType="long-text"` (hyphen) in webhook bodies for
   long_text columns, not `"long_text"` (underscore). The decoder's switch
   case didn't match, fell through to `default`, returned `null`, and the
   handler wrote `NULL` to the DB — silently clearing the field. Would
   have broken every notes / accountAddress / actionRequired / method
   edit from the Monday side.
2. Monday sends `columnType="numeric"` for number columns, not `"numbers"`.
   Same silent-clear failure mode for `numberOfPlants`.

*Fixes:*
- Added hyphen-to-underscore normalization at the top of `decodeWebhookValue`
- Added `"numeric"` as an explicit case fall-through for `"numbers"`
- **Introduced a `DECODE_UNSUPPORTED` sentinel** — previously unknown column
  types returned `null` which the handler applied as a field clear. Now
  unknown types return the sentinel and the handler explicitly skips the
  `UPDATE` while logging loudly. Defense-in-depth against future alias drift.

*Phase 4 review follow-ups (bundled with the decoder fixes since they
all touch the same files):*
- `env.js` — `emptyToUndefined` Zod preprocess on all three Monday env
  vars so a blank `.env` copy of `.env.example` degrades to "Monday sync
  disabled" instead of crashing validation on `z.string().min(32).optional()`
  (which rejects empty string because `optional()` only allows undefined)
- `loopPreventionSet.hashValue` — guards against `undefined` input by
  normalizing to `null` before hashing (prevents a latent crash from a
  future caller who forgets to pre-filter)
- `mondaySyncService.pushCreate` — added a timing-rationale comment so a
  future reader doesn't "fix" the remember-after-create call order into
  remember-before-create (which would create orphan signatures on failure)
- `mondayWebhookHandler.handleUpdateColumnValue` — added a DESIGN CONSTRAINT
  comment at the UPDATE call site explaining why the handler writes via
  direct SQL instead of going through `reqs.js` (avoiding an infinite
  outbound-trigger loop) and what future maintainers must replicate here
  if they add side-effects to `reqs.js`

*5 new regression tests (326 → 331):*
- `decodeWebhookValue` returns the `DECODE_UNSUPPORTED` sentinel (not null)
  for unknown column types
- `decodeWebhookValue` routes `long-text` (hyphen) to the same case as
  `long_text` (underscore)
- `decodeWebhookValue` routes `numeric` to the same case as `numbers`
- `decodeWebhookValue` treats null/undefined columnType as unsupported
- `handleUpdateColumnValue` skips the UPDATE when the decoder returns
  the `DECODE_UNSUPPORTED` sentinel

### Why

Phase 4.5 earlier today validated the backend-driven flows (column edit
Monday→DB, echo suppression via sync queue, delete round-trip) but left the
web-UI-driven outbound path untested end-to-end. The Path B walkthrough was
supposed to be a rubber-stamp validation; it caught two critical bugs that
would have shipped on Friday and broken the live demo the first time anyone
touched a long_text or number column from the Monday side.

The two Monday-side column type naming divergences (`long-text` vs
`long_text`, `numeric` vs `numbers`) are **undocumented** in Monday's
public API reference — the GraphQL API uses one set of names for `column.type`
and the webhook bodies use another. There's no way to catch this without an
empirical round-trip test against a live board.

The decoder sentinel is the actually-important fix. Without it, any future
column type name drift from Monday would silently corrupt DB state. With it,
any drift loudly refuses to write and logs a clear "unsupported columnType"
warning. The codebase was one-webhook-format-change away from silently
clearing production data.

### Lessons learned

- **Unit tests that mock Monday's webhook body shape are not a substitute
  for live fixture samples.** The original Phase 4 tests used handcrafted
  `columnType: "long_text"` strings everywhere because that's what Monday's
  GraphQL enum says. The webhook body actually uses `"long-text"`. Both
  bugs (long-text and numeric) would have been caught by a single captured
  real webhook payload per column type. The SESSION.md open thread from
  Phase 4.5 specifically flagged this gap: *"Text/long_text/numbers/date
  column webhook shapes are unverified."* Phase 4.5 deferred it; Path B
  paid for the deferral in live debugging time. Next time: capture
  empirical fixture samples FIRST, then write the decoder against them.
- **"Silent null on unknown type" is a dangerous default.** The original
  decoder's `default:` returned `null` with a warning log, rationalized as
  "safer than writing arbitrary shapes as a JSON string into a VARCHAR."
  But `null` in SQL is not neutral — it **clears the field**. The sentinel
  approach (caller must explicitly handle "I can't decode this") is the
  correct default for any unknown-input decoder that feeds into a write.
  Generalize: when a decoder's return type is also a valid "clear this"
  value, you MUST disambiguate "unknown" from "intentional clear."
- **The review-driven `.env.example` fix was also bootstrap-critical.**
  The existing Zod schema (`z.string().min(32).optional()`) would have
  crashed every fresh-install boot because `optional()` doesn't allow
  empty string. The review caught it as a 🟡; the same class of bug as
  the decoder sentinel (an "obvious" null vs undefined vs empty-string
  distinction biting a validator).
- **Two-layer fixes beat one-layer fixes.** The decoder fix has both
  hyphen normalization AND the sentinel AND explicit case fall-throughs.
  If any one layer breaks, the other two still prevent data corruption.
- **Path B e2e walkthrough was worth 10x its cost.** 20 minutes of manual
  clicking caught what 88 unit tests missed. When a code path crosses a
  system boundary (in this case, our API ↔ Monday's webhook delivery),
  unit tests with mocked shapes prove nothing about the real wire format.
- **The fire-and-forget pattern in `reqs.js` works correctly in practice
  under normal timing.** pushCreate/pushUpdate/pushDelete calls from the
  route handlers reliably `remember` the loop-prevention signatures before
  Monday echoes back. No race conditions observed in any of the 6 Path B
  round-trips (3 create, 3 edit, 3 delete). The theoretical timing race
  (documented in the new pushCreate comment) is genuinely theoretical.

---

## 2026-04-13 — feat(api): Phase 4.1–4.4 — Monday inbound webhook + loop prevention

**Commits:** `b58a2b0` `1936e36` `f386ae4` `3e015d0` (this entry)

### What changed

Phase 4 of the Monday work-request sync plan — the inbound half of the
two-way sync. Greenery now reacts to changes made directly on the Monday
board and applies them to its own database, while suppressing echoes
from its own outbound pushes via an in-memory deduplication set.

**Phase 4.2.0 — Live webhook payload capture (`b58a2b0`)**
- Five throwaway-but-reusable scripts under `apps/api/scripts/`:
  - `monday-diag.sh` — three-step diagnostic (board read, webhook list, current user) so we can isolate auth/permission/shape issues independently
  - `monday-introspect-webhook-events.sh` — queries Monday's `WebhookEventType` enum so we don't guess at registration enum names
  - `monday-webhook-register-capture.sh` — registers webhooks via GraphQL variables (no string-interpolation brittleness)
  - `monday-webhook-teardown.sh` — deletes webhooks by id
  - `local-webhook-echo.js` — Express server that echoes Monday's registration challenge and logs every event body, used behind a cloudflared quick tunnel
- `.gitignore` updated to exclude `.monday-webhook-samples.json` so captured Monday user/item IDs stay out of git.

**Phase 4.1 — `loopPreventionSet.js` (`1936e36`)**
- In-memory `Map<signature, expiryEpochMs>`, 15s TTL, 10k entry size cap with FIFO eviction
- Lazy pruning on `has()` calls — no background timer, no test-hang risk
- Stable signature: SHA-256 of `${itemId}:${columnId}:${stableStringify(value)}`
- `stableStringify` recursively sorts object keys so equivalent payloads with different key order produce identical hashes (Monday responses don't guarantee key ordering)
- Process-local — multi-process deployment would need Redis; accepted for current single-process API

**Phase 4.2 — Webhook route (`f386ae4`)**
- `POST /monday/webhook/:secret` mounted at `app.js`
- URL-based secret authentication via `crypto.timingSafeEqual`. Fail-closed: missing or mismatched secret returns 404 with no body
- Auth failures log `[monday-webhook] auth failure` with the source IP from `cf-connecting-ip` — never the URL or the secret
- Boot-time warning when the route is mounted with no configured secret so production misconfiguration is impossible to miss
- Monday registration challenge handshake runs BEFORE event dispatch (handlers assume `event.type` exists)
- Always returns 200 after dispatch — even if the handler throws — to prevent Monday's retry-on-non-2xx from duplicating side effects
- Factory pattern (`createMondayWebhookRouter`) so tests can inject their own secret and event handler without monkey-patching the env module cache
- `MONDAY_WEBHOOK_SECRET` validated via Zod with `.min(32).optional()` — short secrets crash at boot, missing ones boot fine and the route fails closed
- `.env.example` documents the placeholder plus the `openssl rand -hex 32` generation command

**Phase 4.3 — Event handler (`f386ae4`)**
- `mondayWebhookHandler.handleEvent(event)` dispatches on the runtime `event.type` string (NOT the registration enum — Monday renamed `change_column_value` → `update_column_value` and `item_deleted` → `delete_pulse` between API versions; we discovered this empirically in 4.2.0 capture)
- `handleUpdateColumnValue` decodes the value into a canonical scalar, checks loop prevention via the matching signature, and runs a parameterized `UPDATE work_reqs SET <field> = ? WHERE monday_item_id = ?`
- `<field>` is interpolated from a static whitelist (`SYNCED_FIELDS = new Set(Object.values(COLUMN_TO_FIELD))`) — defense-in-depth assertion against future refactors that might weaken the source-of-truth invariant
- `handleDeletePulse` runs `DELETE FROM work_reqs WHERE monday_item_id = ?` with a `__delete__` sentinel signature for echo suppression
- `handleCreatePulse` logs and ignores in v1 — items created directly on Monday have no required-field guarantees; deferred to v2
- All DB writes are direct SQL — never through reqs.js controllers — so the inbound apply path doesn't re-trigger the outbound sync and create a different kind of loop
- Defense in depth: events for an unexpected `boardId` are silently dropped before dispatch
- Field-name normalizer (`resolveItemId`) handles Monday's `pulseId` vs `itemId` flip across event types
- Decoder handles four column types empirically + defensively: text, long_text, numbers, date

**Phase 4.4 — Outbound loop-prevention hooks (`3e015d0`)**
- `mondaySyncService.pushCreate/pushUpdate/pushDelete` now call `rememberOutboundColumnSignatures(itemId, workReq)` after every successful Monday API call
- `remember()` sits BETWEEN the Monday API call and the subsequent `db.query` bookkeeping — failed pushes don't poison the set
- Both the primary push functions AND the `drainQueue` retry branches get the hooks, so retried items also seed the prevention set
- Delete pushes remember a sentinel signature (`columnId="__delete__"`, `value=null`) matching what `handleDeletePulse` computes
- `mondayColumnValues.js` gains `toSignatureValue(field, value)` — canonical scalar normalizer (dates → YYYY-MM-DD string, numbers → number, text → string). Both sides of the loop must hash the same canonical form or echo detection silently fails open.
- Round-trip tests prove the suppression works end-to-end: `pushUpdate` → `handleEvent` skips the inbound DB write when the signature matches; counter-test with a different value confirms genuine edits still apply

### Test additions (+82 tests, 243 → 326)

- `loopPreventionSet.test.js` — 27 tests covering signature stability across object key order, TTL expiry, lazy pruning, FIFO eviction under cap, prune-before-evict path
- `mondayWebhook.test.js` — 14 unit tests + 1 integration test against the real wired `app.js` (`jest.isolateModules` + `jest.doMock` to inject env without polluting the module cache)
- `mondayWebhookHandler.test.js` — 33 tests across `resolveItemId`, `decodeWebhookValue` (text/long_text/numbers/date variants + null + unknown-type), dispatcher, `handleUpdateColumnValue` (mapped/unmapped column, missing fields, loop-prevention skip, zero-row warning, itemId/pulseId tolerance), `handleDeletePulse`, `handleCreatePulse`
- `mondaySyncService.test.js` — 8 new tests for the outbound loop-prevention hooks (signature count after success, no signatures on failure, delete sentinel) and 3 round-trip echo-suppression scenarios

### Why

Phase 2 (Greenery → Monday outbound sync) shipped earlier in the sprint
but is half a system. Phase 4 closes the loop: anything edited or
deleted on the Monday board now flows back to Greenery within seconds.
The headline value prop for the Friday demo is "two-way sync between
the field-team app and the Monday board" — Phase 4 is what makes the
"two-way" claim real instead of marketing.

Loop prevention is the keystone — without it, the bidirectional sync
would create infinite update loops every time anyone edited anything,
because Greenery's outbound push would fire a webhook back into
Greenery's inbound handler, which would write to the DB, which would
fire another outbound push, and so on. The plan dedicated 30% of
Phase 4's time budget to loop prevention specifically.

### Lessons learned

- **Empirical capture saves hours of guesswork.** Phase 4.2.0 was budgeted at 15 minutes for "capture one webhook payload." It took longer (~45 min including paste-mangling debug + a Monday API token rotation) but uncovered THREE plan-invalidating findings: (a) GraphQL-registered webhooks arrive with NO Authorization header — the plan's JWT auth strategy was wrong; (b) Monday's enum names (`change_column_value`, `item_deleted`) differ from the runtime `event.type` strings (`update_column_value`, `delete_pulse`) due to a rename between API versions; (c) `update_column_value` uses `pulseId`/`pulseName` but `delete_pulse` uses `itemId`/`itemName` for the same logical entity. **Takeaway:** never write a handler against documented payload shapes when you can capture a real one in 15 minutes.
- **`grep -n` against `.env` is a secret leak waiting to happen.** This session had two accidental secret leaks via tool output — first the Monday API token (rotated via Developer Center), then the freshly minted webhook secret (rotated via second `sed` pass). Both were blast-radius-contained but indicate the wrong default. **Going forward:** never use `grep -n`, `cat`, or `head` on `.env` files in tool output. Verify with metadata only — `grep -c`, `awk '{print length}'`, `wc`-style aggregations.
- **`set -euo pipefail` + macOS bash 3.2 + Unicode ellipsis = unbound-variable error.** macOS ships with bash 3.2 from 2007, which mis-parses the Unicode ellipsis (`…`) as part of an adjacent variable name under nounset. `echo "Deleting webhook $WEBHOOK_ID…"` exploded with `WEBHOOK_ID?: unbound variable`. Fix: use `${WEBHOOK_ID}...` with brace expansion + ASCII dots. **Takeaway:** if a shell script will run on macOS, stick to ASCII in identifier-adjacent strings.
- **Express 5 deprecated bare `*` wildcards.** `app.post("*", handler)` in Express 5 throws `PathError [TypeError]: Missing parameter name at index 1: *`. Fix: use a regex (`app.post(/.*/, handler)`) or a named wildcard (`app.post("/*path", handler)`). Logged for any future Express 4 → 5 migration.
- **Cache-warm `jest.mock` doesn't work for indirect transitive imports.** Adding `const env = require("../lib/env")` to `mondayWebhookHandler.js` for the new `boardId` defense-in-depth check broke two test files that `require` the handler indirectly. The auto-mock of `../db` triggers loading the real `db/index.js` to fingerprint its exports, which transitively loads `env.js`, which fails Zod validation before `setupFilesAfterEach` runs. Fix: explicitly `jest.mock("../lib/env", () => ({...}))` in any test file whose dependency chain reaches env.js. Same pattern as `analytics.test.js` and `mondaySyncService.test.js`. **Takeaway:** in a Zod-validated env.js codebase, env mocks have to be hoisted in any test file that touches a module that touches db that touches env.
- **The signature canonicalization is the silent-failure failure mode.** Loop prevention works only if both sides hash the *same* canonical form. Outbound passes `String(workReq.field)`; inbound passes `decodeWebhookValue(event.value, columnType)`. Both have to converge to identical strings/numbers/dates. The very first version of Phase 4.3 hashed `event.value` directly (the raw Monday-shape wrapper object) — Phase 4.4 caught this during integration testing because the round-trip test failed. Fix was to decode BEFORE hashing on the inbound side. Without round-trip tests, this would have shipped silently broken and only manifested as occasional duplicate updates in production. **Takeaway:** any time two code paths must agree on a hash, write the integration test that hashes both sides and asserts equality.
- **Two `/review` cycles is the right cadence even mid-phase.** Cycle 1 caught 7 important findings (4 fixable in code, 3 deferred). Cycle 2 wasn't needed because all 7 got addressed in the same fix pass. Holding the line on "fix everything the review flagged before commit" prevents the deferred items from accumulating into a Phase 5 backlog.

### Out of scope for this entry (post-launch open threads)

- Text/long_text/numbers/date column webhook shapes are unverified. Phase 4.2.0 only captured a `color`/status column change — `decodeWebhookValue` defensively handles three plausible text shapes but if Monday wraps text values in a shape we haven't anticipated, echo suppression silently fails. **After Phase 4.5 registers the real long-lived webhook**, capture one text edit, one number edit, one date edit and verify against the decoder.
- Loop-prevention signature inefficiency — `rememberOutboundColumnSignatures` remembers signatures for ALL non-null fields on every push, not just the ones that changed. Self-healing via TTL but worth optimizing post-launch.
- Bash diagnostic scripts under `apps/api/scripts/` will be superseded by Phase 4.5's Node CLI. Delete in a cleanup commit after 4.5 ships.
- Phase 4.5 itself — the `monday-register-webhook.js` Node CLI is the only remaining Phase 4 task. Then Phases 5 (admin endpoint + backfill) and 6 (perf audit + demo polish).

---

## 2026-04-12 — feat(web): work request routes (list/detail/edit) + login contrast fix

**Commits:** `34ad54a` `5a46d74` (this entry)

### What changed

**Phase 3 — Web: work request routes (list/detail/edit + delete flow)**
- New routes: `/req/list` (paginated directory), `/req/[id]` (full detail with sync panel), `/req/[id]/edit` (form pre-filled).
- Extracted the existing create form into `WorkRequestForm` (`mode="create" | "edit"`). Uncontrolled FormData-based, dirty tracking + beforeunload guard preserved. ~450 lines, single source of truth for both flows.
- New `SyncStatusBadge` resolves four states (Synced / Queued / Failed / Not synced) from `monday_item_id`, `monday_synced_at`, and an optional `queueAttempts`. Rendered on list rows AND the detail page.
- New memoized `WorkRequestRow` for the list directory.
- New `DeleteWorkRequestDialog` (`role="dialog"`, `aria-modal`, focus trap, Escape, backdrop close, return-focus on unmount). Parent controls mount via conditional rendering — sidesteps the `react-hooks/set-state-in-effect` lint error while still resetting state on each open.
- Detail page gates Edit behind Manager+ and Delete behind Administrator+, mirroring the API `authorize()` scopes (server is still authoritative).
- Tasks page keeps its Queue + Recently Deleted tabs but its View button now navigates to the new detail route. The "Undo Delete" flow was renamed to "Recreate from snapshot" to set expectations honestly — the server assigns a fresh `WR-YYYY-NNNN` on POST.
- Calendar's "Open request" button and the dashboard `ActionCard` now point at the new routes.
- `fetchApi` gained an opt-in `raw: true` flag so the list page can read pagination meta (`totalCount`) without losing the existing auto-unwrap of `.data` for every other caller.
- `routes.js` gained a `DYNAMIC_ROUTES` regex layer (checked before the static ROUTES array) so `/req/42` resolves to "Work Request Detail" instead of colliding with the `/req` create page. `/req/42/edit` resolves to "Edit Work Request". Test coverage at `routes.test.js`.

**Test additions (+23 web tests, 29 → 52 passing)**
- `SyncStatusBadge.test.js` — 6 tests covering each state and the priority order.
- `WorkRequestRow.test.js` — 6 tests covering rendering, link target, status pill, fallback placeholders.
- `DeleteWorkRequestDialog.test.js` — 7 tests covering ARIA attrs, Cancel/Confirm wiring, error display, Escape, missing reference number.
- `routes.test.js` — 4 new dynamic-route tests.

**Login contrast fix (`34ad54a`)**
- Login page email/password inputs now set explicit `color: #223126` plus a scoped `<style>` block targeting `.login-input::placeholder` and `:-webkit-autofill`. Browser autofill suggestions, placeholder text, and typed text all render with adequate contrast against the cream `#f4f1e8` background.
- Surface fix only — the deeper issue is that `apps/web/src/app/page.js` is built entirely with inline `style={...}` objects and can't participate in the design token system. Logged as a post-launch open thread.

### Why

- The Monday.com sync (Phase 2) is invisible without a UI surface. `/req/list` plus the detail/edit pages give operators a way to see the current sync state of every request, edit fields and watch them propagate to Monday, and confirm deletes round-trip.
- Tasks page modal-based detail view was a UX dead-end (no deep links, no back button, no per-request URL). Route-based detail unlocks bookmarks, browser back, and audit-trail-friendly URLs for the Friday demo.
- Login contrast was demo-blocking — it's the first thing the audience sees.

### Lessons learned

- **`fetchApi` auto-unwrap of `.data` is a footgun for paginated endpoints.** First implementation of the list page tried to handle both shapes (array vs object) and ended up always seeing the unwrapped array, capping `totalCount` at the current page size. Pagination silently never showed beyond page 1. Fix was to make the unwrap opt-out, not heuristic. **Takeaway:** when an API helper auto-unwraps a key, callers that need the envelope should be explicit, never inferred — heuristic fallbacks just paper over the bug until production data is large enough to surface it.
- **`<select defaultValue>` with a hardcoded fallback silently mutates DB nulls.** First WorkRequestForm pass had `defaultValue={initialValues.plantSize || "3 Gal"}`. Editing a row with a null `plantSize` would default the select to "3 Gal", and saving would write "3 Gal" to both Greenery and Monday — user never touched the field. Fix is mode-aware: edit mode uses `""` as the default + adds a sentinel `<option value="">— not set —</option>`, and the server's `body.X ?? existing.X` back-fill preserves the null. **Takeaway:** any default-value pattern that uses `||` against a nullable column is a silent mutation in disguise. Pre-existing rows with non-canonical values (legacy values not in the option list) have the same issue and are still latent — logged for post-launch.
- **Permission-gate UX, not just the API.** First detail-page version showed Edit/Delete buttons unconditionally and let the API's `authorize()` reject the call. Technicians would click and see a 403 error in a dialog, which is bad demo UX. Client-side permission gating mirrors the server's authorize scopes — purely cosmetic, but the API is still authoritative.
- **`<dt>/<dd>` need a `<dl>` parent.** Easy to miss — was rendering correct visual output but invalid HTML and confused screen readers. The `MetaRow` component was correctly emitting `dt`/`dd` but its parent was a plain `<div>`. **Takeaway:** any time a small leaf component emits semantic-pair elements, audit the parents on every use site.
- **Two cycles of `/review` was the right cadence.** Cycle 1 caught 2 critical + 5 important. Cycle 2 verified the fixes and surfaced two pre-existing latent issues (legacy select values, edit-PUT can't actively clear fields) that I logged for post-launch instead of trying to wedge into this commit. Holding the line on "out of scope" prevented a Phase 3 commit from sprawling into Phase 4.
- **Inline styles can't target pseudo-classes.** Login page contrast fix — inline `style={}` objects are convenient but block `::placeholder`, `:-webkit-autofill`, `:focus-visible`, and the design token system. Surface-patched with a scoped `<style>` element this time; full conversion is a post-launch task.

### Out of scope (post-launch open threads)

- Login page full conversion from inline styles to className + design tokens.
- WorkRequestForm legacy non-canonical select values — silent mutation still possible if any production row has a value outside the 4 canonical options.
- Edit PUT can't actively clear nullable string fields — `buildReqPayload` treats null as "not provided". Asymmetric with `numberOfPlants` which uses `!== undefined`. Migrate to "any key in `req.body` is explicit intent" post-launch.
- 8 `/auth/me` fetchers across the web app — `web-shared-user-fetch` shared hook is implied. Phase 3 added a new one in the detail page.

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
