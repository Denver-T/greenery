# Feature: API Test Suite

Read the context references and validate patterns before starting.
Pay attention to naming, imports, and existing utilities — don't reinvent what exists.

## Feature Description
Add a comprehensive test suite to the Greenery API using Jest and Supertest. Tests cover utilities (pure functions), middleware (auth, authorization, error handling), services (with mocked DB), and route-level integration tests (full HTTP round-trips). No production code refactoring required — Jest's module mocking handles the singleton DB pool and Firebase admin.

## User Story
As a developer working on the Greenery API
I want automated tests covering auth, CRUD, and permissions
So that I can catch regressions before they reach production

## Feature Metadata
- **Type**: New Capability
- **Complexity**: High
- **Systems Affected**: apps/api only
- **Dependencies**: jest, supertest (new dev dependencies)

---

## Standards & Design Constraints

### Testing (from testing.md)
- Co-locate test files: `foo.js` → `foo.test.js` in the same directory
- One logical assertion per test. Clear Arrange / Act / Assert with blank lines between
- `describe` blocks: noun/system under test. `it` blocks: full sentence from user's perspective
- Factories for test data — never repeat inline raw objects
- Mock at system boundary only: DB, Firebase, filesystem. Never mock internal business logic
- Integration tests > unit tests for coverage priority
- Always await async operations. Test both success and failure paths
- Prioritize: auth flows, data mutations, validation logic, error handling paths

### Security (from security.md)
- Never hardcode secrets in test files — use fake/placeholder values only
- Test that auth is enforced on protected endpoints (401 without token, 403 without permission)
- Test that parameterized queries are used (no SQL injection vectors)

### Performance (from performance.md)
- No special constraints for test suite — tests run offline against mocks

### Design
- N/A — no UI changes

---

## CONTEXT REFERENCES

### Files to Read Before Implementing
- `apps/api/src/db/index.js` — DB singleton to mock (exports `query`, `getPool`)
- `apps/api/config/firebase.js` — Firebase admin singleton to mock (exports `admin`)
- `apps/api/src/app.js` — Express app export (supertest target, no `.listen()`)
- `apps/api/src/middleware/authMiddleware.js` — `verifyToken` middleware, sets `req.user`
- `apps/api/src/middleware/authorize.js` — `authorize(...roles)` permission check
- `apps/api/src/middleware/errorHandler.js` — Global error handler, standardized response shape
- `apps/api/src/middleware/rateLimiters.js` — `loginLimiter`, `writeLimiter`
- `apps/api/src/utils/httpError.js` — Error factory: `httpError(status, message, code, details)`
- `apps/api/src/utils/permissions.js` — Permission hierarchy and normalization
- `apps/api/src/utils/validators.js` — `isNonEmptyString`, `toPositiveInt`, `validateString`, `validateEmail`, `validatePhone`, `validateEnum`, `validateUrl`, `validatePassword`
- `apps/api/src/services/employeesService.js` — Employee CRUD, imports `../db` directly
- `apps/api/src/services/taskService.js` — Task CRUD, imports `../db` directly
- `apps/api/src/services/plantService.js` — Plant CRUD with transactions, imports `../db` directly
- `apps/api/src/controllers/employeesController.js` — Employee handlers
- `apps/api/src/controllers/taskController.js` — Task handlers
- `apps/api/src/controllers/plantController.js` — Plant handlers
- `apps/api/src/routes/employees.js` — Employee route definitions
- `apps/api/src/routes/tasks.js` — Task route definitions
- `apps/api/src/routes/plants.js` — Plant route definitions (includes multer)
- `apps/api/src/routes/auth.js` — Auth route definitions (`/me`, `/my-tasks`, `/health`)
- `apps/api/src/routes/reqs.js` — Work request routes (inline handlers)
- `apps/api/src/routes/schedule.js` — Schedule routes (inline handlers, `ensureScheduleColumns`)
- `apps/api/src/routes/superadmin.js` — Superadmin routes
- `apps/api/package.json` — Add test deps and scripts here
- `apps/api/eslint.config.js` — Add jest globals here

