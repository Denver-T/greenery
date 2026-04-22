# Greenery -- Client Handoff

Prepared 2026-04-22. Convention demo delivered 2026-04-17. Azure production
environment has been torn down to stop credit burn. This document covers what
was delivered, what's needed to redeploy, and what's queued for future work.

---

## What was delivered

A full-stack operations platform for plant maintenance teams, deployed and
demonstrated live on Azure:

- **Web dashboard** (Next.js 16) -- work request lifecycle, calendar
  scheduling, employee management, assign tasks, superadmin governance
- **REST API** (Express 5, MySQL 8) -- auth via Firebase, PIPEDA audit
  logging, file uploads, structured error handling
- **Mobile app** (Expo 54 / React Native) -- technician field app with
  work request viewing, status actions (start / complete), weekly schedule
- **Monday.com bidirectional sync** -- outbound push on create/update/delete,
  inbound webhooks for column edits and item deletes, echo/loop prevention

### Key features

| Feature | Status |
|---|---|
| Firebase authentication (email/password + Google OAuth) | Shipped |
| Role-based access (Technician / Manager / Administrator / SuperAdmin) | Shipped |
| Work request CRUD with photo attachments | Shipped |
| Calendar scheduling with auto-assign on event creation | Shipped |
| Mark Complete with optional auto-close of schedule events | Shipped |
| Monday.com bidirectional sync (outbound + inbound webhooks) | Shipped |
| PIPEDA audit trail (activity_logs table, 5 action types) | Shipped |
| Atomic reference numbers (WR-YYYY-NNNN) | Shipped |
| Rate limiting + security hardening (Helmet, CORS, env validation) | Shipped |
| Mobile technician status actions (start work / mark complete) | Shipped |
| Dark mode (web) | Shipped |
| Dark mode (mobile) | Not shipped -- infrastructure exists, only 1/9 screens wired |
| Push notifications | Not started |
| Employee invite flow (email onboarding) | Not started |
| Offline support (mobile) | Not started |

---

## Production database backup

A mysqldump of the production database was taken before tear-down:

- **File:** `~/greenery-prod-dump-2026-04-22.sql`
- **Contents:** all 8 tables (employees, work_reqs, schedule_events, plants, activity_logs, notifications, monday_sync_queue, work_req_sequences)
- **Seeded users:** Denver Timlick (SuperAdmin, employees.id=1), Magnus Mullen (Technician, employees.id=2)

To restore into a fresh MySQL instance:

```bash
mysql -u <user> -p <database_name> < ~/greenery-prod-dump-2026-04-22.sql
```

---

## How to redeploy

The `deploy/azure-initial` branch + `DEPLOYMENT.md` together form a
reproducible deploy recipe. The full process:

1. **Azure account** -- sign up for Azure for Students (institutional .edu/.ca
   email) or a standard Azure Free Account (requires credit card).
2. **Provision resources** -- follow `DEPLOYMENT.md` "Azure resources" section.
   The deploy used `canadacentral` region, B1 Linux App Service plan, and a
   Standard_B2pls_v2 ARM VM for MySQL (managed MySQL was blocked on the
   Student tier).
3. **Set environment variables** -- see `DEPLOYMENT.md` "App Service env vars."
   Firebase credentials, Monday API token, DB connection, CORS origins.
4. **Deploy via GitHub Actions** -- two `workflow_dispatch` workflows
   (`deploy-api.yml`, `deploy-web.yml`) deploy from the branch. Trigger
   manually via `gh workflow run`.
5. **Re-register Monday webhooks** -- run
   `node scripts/monday-register-webhook.js --register --url https://<api-host>`
   after the API is live.
6. **Restore the database** -- load the mysqldump into the new MySQL instance,
   or start fresh from `apps/api/db/init/01_schema.sql` + migrations in
   `apps/api/db/migrations/`.

Estimated cost on Azure for Students: ~$33 USD/month (~3 months on the $100
credit).

---

