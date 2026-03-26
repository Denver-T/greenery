# 🌱 Greenery Platform

Greenery is a full-stack mobile and web platform for managing plant maintenance and greenhouse operations. It supports field technicians via a mobile app and managers/administrators via a web dashboard, all backed by a shared REST API and MySQL database.

---

## 🧩 Architecture Overview

```
Mobile App (React Native / Expo)
        │
        │  Firebase ID Token (Bearer)
        ▼
Backend API (Node.js / Express)  ←──  Web App (Next.js)
        │
        │  SQL queries
        ▼
MySQL Database (Docker locally / Railway in staging)
```

---

## 🚀 Core Features

### 📱 Technicians (Mobile)
- Login with Firebase Authentication
- View and submit Work Requests
- Track assigned tasks and update status
- View Weekly Schedule and Event Calendar
- Book Time Off (PTO requests)
- Access plant-specific details

### 🖥️ Managers / Administrators (Web)
- Manage employees and roles
- Assign and track tasks
- View dashboard analytics
- Manage work requests and inventory
- Calendar view for scheduling

### ⚙️ Backend API
- RESTful API with structured routing
- Firebase token verification middleware
- Role-based access control (technician / manager / administrator)
- Multer-based image uploads for work requests
- Swagger documentation at `/api-docs`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 54 |
| Web | Next.js 14, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MySQL 8 (Docker locally) |
| Auth | Firebase Authentication + Admin SDK |
| Dev Tools | Docker, Adminer, Swagger, ESLint |

---

## 📁 Project Structure

```
greenery/
├── apps/
│   ├── api/              # Express REST API
│   │   ├── config/       # Firebase + DB + Swagger config
│   │   ├── db/           # Docker Compose + SQL schema
│   │   ├── src/
│   │   │   ├── routes/   # Route handlers
│   │   │   ├── services/ # Business logic
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   └── uploads/      # Work request images
│   ├── mobile/           # React Native / Expo app
│   │   ├── pages/        # Screen components
│   │   ├── components/   # Shared UI components
│   │   └── util/         # API helpers, Firebase client
│   └── web/              # Next.js web dashboard
│       ├── src/app/      # Next.js app router pages
│       ├── src/components/
│       └── src/lib/
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+ (see `.nvmrc`)
- Docker Desktop
- Expo Go app on your phone (or Android emulator)
- Firebase project credentials

---

### 1. Clone the Repository
```bash
git clone https://github.com/Denver-T/greenery.git
cd greenery
```

---

### 2. Start the Database
```bash
cd apps/api/db
docker-compose up -d
```

This starts:
- **MySQL** on port `3307`
- **Adminer** (DB UI) on port `8080`

Access Adminer at `http://localhost:8080` with:
| Field | Value |
|---|---|
| System | MySQL |
| Server | `greenery_mysql` |
| Username | `greenery_user` |
| Password | `greenery_pass` |
| Database | `greenery` |

---

### 3. Set Up the API

Create `apps/api/.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=greenery_user
DB_PASSWORD=greenery_pass
DB_NAME=greenery

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Then install and start:
```bash
cd apps/api
npm install
npm start
```

API runs at `http://localhost:3001`

Verify with:
- `http://localhost:3001/health` → `{ "status": "ok" }`
- `http://localhost:3001/db-health` → DB connection status
- `http://localhost:3001/api-docs` → Swagger UI

---

### 4. Add Your First User

After the API is running, assign yourself a role:
```bash
cd apps/api
node setRole.js your@email.com admin
```

This creates your account in both Firebase and MySQL.

---

### 5. Set Up the Mobile App

Create `apps/mobile/.env`:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Use your computer's local IP (not localhost) when testing on a real device
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3001
```

> ⚠️ Find your local IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux). Look for the IPv4 address under your Wi-Fi adapter.

Then install and start:
```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` for Android emulator.

---

### 6. Set Up the Web App

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

Then install and start:
```bash
cd apps/web
npm install
npm run dev
```

Web app runs at `http://localhost:3000`

---

## 🔄 Start Order (Every Session)

Always start services in this order:
```
1. docker-compose up -d     (database)
2. npm start                (API)
3. npx expo start           (mobile)
4. npm run dev              (web - optional)
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/health` | API health check | None |
| GET | `/db-health` | Database health check | None |
| POST | `/auth/login` | Firebase token exchange | None |
| GET | `/auth/me` | Get current user | ✅ |
| GET | `/employees` | List employees | ✅ |
| GET | `/reqs` | List work requests | ✅ |
| POST | `/reqs` | Create work request | ✅ |
| GET | `/tasks` | List tasks | ✅ |
| GET | `/plants` | List plants | ✅ |
| GET | `/schedule` | List schedule events | ✅ |
| POST | `/schedule` | Create schedule event | ✅ |

Full interactive docs: `http://localhost:3001/api-docs`

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `accounts` | User accounts linked to Firebase |
| `employees` | Employee profiles and roles |
| `plants` | Plant inventory |
| `work_reqs` | Work/service requests |
| `schedule_events` | Calendar events |
| `notifications` | Employee notifications |

---

## 🔐 Authentication Flow

```
Mobile App
    │ Email + Password
    ▼
Firebase Auth → returns ID Token
    │ Bearer <token>
    ▼
API /auth/me → verifyIdToken()
    │
    ▼
accounts table (MySQL) → authenticated session
```

---

## 🐛 Common Issues

| Problem | Fix |
|---|---|
| `Network request failed` on phone | Use your PC's local IP in `.env`, not `localhost` |
| `ACCOUNT_NOT_FOUND` on login | Run `node setRole.js your@email.com admin` |
| `connect ECONNREFUSED :3307` | Run `docker-compose up -d` first |
| `Failed to parse private key` | Make sure `FIREBASE_PRIVATE_KEY` is on one line with `\n` |
| Port 8081 already in use | Expo will auto-use 8082 — press `y` to confirm |
| Android SDK not found | Install Android Studio and set `ANDROID_HOME` env variable |

---

## 👥 Team & Contributions

| Area | Description |
|---|---|
| Backend API | RESTful endpoints, auth middleware, route structure |
| Mobile App | React Native screens, Firebase integration, navigation |
| Web App | Next.js dashboard, employee and task management |
| Database | MySQL schema design, Docker setup |
| DevOps | GitHub Actions lint workflow, environment configuration |

---

## 📋 QA Checklist

See `docs/QA_CHECKLIST.md` for manual test plans covering login, PTO, and work requests.

---

## 📄 License

This project was developed as a capstone project. All rights reserved by the team.