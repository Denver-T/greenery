# Greenery Mobile

The mobile app is an Expo React Native client aimed at field-facing workflows. It uses Firebase Authentication for sign-in and the Greenery API for all protected business data.

## Current Focus

- login and authenticated session bootstrap
- technician-first dashboard and request queue visibility
- work request detail and submission flows
- schedule visibility
- a shared mobile shell with one navigation pattern across primary screens

## Environment

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

When testing on a physical device, use your computer's LAN IP instead of `localhost`.

## Authentication Flow

1. user signs in with Firebase email/password
2. Firebase returns an ID token
3. mobile sends `Authorization: Bearer <token>` to the API
4. API verifies the token and resolves the user from `employees`
5. `/auth/me` returns the current employee record and permission context

Relevant files:

- `util/firebase.js`
- `util/api.js`
- `pages/LoginPage.js`
- `components/MobileScaffold.js`
- `components/NavBar.js`

## Run

```bash
npm install
npm start
```

This workspace defaults Expo/Metro to port `8082` through the package scripts so local Docker usage on `8081` does not keep interrupting mobile startup. `npx expo start --port 8082` also works when you want to run Expo directly.

## Quality Notes

- mobile screens should go through `apiFetch()` instead of bespoke fetch logic
- backend response handling should assume wrapped `{ data: ... }` payloads
- incomplete backend-backed features should fail clearly instead of appearing partially live

## Files Worth Understanding

- `theme.js`: shared visual tokens
- `components/MobileScaffold.js`: shared shell, top bar, hero, and footer rhythm
- `components/NavBar.js`: primary mobile navigation
- `pages/Dashboard.js`: field-facing summary view
- `pages/WorkRequestView.js`: request queue
- `pages/WorkRequestDetails.js`: request detail workflow
- `pages/SettingsPage.js`: account/support/settings surface
