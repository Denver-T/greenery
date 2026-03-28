# Greenery

Greenery is a full-stack operations platform for plant maintenance teams. It includes:

- a Next.js web application for operations, scheduling, staffing, and governance
- an Expo mobile application for field-facing workflows
- an Express + MySQL API that owns authentication, authorization, and business data

The current platform is organized around a single backend source of truth:

- `employees` for people and access control
- `work_reqs` for work requests and assignment state
- `schedule_events` for calendar/scheduling
- `activity_logs` for super-admin governance history

## Repository Layout

```text
apps/
  api/     Express API + MySQL access layer
  mobile/  Expo React Native app
  web/     Next.js operations dashboard
```

## Core Architecture

### Authentication

- Firebase Authentication is used for sign-in
- the API verifies Firebase ID tokens with the Firebase Admin SDK
- the API resolves the authenticated email against the `employees` table
- `permissionLevel` in MySQL is the application authority model

### Authorization

The API uses a hierarchical access model:

- `Technician`
- `Manager`
- `Administrator`
- `SuperAdmin`

`role` is treated as the operational job role.  
`permissionLevel` is treated as the platform access level.

### Governance

Super admins can:

- review the activity log
- promote employees to administrator or super-admin access
- manage privileged access without relying on frontend-only checks

## Local Development

### Prerequisites

- Node.js 18+
- npm
- Docker Desktop
- a Firebase project configured for web/mobile sign-in

### 1. Start MySQL

```bash
cd apps/api/db
docker compose up -d
```

The local database runs on `127.0.0.1:3307`.

### 2. Start the API

Create `apps/api/.env` with your local values:

```env
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=greenery
DB_USER=greenery_user
DB_PASSWORD=greenery_pass
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Then run:

```bash
cd apps/api
npm install
npm run dev
```

API health checks:

- `http://localhost:3001/health`
- `http://localhost:3001/db-health`

### 3. Start the Web App

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Run:

```bash
cd apps/web
npm install
npm run dev
```

### 4. Start the Mobile App

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3001
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

Run:

```bash
cd apps/mobile
npm install
npx expo start -c
```

When using a physical device, do not use `localhost`; use your computer's LAN IP.

## Quality Checks

```bash
cd apps/api && npm run lint
cd ../web && npm run lint
cd ../mobile && npm run lint
```

## High-Risk Areas

Before merging or deploying, validate these flows end to end:

- Firebase login -> `/auth/me`
- employee management permissions
- work request create, edit, delete, and undo delete
- assignment and scheduling
- super-admin promotion and activity-log access

## Notes

- keep Firebase Admin credentials server-side only
- keep `.env` files out of git
- prefer updating shared API helpers and shared theme tokens instead of duplicating logic per screen
