# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Greenery is a full-stack operations platform for plant maintenance teams. Three apps share a single API backend:

- **apps/api** — Express 5 + MySQL 8 REST API (auth, business logic, file uploads)
- **apps/web** — Next.js 16 operations dashboard (Tailwind CSS 4, React 19)
- **apps/mobile** — Expo 54 React Native field app for technicians

All JavaScript (no TypeScript). Each app has its own `package.json` and `node_modules` — there is no shared workspace root.

## Commands

### Database

```bash
cd apps/api/db && docker compose up -d   # MySQL on 127.0.0.1:3307, Adminer on :8081
```

Schema lives in `apps/api/db/init/01_schema.sql`. No migration tool — changes are manual SQL.

### API

```bash
cd apps/api
npm install
npm run dev       # nodemon, port 3001
npm run start     # production
npm run lint      # eslint (v9 flat config)
```

Health: `localhost:3001/health`, `localhost:3001/db-health`
Swagger: `localhost:3001/api-docs`

### Web

```bash
cd apps/web
npm install
npm run dev       # Next.js + Turbopack, port 3000
npm run build
npm run lint
```

### Mobile

```bash
cd apps/mobile
npm install
npx expo start -c           # port 8082
npm run ios / npm run android
npm run lint
```

Physical devices must use LAN IP, not localhost, for `EXPO_PUBLIC_API_BASE_URL`.

### Lint All Apps

```bash
cd apps/api && npm run lint && cd ../web && npm run lint && cd ../mobile && npm run lint
```

CI runs this via `.github/workflows/lint.yml` on PRs and pushes to main.

### Set User Role (CLI)

```bash
cd apps/api && node setRole.js <email> <role>
```

## Architecture

### Auth Flow

1. Client signs in via Firebase (email/password or Google OAuth)
2. Client sends `Authorization: Bearer <firebase-id-token>` to API
3. `authMiddleware.js` verifies token with Firebase Admin SDK, resolves email to `employees` row
4. `req.user` is populated with `{ uid, email, employeeId, role, permissionLevel, employee }`
5. `authorize()` middleware enforces hierarchical permission: Technician (1) < Manager (2) < Administrator (3) < SuperAdmin (4)

`permissionLevel` = platform access. `role` = operational job title. These are separate concerns.

### API Layering

Routes → Controllers → Services → MySQL (mysql2 parameterized queries). No ORM.

- **Routes** (`src/routes/`) — mount middleware (`authMiddleware`, `authorize`, `writeLimiter`) and delegate to controllers
- **Controllers** (`src/controllers/`) — parse request, call service, format response
- **Services** (`src/services/`) — own all SQL and business rules
- **Middleware** (`src/middleware/`) — auth, authorization, rate limiting, error handling

### Key Utilities

- `src/utils/permissions.js` — single source of truth for the permission hierarchy
- `src/utils/activityLogger.js` — non-blocking audit logging for privileged operations
- `src/utils/httpError.js` — structured error factory (`httpError(status, message, code)`)

### Web Patterns

- Next.js app directory (`src/app/`)
- `Sidebar` reflects current user's `permissionLevel`
- `fetchApi()` in `src/lib/api/api.js` handles auth headers and error responses

### Mobile Patterns

- `MobileScaffold.js` provides shared shell (header/footer rhythm)
- `NavBar.js` handles bottom tab navigation
- `apiFetch()` in `util/api.js` mirrors web's `fetchApi()`
- Design tokens centralized in `theme.js`

### Data Models

Core tables: `employees`, `work_reqs` (50+ fields), `schedule_events`, `plants`, `activity_logs`, `notifications`. Schema in `apps/api/db/init/01_schema.sql`.

### API Routes

| Prefix | Purpose |
|---|---|
| `/auth` | Session bootstrap (`GET /auth/me`) |
| `/employees` | Employee CRUD |
| `/reqs` | Work request lifecycle (create, assign, update status, delete) |
| `/schedule` | Calendar events |
| `/plants` | Plant inventory |
| `/superadmin` | Governance (activity logs, permission management) |
| `/uploads` | Uploaded request photos (static) |

## Environment

Each app needs its own `.env` (API), `.env.local` (web), or `.env` (mobile). See README.md for required variables. Firebase credentials differ between client (API key) and server (service account private key).

## Design System

Custom design philosophy defined in `.claude/design/`. Key principles: no generic SaaS patterns, intentional aesthetic, custom fonts. See `philosophy.md`, `web.md`, and `mobile.md` for specifics.
