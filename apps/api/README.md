# Greenery API

The API is an Express application backed by MySQL. It is the source of truth for:

- employee identity and permission resolution
- work requests and assignment workflows
- scheduling data
- super-admin governance and activity logging

## Key Responsibilities

- verify Firebase ID tokens
- map authenticated users to `employees`
- enforce permission-based authorization
- provide schema-backed REST endpoints for web and mobile
- write audit events for privileged operations

## Important Directories

```text
config/              Environment-backed infrastructure config
db/                  Docker + schema setup for local MySQL
src/app.js           Express composition root
src/server.js        HTTP bootstrap
src/db/              Shared MySQL access layer
src/middleware/      Auth, authorization, rate limiting, error handling
src/controllers/     Request handlers
src/services/        Schema-aware data access/business rules
src/routes/          Route modules
src/utils/           Shared helpers such as http errors and activity logging
```

## Auth and Access Model

The API does not trust frontend role state.

Request flow:

1. Firebase ID token is verified
2. authenticated email is resolved against `employees`
3. `permissionLevel` becomes the current authority model
4. route access is enforced hierarchically

Hierarchy:

- `Technician`
- `Manager`
- `Administrator`
- `SuperAdmin`

`role` remains the job role.  
`permissionLevel` governs platform access.

## Super Admin Features

Super-admin capabilities are exposed under `/superadmin`:

- `GET /superadmin/logs`
- `GET /superadmin/employees`
- `PATCH /superadmin/employees/:id/permission-level`

These routes support:

- activity-log review
- admin promotion
- super-admin promotion

## Local Setup

### Environment

Create `apps/api/.env`:

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

### Database

```bash
cd db
docker compose up -d
```

Schema file:

- `db/init/01_schema.sql`

### Run

```bash
npm install
npm run dev
```

## Useful Scripts

- `npm run dev`
- `npm run start`
- `npm run lint`
- `node setRole.js <email> <technician|manager|admin|superadmin>`

## Maintenance Notes

- prefer service-layer writes over ad hoc SQL in controllers
- use `httpError()` for application errors
- use `logActivity()` for privileged or destructive operations
- keep new permission logic in `src/utils/permissions.js` so auth, controllers, and routes stay aligned