## Known issues at time of tear-down

These were logged in `DEPLOYMENT.md` during the deploy and remain unresolved.

### Security

- SSH on the MySQL VM was open to all IPs (key-only auth, but noisy)
- Technician permission level could delete work requests via the web UI
- No employee invite flow -- Firebase users must be seeded manually

### UX

- Flash of unauthenticated layout shell on direct URL navigation
- Dual due-date concepts (request due date vs scheduled event time)
- Assign tasks page pill styling (oval badges wrapping awkwardly)
- Completed work requests appearing in the Assigned tab

### CI / Pipeline

- `deploy/azure-initial` has 2 commits beyond the PR #77 merge -- these need
  a follow-up PR to land in `main`
- `deploy-web.yml` regenerates lockfile on each run (Tailwind 4 cross-platform workaround)
- GitHub Actions checkout/setup-node use Node 20 (deprecated, forced Node 24 on 2026-06-02)

### Operational

- No automated MySQL backups existed (demo-acceptable, not production-ready)
- Web deploys use full `node_modules/` (not Next.js standalone output)

---

## Post-launch work queue

A detailed breakdown lives in `.agents/plans/mobile-post-launch-sprint.md`
(9 chunks). The recommended execution order:

### Priority 1 -- Unblock real users

1. **Employee invite flow** -- `POST /employees` creates Firebase user + sends
   password-reset email. Without this, every new technician must be manually
   seeded in Firebase console.
2. **EAS dev build + push notifications** -- Expo Go cannot receive pushes.
   Requires a native dev build, device token registration, send logic, and
   deep linking. User's stated top priority.

### Priority 2 -- Quality floor

3. **Dark mode migration** (mobile) -- infrastructure exists (`useTheme()` hook,
   `COLORS_DARK` palette), only `SettingsPage` uses it. 8 screens need migration.
4. **Session recovery + error retries** -- 401 handling, retry buttons,
   pull-to-refresh. Currently token expiry shows a generic error.
5. **Form state hygiene** -- `WorkRequestSubmit` has no loading/error states
   on submission, no discard-changes guard.

### Priority 3 -- Feature gaps

6. **Mobile features** -- map/navigate link, job history, schedule range
   toggle, profile editing, post-completion photos, offline support (stretch).
7. **Store readiness** -- `app.json` branding, `eas.json` submit profile,
   `infoPlist` permission descriptions, account deletion verification.

### Priority 4 -- Polish

8. **Design polish** -- spacing scale normalization, pressed states, card
   hierarchy.
9. **Web follow-ups** -- notification center, session timeout handling,
   inactive employee filtering, login page rewrite, Google Places activation,
   calendar tests, API error shape consistency.

### Strategic note

A "technician-first mobile redesign" brainstorm was recommended before
executing any of these chunks. The current mobile app skews manager-oriented
(full 20-field work request form, "Your submissions" dashboard section) rather
than field-operative (no route planning, no tap-to-navigate, no
before/after photos, no time tracking). That brainstorm should reshape
priorities 2-4 above.

---

## Repository structure

```
greenery/
  apps/
    api/          Express 5 REST API
    web/          Next.js 16 dashboard
    mobile/       Expo 54 React Native app
  DEPLOYMENT.md   Azure deploy recipe + operational reference
  CHANGELOG.md    Full development log with lessons learned
  CLAUDE.md       AI assistant context (development tooling)
  HANDOFF.md      This file
```

### Key branches

| Branch | Purpose |
|---|---|
| `main` | Stable trunk |
| `Denver` | Development branch (14+ commits ahead during active development) |
| `deploy/azure-initial` | Azure deploy branch with CI workflows + env config |

---

## Contacts

- **Developer:** Denver Timlick (denvertimlick@gmail.com)
- **Seeded SuperAdmin:** denvertimlick@gmail.com (employees.id=1)
- **Azure subscription:** Azure for Students (`f708ae83-17fd-40c7-8b01-f9f8ab3b6430`)