### New Files to Create
- `apps/api/jest.config.js` — Jest configuration
- `apps/api/src/test/setup.js` — Global test setup (mock reset, env vars)
- `apps/api/src/test/factories.js` — Test data factories (employees, tasks, plants, users)
- `apps/api/src/test/mockDb.js` — Shared DB mock helper
- `apps/api/src/test/mockAuth.js` — Shared auth mock helper (Firebase + verifyToken bypass)
- `apps/api/src/utils/httpError.test.js` — httpError unit tests
- `apps/api/src/utils/permissions.test.js` — Permission hierarchy unit tests
- `apps/api/src/utils/validators.test.js` — Validator unit tests
- `apps/api/src/middleware/authMiddleware.test.js` — Auth middleware tests
- `apps/api/src/middleware/authorize.test.js` — Authorization middleware tests
- `apps/api/src/middleware/errorHandler.test.js` — Error handler tests
- `apps/api/src/services/employeesService.test.js` — Employee service tests
- `apps/api/src/services/taskService.test.js` — Task service tests
- `apps/api/src/routes/employees.test.js` — Employee route integration tests
- `apps/api/src/routes/tasks.test.js` — Task route integration tests
- `apps/api/src/routes/auth.test.js` — Auth route integration tests

### Patterns to Follow

**DB query mock pattern** (services return `[rows, fields]` tuples from mysql2):
```javascript
// In test file
jest.mock("../db");
const db = require("../db");

beforeEach(() => {
  jest.clearAllMocks();
});

it("returns all employees", async () => {
  const mockRows = [factories.employee(), factories.employee({ id: 2 })];
  db.query.mockResolvedValue([mockRows, []]);

  const result = await employeesService.listEmployees();

  expect(db.query).toHaveBeenCalledWith(expect.stringContaining("SELECT"), undefined);
  expect(result).toHaveLength(2);
});
```

**Firebase mock pattern:**
```javascript
jest.mock("../../config/firebase", () => ({
  auth: () => ({
    verifyIdToken: jest.fn(),
  }),
}));
```

**Supertest integration pattern:**
```javascript
const request = require("supertest");
const app = require("../app");

// Mock Firebase and DB before importing app
jest.mock("../db");
jest.mock("../../config/firebase", () => ({
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: "firebase-uid-1",
      email: "tech@greenery.test",
    }),
  }),
}));

// Mock employee lookup in auth middleware
const db = require("../db");
const { factories } = require("../test/factories");

beforeEach(() => {
  // Auth middleware calls getEmployeeByEmail which calls db.query
  // Set up default auth mock for all requests
});
```

**Express middleware test pattern:**
```javascript
const mockReq = (overrides = {}) => ({
  headers: {},
  user: null,
  ...overrides,
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();
```

**Error response shape** (from errorHandler.js):
```javascript
{
  status: "error",
  code: "VALIDATION_ERROR",
  message: "Invalid input",
  details: [{ field: "email", issue: "required" }],
  timestamp: "ISO string"
}
```

**Naming Conventions:** camelCase functions, UPPER_SNAKE constants, kebab-case files
**Error Handling:** `next(httpError(status, message, code, details))` — never throw in controllers
**Logging:** `console.error` for 5xx, non-blocking `logActivity()` for audit trail

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
Install dependencies, configure Jest, create shared test utilities and factories.

### Phase 2: Unit Tests
Test pure functions — utilities that have zero external dependencies.

### Phase 3: Middleware Tests
Test auth, authorization, and error handling middleware with mocked req/res/next.

### Phase 4: Service Tests
Test business logic in services with mocked DB layer.

### Phase 5: Integration Tests
Test full HTTP round-trips with supertest, mocked DB + Firebase.

---

## STEP-BY-STEP TASKS

### Task 1: Install test dependencies

- **IMPLEMENT**: Add jest and supertest as devDependencies
- **COMMAND**:
  ```bash
  cd apps/api && npm install --save-dev jest supertest
  ```
- **VALIDATE**: `cd apps/api && node -e "require('jest'); require('supertest'); console.log('ok')"`

### Task 2: Create `apps/api/jest.config.js`

- **IMPLEMENT**: Jest configuration for CommonJS Node project
  ```javascript
  module.exports = {
    testEnvironment: "node",
    setupFilesAfterEnv: ["./src/test/setup.js"],
    testMatch: ["**/*.test.js"],
    coverageDirectory: "coverage",
    collectCoverageFrom: [
      "src/**/*.js",
      "!src/test/**",
      "!src/server.js",
    ],
  };
  ```
