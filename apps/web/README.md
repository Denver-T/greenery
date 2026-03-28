# Greenery Web

The web app is a Next.js operations dashboard for staffing, request intake, scheduling, and platform governance.

## Primary Areas

- dashboard overview
- request intake and queue management
- assignment and scheduling
- team management
- super-admin governance

## Environment

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

## Run

```bash
npm install
npm run dev
```

## Architecture Notes

- the app uses the shared `fetchApi()` helper for authenticated backend access
- the backend is responsible for permission enforcement
- the sidebar and governance UI reflect the current employee `permissionLevel`
- request deletion and recovery are handled in-app instead of relying on browser-native prompts

Key files:

- `src/lib/api/api.js`
- `src/components/AppShell.js`
- `src/components/Sidebar.js`
- `src/app/tasks/page.js`
- `src/app/superadmin/page.js`

## Quality Notes

- keep layout, color, spacing, and surface treatment aligned with shared shell patterns
- prefer structured workflow pages over one-off admin tables
- verify contrast and responsive behavior on every major screen before merging visual changes
