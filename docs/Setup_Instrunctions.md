# ⚙️ Greenery — Setup Instructions

---

## Prerequisites

| Tool | Required | Download |
|---|---|---|
| Node.js 18+ | ✅ | https://nodejs.org |
| Docker Desktop | ✅ | https://docker.com |
| Git | ✅ | https://git-scm.com |
| Expo Go (phone) | ✅ | Play Store / App Store |
| Android Studio | Optional | https://developer.android.com/studio |

---

## Step 1 — Clone

```bash
git clone https://github.com/Denver-T/greenery.git
cd greenery
```

---

## Step 2 — Database

```bash
cd apps/api/db
docker-compose up -d
```

Verify: `docker ps` — you should see `greenery_mysql` and `greenery_adminer` running.

Open Adminer at `http://localhost:8080`:

| Field    | Value            |
|----------|------------------|
| System   | MySQL            |
| Server   | `greenery_mysql` |
| Username | `greenery_user`  |
| Password | `greenery_pass`  |
| Database | `greenery`       |

---

## Step 3 — API

Create `apps/api/.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=greenery_user
DB_PASSWORD=greenery_pass
DB_NAME=greenery

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

> ⚠️ `FIREBASE_PRIVATE_KEY` must be on ONE line using `\n` — no real line breaks.
> Get credentials from: Firebase Console → Project Settings → Service Accounts → Generate new private key

```bash
cd apps/api
npm install
npm start
```

Verify:
- `http://localhost:3001/health` → `{ "status": "ok" }`
- `http://localhost:3001/db-health` → DB connected
- `http://localhost:3001/api-docs` → Swagger UI

---

## Step 4 — Add Your User

```bash
cd apps/api
node setRole.js your@email.com admin
```

Valid roles: `admin`, `manager`, `technician`

This creates your record in both Firebase (custom claims) and MySQL automatically.

> Your email must already exist in Firebase Authentication. Go to Firebase Console → Authentication → Users → Add user if needed.

---

## Step 5 — Mobile App

**Find your local IP:**
```bash
# Windows
ipconfig
# Look for IPv4 Address under Wi-Fi (e.g. 10.0.0.93)

# Mac/Linux
ifconfig
```

Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Use your PC's local IP — NOT localhost
EXPO_PUBLIC_API_BASE_URL=http://10.0.0.93:3001
```

> ⚠️ Phone and PC must be on the **same Wi-Fi network**.

```bash
cd apps/mobile
npm install
npx expo start
```

- **Phone:** Scan QR code with Expo Go
- **Android emulator:** Press `a` in terminal
- **Clean restart:** `npx expo start -c`

---

## Step 6 — Web App (Optional)

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

```bash
cd apps/web
npm install
npm run dev
```

Opens at `http://localhost:3000`

---

## Step 7 — Seed Test Data (Optional)

See `fixtures/SEED_SETUP.md` for SQL seed blocks and instructions.

---

## Daily Startup Order

```
Terminal 1:  cd apps/api/db  →  docker-compose up -d
Terminal 2:  cd apps/api     →  npm start
Terminal 3:  cd apps/mobile  →  npx expo start
Terminal 4:  cd apps/web     →  npm run dev  (optional)
```

---

## Troubleshooting

### Network request failed on phone
- Phone and PC must be on the **same Wi-Fi**
- Use local IP (e.g. `10.0.0.93`) not `localhost` in `.env`
- Turn off Windows Defender Firewall temporarily
- Run `npx expo start --tunnel` as a fallback

### ACCOUNT_NOT_FOUND after login
```bash
node setRole.js your@email.com admin
```

### connect ECONNREFUSED 127.0.0.1:3307
```bash
cd apps/api/db
docker-compose up -d
```

### Failed to parse private key
- `FIREBASE_PRIVATE_KEY` must be on a single line
- Use `\n` characters (not real line breaks)
- Keep it wrapped in double quotes

### Port 8081 already in use
Expo will suggest 8082 automatically — press `y`.

### Android SDK not found
1. Install Android Studio
2. Open SDK Manager → install SDK Platform-Tools
3. Add environment variable `ANDROID_HOME = C:\Users\<you>\AppData\Local\Android\Sdk`
4. Add to PATH: `%ANDROID_HOME%\platform-tools`
5. Restart VS Code

### Blank white screen in browser
This is a **React Native app**, not a web app.
Use Expo Go on your phone or an Android emulator — the browser won't work.