Mobile Authentication (Firebase)

This document explains how the mobile application authenticates users using Firebase Authentication and connects to the Greenery API.

The mobile app uses Firebase Auth for identity and sends Firebase ID tokens to the backend API for verification.

⸻

Authentication Flow
Mobile App
    │
    │ Email + Password Login
    ▼
Firebase Authentication
    │
    │ Returns Firebase ID Token
    ▼
Mobile App
    │
    │ Authorization: Bearer <token>
    ▼
Greenery API (/auth/me)
    │
    │ verifyIdToken()
    ▼
Accounts Table (MySQL)
    │
    ▼
Authenticated User Session

The backend verifies the Firebase token and maps the Firebase user email to an internal account.

Environment Setup

Create a .env file in the mobile folder:
apps/mobile/.env

EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

EXPO_PUBLIC_API_BASE_URL=http://YOUR_LOCAL_IP:3001

Important
When testing on a physical phone, do not use localhost.
Instead use your computer’s local IP address.

Example:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3001

Firebase Configuration
Firebase client configuration is located in:
apps/mobile/util/firebase.js

This file:
	•	initializes the Firebase app
	•	initializes Firebase Auth
	•	persists authentication using AsyncStorage
	•	exports helper functions for login and logout


Login Implementation
The login screen calls the Firebase helper:
login(email, password)

This internally calls:
signInWithEmailAndPassword()

After successful login the app retrieves the Firebase ID token:
const token = await user.getIdToken()

The token is sent to the backend:
GET /auth/me
Authorization: Bearer <token>

Backend Verification
The API verifies the Firebase token using the Firebase Admin SDK.

admin.auth().verifyIdToken(token)

If valid, the backend extracts the email and looks up the corresponding account in the database.

Account Requirement
A matching email must exist in the accounts table.

Example:
accounts.email = firebaseUser.email

If no matching account exists the API returns:
ACCOUNT_NOT_FOUND

To add a user manually:
INSERT INTO accounts (name, role, email)
VALUES ('User Name', 'technician', 'user@email.com');

Running the Mobile App
From the mobile directory:
npx expo start

For a clean restart:
npx expo start -c

Then open the app using:
	•	Expo Go
	•	Android Emulator
	•	iOS Simulator


Common Issues

Network request failed

This usually means the phone cannot reach the API.

Ensure:
	•	phone and computer are on the same network
	•	API base URL uses your computer’s IP
	•	API server is running

⸻

Invalid authentication token

Possible causes:
	•	Firebase project mismatch
	•	incorrect Firebase Admin configuration
	•	stale ID token

Restart both the API and Expo server.

⸻

Account not found

The Firebase user email does not exist in the database.

Add the email to the accounts table.

⸻

Notes for Future Developers
	•	Firebase client configuration values are public and safe to include in the mobile app.
	•	Firebase Admin credentials must remain server-side only.
	•	The backend handles all authorization and role checks.


Files Related to Authentication
apps/mobile/util/firebase.js
apps/mobile/pages/LoginScreen.js
apps/api/config/firebase.js
apps/api/src/middleware/authMiddleware.js
apps/api/src/routes/auth.js