- **GOTCHA**: Use `setupFilesAfterEnv` (not `setupFiles`) — we need Jest globals like `afterEach` available in setup.js
- **VALIDATE**: `cd apps/api && npx jest --version`

### Task 3: Update `apps/api/package.json` test script

- **IMPLEMENT**: Replace the placeholder test script
  ```json
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
  ```
- **VALIDATE**: `cd apps/api && npm test -- --version`

### Task 4: Update `apps/api/eslint.config.js`

- **IMPLEMENT**: Add jest globals to eslint config so `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `jest` are recognized
- **PATTERN**: Existing config uses flat config format (ESLint v9)
- **GOTCHA**: Don't break existing config — add to the existing array, don't replace it
- **VALIDATE**: `cd apps/api && npm run lint`

### Task 5: Create `apps/api/src/test/setup.js`

- **IMPLEMENT**: Global test setup that runs before each test file
  ```javascript
  // Set test environment variables (fake values only)
  process.env.DB_HOST = "localhost";
  process.env.DB_PORT = "3306";
  process.env.DB_USER = "test_user";
  process.env.DB_PASSWORD = "test_pass";
  process.env.DB_NAME = "greenery_test";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.FIREBASE_CLIENT_EMAIL = "test@test.iam.gserviceaccount.com";
  process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n";

  // Disable rate limiting in tests to prevent 429s from rapid requests
  process.env.RATE_LIMIT_LOGIN_MAX = "99999";
  process.env.RATE_LIMIT_WRITE_MAX = "99999";

  // Reset all mocks between tests
  afterEach(() => {
    jest.restoreAllMocks();
  });
  ```
- **GOTCHA**: These env vars must be set BEFORE any module imports Firebase or DB. `setupFilesAfterEnv` runs after the test framework is installed but before test files execute. Modules are loaded lazily when `require()` is called, so this works as long as `config/firebase.js` is mocked (which it will be in every test that imports it).
- **GOTCHA**: Rate limiter env vars are critical — without them, integration tests making many POST/PUT/DELETE requests will hit the default 60-per-10-min write limit and get unexpected 429s.
- **VALIDATE**: File exists and is valid JS

### Task 6: Create `apps/api/src/test/factories.js`

- **IMPLEMENT**: Test data factories for common shapes. Each factory returns a valid default that can be overridden.
  ```javascript
  // Employee row (as returned by DB SELECT)
  function employee(overrides = {}) {
    return {
      id: 1,
      name: "Test Tech",
      role: "Technician",
      email: "tech@greenery.test",
      phone: "555-123-4567",
      status: "Active",
      permissionLevel: "Technician",
      created_at: new Date("2025-01-01"),
      updated_at: new Date("2025-01-01"),
      ...overrides,
    };
  }

  // work_reqs row (as returned by DB SELECT — mapWorkReqToTask reads these columns)
  function workReqRow(overrides = {}) {
    return {
      id: 1,
      actionRequired: "Replace fern in lobby",
      status: "assigned",
      assignedTo: 1,
      dueDate: "2025-06-01",
      notes: null,
      account: "Acme Corp",
      location: "Building A",
      referenceNumber: "REQ-001",
      requestDate: "2025-01-15",
      created_at: new Date("2025-01-15"),
      updated_at: new Date("2025-01-15"),
      ...overrides,
    };
  }

  // Plant group row (as returned by GROUP BY query)
  function plantGroupRow(overrides = {}) {
    return {
      id: 1,
      name: "Fern",
      location: "Lobby",
      image_url: null,
      cost_per_unit: "12.50",
      quantity: 3,
      created_at: new Date("2025-01-01"),
      ...overrides,
    };
  }

  // req.user shape (as set by authMiddleware)
  function authenticatedUser(overrides = {}) {
    return {
      uid: "firebase-uid-1",
      email: "tech@greenery.test",
      employeeId: 1,
      role: "Technician",
      permissionLevel: "Technician",
      employee: employee(),
      claims: { uid: "firebase-uid-1", email: "tech@greenery.test" },
      ...overrides,
    };
  }

  // Firebase decoded token shape
  function firebaseDecodedToken(overrides = {}) { ... }
  ```
- **PATTERN**: One factory per data shape. Override only what the test cares about.
- **VALIDATE**: `node -e "const f = require('./src/test/factories'); console.log(f.employee())"`

### Task 7: Create `apps/api/src/test/mockDb.js`

- **IMPLEMENT**: Reusable DB mock setup helper
  ```javascript
  // Helper to set up db.query mock for common patterns
  // Usage: setupQueryMock(db, "SELECT", [rows])
  // Usage: setupQueryMock(db, "INSERT", { insertId: 1, affectedRows: 1 })
  ```
- **GOTCHA**: mysql2 `.query()` returns `[rows, fields]` for SELECT and `[ResultSetHeader, undefined]` for INSERT/UPDATE/DELETE. ResultSetHeader has `{ insertId, affectedRows, ... }`. Tests must return the correct tuple shape.
- **VALIDATE**: File exists and is valid JS

### Task 8: Create `apps/api/src/test/mockAuth.js`

- **IMPLEMENT**: Reusable auth mock for supertest integration tests
  ```javascript
  // Sets up Firebase mock + DB employee lookup mock so that
  // requests with Authorization: Bearer test-token authenticate as the given user.
  // Usage: setupAuth(db, firebaseAdmin, { role: "Manager", permissionLevel: "Manager" })
  ```
- **GOTCHA**: authMiddleware calls `admin.auth().verifyIdToken(token)` then `employeesService.getEmployeeByEmail(email)` which calls `db.query`. Both must be mocked for integration tests.
- **VALIDATE**: File exists and is valid JS

### Task 9: Create `apps/api/src/utils/httpError.test.js`

- **IMPLEMENT**: Test the httpError factory
  - creates Error with correct statusCode, message, code, details
  - defaults code to "VALIDATION_ERROR"
  - defaults details to empty array
  - wraps non-array details in array
  - sets isOperational = true
- **VALIDATE**: `cd apps/api && npx jest src/utils/httpError.test.js`

### Task 10: Create `apps/api/src/utils/permissions.test.js`

- **IMPLEMENT**: Test the permission hierarchy
  - `getAccessRank`: technician=1, manager=2, admin=3, superadmin=4, unknown=0
  - `normalizeAccessLevel`: various input formats → lowercase canonical form
  - `normalizeRoleInput`: various inputs → DB role names (Technician, Manager, Administrator)
  - `normalizePermissionLevelInput`: various inputs → DB permission names (includes SuperAdmin)
  - `isHighPrivilegePermission`: true for admin+, false for tech/manager
  - handles null, undefined, empty string, weird casing
- **VALIDATE**: `cd apps/api && npx jest src/utils/permissions.test.js`

### Task 11: Create `apps/api/src/utils/validators.test.js`

- **IMPLEMENT**: Test all validator functions
  - `isNonEmptyString`: true for "hello", false for "", null, undefined, 123
  - `toPositiveInt`: 1→1, "5"→5, 0→null, -1→null, "abc"→null, 1.5→null
  - `validateString`: respects maxLength, required, pattern options
  - `validateEmail`: valid emails pass, invalid fail, null passes (optional)
  - `validatePhone`: various formats accepted, invalid rejected
  - `validateEnum`: returns value if in list, default otherwise
  - `validateUrl`: http/https URLs, rejects invalid
  - `validatePassword`: length, uppercase, lowercase, number requirements
- **VALIDATE**: `cd apps/api && npx jest src/utils/validators.test.js`

### Task 12: Create `apps/api/src/middleware/errorHandler.test.js`

- **IMPLEMENT**: Test the global error handler
  - Returns standardized error shape: `{ status, code, message, details, timestamp }`
  - Uses `err.statusCode` for HTTP status, defaults to 500
  - Handles DB connection errors → 503 SERVICE_UNAVAILABLE
  - DB error codes: ECONNREFUSED, ENOTFOUND, ETIMEDOUT, PROTOCOL_CONNECTION_LOST, ER_ACCESS_DENIED_ERROR, ER_BAD_DB_ERROR
  - Logs 5xx errors to console.error
  - Does not expose stack traces in response
- **PATTERN**: Call handler directly with `(err, req, res, next)` using mock res
- **VALIDATE**: `cd apps/api && npx jest src/middleware/errorHandler.test.js`

### Task 13: Create `apps/api/src/middleware/authorize.test.js`

- **IMPLEMENT**: Test the authorization middleware
  - Passes when user rank >= minimum required rank
  - `authorize("technician")` allows all authenticated users
  - `authorize("manager")` blocks technicians, allows manager+
  - `authorize("admin")` blocks technician and manager, allows admin+
  - `authorize("superadmin")` only allows superadmin
  - Returns 403 httpError when insufficient permission
  - Requires req.user to be set (depends on verifyToken running first)
- **PATTERN**: Create middleware with `authorize("manager")`, call with mock req containing `req.user`
- **GOTCHA**: authorize reads `req.user.permissionLevel` first, falls back to `req.user.role`
- **VALIDATE**: `cd apps/api && npx jest src/middleware/authorize.test.js`

### Task 14: Create `apps/api/src/middleware/authMiddleware.test.js`

- **IMPLEMENT**: Test the verifyToken middleware
  - Returns 401 when no Authorization header
  - Returns 401 when token format is not "Bearer <token>"
  - Returns 401 when Firebase verifyIdToken rejects
  - Returns 401 when decoded token has no email
  - Sets req.user with correct shape when employee exists in DB
  - Falls back to Firebase claims when employee not found in DB
  - Normalizes email to lowercase
- **MOCKS**: `jest.mock("../../config/firebase")` and `jest.mock("../db")`
- **GOTCHA**: authMiddleware imports employeesService which imports db — mock db at the module level, not employeesService (per testing.md: mock at boundary, not internal logic)
- **VALIDATE**: `cd apps/api && npx jest src/middleware/authMiddleware.test.js`

### Task 15: Create `apps/api/src/services/employeesService.test.js`

- **IMPLEMENT**: Test employee service business logic with mocked DB
  - `listEmployees`: returns mapped rows from SELECT
  - `getEmployeeById`: returns employee or null
  - `getEmployeeByEmail`: case-insensitive lookup
  - `createEmployee`: validates input, INSERTs, returns created employee
  - `createEmployee` validation: rejects empty name, too-long name, invalid phone format, invalid status
  - `updateEmployee`: validates, UPDATEs, returns updated employee or null if not found
  - `deleteEmployee`: returns true if deleted, false if not found
  - `mapEmployeeToAccount`: maps row to account shape, returns null for null input
- **MOCK**: `jest.mock("../db")` — mock `db.query` to return `[rows, fields]` tuples
- **GOTCHA**: INSERT returns `[{ insertId: N, affectedRows: 1 }, undefined]`. After INSERT, service calls `getEmployeeById(insertId)` which is another `db.query` call — mock must handle sequential calls.
- **VALIDATE**: `cd apps/api && npx jest src/services/employeesService.test.js`

### Task 16: Create `apps/api/src/services/taskService.test.js`

- **IMPLEMENT**: Test task service business logic with mocked DB
  - `getTasks`: returns mapped tasks, supports scope and employeeId filtering
  - `getTaskById`: returns task or null, validates positive int
  - `createTask`: validates all fields, inserts 23 columns into work_reqs
  - `createTask` validation: rejects missing title, invalid status, invalid dates
  - `updateTaskStatus`: validates status enum, updates only status + updated_at
  - `assignTask`: validates assigned_to, updates assignment, auto-transitions unassigned→assigned
  - `assignTask`: calls `ensureEmployeeExists` which queries employees table
- **MOCK**: `jest.mock("../db")`
- **GOTCHA**: Tasks map to `work_reqs` table. `mapWorkReqToTask(row)` transforms column names. Tests need work_reqs-shaped rows as DB mock returns.
- **VALIDATE**: `cd apps/api && npx jest src/services/taskService.test.js`

### Task 17: Create `apps/api/src/routes/auth.test.js`

- **IMPLEMENT**: Integration tests for auth routes using supertest
  - `GET /auth/me` — returns authenticated employee, 401 without token, 404 if employee not in DB
  - `GET /auth/my-tasks` — returns tasks for authenticated user
  - `GET /auth/health` — returns user identity when authenticated
- **MOCKS**: Mock `config/firebase` and `src/db/index.js` at module level
- **PATTERN**: Use supertest `request(app).get("/auth/me").set("Authorization", "Bearer test-token")`
- **GOTCHA**: Must set up DB mock to return employee row when authMiddleware calls `getEmployeeByEmail`, AND when the route handler calls its service method. These are separate `db.query` calls.
- **VALIDATE**: `cd apps/api && npx jest src/routes/auth.test.js`

### Task 18: Create `apps/api/src/routes/employees.test.js`

- **IMPLEMENT**: Integration tests for employee CRUD routes
  - `GET /employees` — returns list, requires auth (technician+)
  - `GET /employees/:id` — returns single, 404 for missing
  - `POST /employees` — creates employee, requires manager+, validates input, 400 on bad input
  - `PUT /employees/:id` — updates employee, requires manager+, 404 for missing
  - `DELETE /employees/:id` — deletes employee, requires admin+
  - Permission tests: technician cannot POST/PUT/DELETE, manager cannot DELETE
  - 401 without auth token on all routes
- **MOCKS**: Mock `config/firebase` and `src/db/index.js`
- **GOTCHA**: `employeesController` calls `logActivity()` (from `activityLogger.js`) on create, update, and delete. `logActivity` does its own `db.query` INSERT into `activity_logs`. The DB mock must handle these extra calls — either by using `db.query.mockResolvedValue([{ affectedRows: 1 }, undefined])` as a default, or by using `mockResolvedValueOnce` carefully for the primary query and then a generic fallback for the audit log INSERT.
- **VALIDATE**: `cd apps/api && npx jest src/routes/employees.test.js`

### Task 19: Create `apps/api/src/routes/tasks.test.js`

- **IMPLEMENT**: Integration tests for task CRUD routes
  - `GET /tasks` — returns list, requires technician+
  - `GET /tasks/:id` — returns single, 404 for missing
  - `POST /tasks` — creates task, requires manager+, validates input
  - `PATCH /tasks/:id/status` — updates status, requires technician+
  - `PATCH /tasks/:id/assign` — assigns task, requires manager+
  - Permission tests: technician cannot POST or assign
  - Input validation: bad status values, missing title, invalid IDs
- **MOCKS**: Mock `config/firebase` and `src/db/index.js`
- **VALIDATE**: `cd apps/api && npx jest src/routes/tasks.test.js`

### Task 20: Run full test suite and fix any issues

- **IMPLEMENT**: Run all tests, fix any failures, ensure clean run
- **VALIDATE**: `cd apps/api && npm test`

---

## TESTING STRATEGY

### Unit Tests
- `httpError.test.js` — error factory (pure function)
- `permissions.test.js` — permission hierarchy (pure functions)
- `validators.test.js` — input validation (pure functions)

### Middleware Tests
- `errorHandler.test.js` — error response formatting
- `authorize.test.js` — permission enforcement
- `authMiddleware.test.js` — Firebase token verification + user resolution

### Service Tests
- `employeesService.test.js` — employee CRUD business logic
- `taskService.test.js` — task CRUD business logic

### Integration Tests (Supertest)
- `auth.test.js` — auth routes end-to-end
- `employees.test.js` — employee routes end-to-end
- `tasks.test.js` — task routes end-to-end

### Edge Cases
- Auth: missing token, malformed token, expired token, no email in token, email not in DB
- Permissions: each role tested against each permission boundary
- Validation: empty strings, null, undefined, too-long strings, invalid formats, boundary values
- CRUD: not-found IDs, duplicate emails, invalid status transitions
- DB errors: connection refused → 503 response

### Deferred (out of scope for this plan)
- `plantService.test.js` — involves transactions (`getConnection`, `beginTransaction`, `commit`, `rollback`) which need more complex mocking. Add in a follow-up.
- `reqs.js` route tests — inline handlers with multer file uploads. Needs route refactoring first.
- `schedule.js` route tests — inline handlers with `ensureScheduleColumns()` side effect. Needs refactoring first.
- `superadmin.js` route tests — lower risk, add after core coverage exists.

---

## VALIDATION COMMANDS

### Level 1: Syntax & Style
```bash
cd apps/api && npm run lint
```

### Level 2: Unit Tests
```bash
cd apps/api && npx jest src/utils/
```

### Level 3: Middleware Tests
```bash
cd apps/api && npx jest src/middleware/
```

### Level 4: Service Tests
```bash
cd apps/api && npx jest src/services/
```

### Level 5: Integration Tests
```bash
cd apps/api && npx jest src/routes/
```

### Level 6: Full Suite
```bash
cd apps/api && npm test
```

### Level 7: Coverage Report
```bash
cd apps/api && npm run test:coverage
```

---

## ACCEPTANCE CRITERIA
- [ ] Jest and supertest installed as devDependencies
- [ ] `npm test` runs and passes all tests
- [ ] `npm run lint` passes with no new warnings
- [ ] Unit tests cover: httpError, permissions (all 5 exports), validators (all 8 exports)
- [ ] Middleware tests cover: errorHandler, authorize (all 4 permission levels), authMiddleware (happy + error paths)
- [ ] Service tests cover: employeesService (all 7 exports), taskService (all 5 exports)
- [ ] Integration tests cover: auth routes, employee routes (CRUD + permission enforcement), task routes (CRUD + permission enforcement)
- [ ] All tests mock at system boundary only (DB, Firebase) — no internal mocking
- [ ] Test factories provide valid defaults for employee, task, user shapes
- [ ] No hardcoded secrets in test files
- [ ] No production code changes required
- [ ] No regressions in existing functionality

---

## NOTES

### Key Design Decision: jest.mock over DI refactoring
The original scoping suggested refactoring services to accept injected DB dependencies. After inspecting the codebase, `jest.mock("../db")` achieves the same testability with zero production code changes. This is the standard Jest approach for CommonJS modules with singleton dependencies. If the project later migrates to ESM or TypeScript, DI may become necessary — but for now, jest.mock is simpler and safer.

### Why plantService is deferred
`plantService.updatePlant` uses `db.getPool().getConnection()` for transactions with explicit `beginTransaction/commit/rollback`. Mocking this chain is more complex and error-prone. It's better to add plant tests as a follow-up once the core test infrastructure is proven.

### Why reqs.js and schedule.js routes are deferred
Both have inline route handlers with business logic (validation, SQL queries) directly in the route file instead of separated into controllers/services. Testing these routes is possible but the inline handlers make mocking harder and the tests less meaningful. These routes are candidates for a refactor-then-test approach in a future plan.

### DB mock tuple shape
mysql2's `.query()` returns different shapes:
- SELECT: `[[row1, row2, ...], fieldDefinitions]`
- INSERT: `[{ insertId: N, affectedRows: 1, ... }, undefined]`
- UPDATE: `[{ affectedRows: N, changedRows: N, ... }, undefined]`
- DELETE: `[{ affectedRows: N, ... }, undefined]`

Every `db.query` mock must return the correct tuple shape or tests will fail with destructuring errors. The `mockDb.js` helper should abstract this.

### Rate limiter behavior in tests
Rate limiters use in-memory stores that persist across requests within a test file. Mitigated by setting `RATE_LIMIT_*` env vars to 99999 in `setup.js`. If tests still hit limits (e.g., store persists across files), mock `express-rate-limit` as a fallback.

### Swagger import at app.js load time
`app.js` imports `config/swagger.js` which calls `swaggerJsdoc()` to parse JSDoc annotations from all route files. This runs at `require("../app")` time in integration tests. If swagger parsing fails (e.g., malformed JSDoc in a route), all integration tests will break with a confusing error pointing to swagger, not the test. If this happens, mock `../config/swagger` to return an empty object.

### activityLogger calls db.query
`employeesController` calls `logActivity()` on create, update, and delete operations. `logActivity` (in `activityLogger.js`) does a `db.query` INSERT into `activity_logs`. This is a non-blocking best-effort call (errors are caught and logged, not thrown). In tests, the DB mock must handle this extra query — simplest approach is to set `db.query.mockResolvedValue([{ affectedRows: 1 }, undefined])` as a default fallback, then use `mockResolvedValueOnce` for the specific primary queries that need controlled return values.
