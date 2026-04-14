// Integration test for PUT /reqs/:id — exercises the real transaction path
// against a live MySQL (docker-compose). Covers the auto-close hook end-to-end
// because mocked unit tests can't prove "both tables mutate in the same
// transaction" — only a real DB can.
//
// The test skips gracefully when MySQL is unreachable, so `npm test` never
// fails on a machine without docker running. To exercise locally, start the
// dev DB with `cd apps/api/db && docker compose up -d` and rerun.
//
// Env override: the global test setup (src/test/setup.js) points DB_HOST at
// the fake "localhost:3306/greenery_test". We override here to the real dev
// docker-compose instance (127.0.0.1:3307/greenery_user/greenery_pass/greenery)
// BEFORE the first require() walks into ../db → ../lib/env.

process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "3307";
process.env.DB_USER = "greenery_user";
process.env.DB_PASSWORD = "greenery_pass";
process.env.DB_NAME = "greenery";

// Auth / authorize / rate-limiter — same approach as reqs.routes.test.js.
// We're testing route + DB integration, not auth middleware.
jest.mock("../middleware/authMiddleware", () => ({
  verifyToken: (req, res, next) => {
    req.user = {
      email: "integration-test@example.com",
      employeeId: 1,
      permissionLevel: "Administrator",
      role: "Administrator",
    };
    return next();
  },
}));

jest.mock("../middleware/authorize", () => ({
  authorize: () => (req, res, next) => next(),
}));

jest.mock("../middleware/rateLimiters", () => ({
  writeLimiter: (req, res, next) => next(),
}));

// Monday sync — fire-and-forget; pushUpdate early-returns when
// MONDAY_API_TOKEN is unset (which it is in the fake test env), so stubbing
// to resolved noops keeps test teardown clean with no stray promises.
jest.mock("../services/mondaySyncService", () => ({
  pushCreate: jest.fn().mockResolvedValue(undefined),
  pushUpdate: jest.fn().mockResolvedValue(undefined),
  pushDelete: jest.fn().mockResolvedValue(undefined),
  isMondayConfigured: () => false,
}));

const express = require("express");
const request = require("supertest");

const db = require("../db");
const reqsRouter = require("./reqs");
const errorHandler = require("../middleware/errorHandler");

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/reqs", reqsRouter);
  app.use(errorHandler);
  return app;
}

// Unique prefix so the integration rows never collide with dev data or with
// concurrent test runs. Timestamped per describe block — not per test — so
// cleanup is straightforward (DELETE WHERE referenceNumber LIKE '<prefix>%').
const TEST_PREFIX = `IT-AC-${Date.now()}`;
let dbAvailable = false;

async function checkDbAvailable() {
  try {
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

async function seedWorkReq({
  refSuffix,
  status = "in_progress",
  assignedTo = null,
}) {
  const [result] = await db.query(
    `INSERT INTO work_reqs (
       referenceNumber, requestDate, account, actionRequired, status, assignedTo
     ) VALUES (?, CURDATE(), ?, ?, ?, ?)`,
    [
      `${TEST_PREFIX}-${refSuffix}`,
      "Integration Test Co",
      "Seeded for auto-close integration test",
      status,
      assignedTo,
    ],
  );
  return result.insertId;
}

async function seedScheduleEvent(workReqId) {
  const [result] = await db.query(
    `INSERT INTO schedule_events (
       title, start_time, end_time, work_req_id, event_type, audience_level
     ) VALUES (?, ?, ?, ?, 'request', 'technician')`,
    [
      "IT seeded event",
      "2030-01-01 09:00:00",
      "2030-01-01 10:00:00",
      workReqId,
    ],
  );
  return result.insertId;
}

async function seedEmployee(nameSuffix) {
  const [result] = await db.query(
    `INSERT INTO employees (name, role, email, status, permissionLevel)
     VALUES (?, 'Technician', NULL, 'Active', 'Technician')`,
    [`${TEST_PREFIX}-emp-${nameSuffix}`],
  );
  return result.insertId;
}

async function getWorkReq(workReqId) {
  const [rows] = await db.query(
    `SELECT id, status, assignedTo FROM work_reqs WHERE id = ?`,
    [workReqId],
  );
  return rows[0] || null;
}

async function countAutoAssignLogs(workReqId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM activity_logs
      WHERE action = 'work_req.auto_assigned'
        AND target_type = 'work_req'
        AND target_id = ?`,
    [workReqId],
  );
  return rows[0].c;
}

// logActivity is fire-and-forget — the INSERT races the HTTP response. Poll
// for up to 500ms so positive assertions stay reliable under CI load
// without permanently pessimising the happy path.
async function waitForAutoAssignLogCount(workReqId, expected) {
  const deadline = Date.now() + 500;
  let last = -1;
  while (Date.now() < deadline) {
    last = await countAutoAssignLogs(workReqId);
    if (last === expected) return last;
    await new Promise((r) => setTimeout(r, 25));
  }
  return last;
}

// For the negative case (no log expected), wait the full window so a
// delayed INSERT would still be caught before the assertion runs.
async function settleAutoAssignLogs() {
  await new Promise((r) => setTimeout(r, 200));
}

async function countEventsFor(workReqId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM schedule_events WHERE work_req_id = ?`,
    [workReqId],
  );
  return rows[0].c;
}

async function statusOf(workReqId) {
  const [rows] = await db.query(`SELECT status FROM work_reqs WHERE id = ?`, [
    workReqId,
  ]);
  return rows[0]?.status;
}

async function cleanup() {
  // 1. Scrub activity_logs tied to test WRs BEFORE the WRs are deleted —
  //    target_id has no FK, so orphaned rows would just accumulate.
  await db.query(
    `DELETE al FROM activity_logs al
       JOIN work_reqs wr ON al.target_type = 'work_req' AND al.target_id = wr.id
      WHERE wr.referenceNumber LIKE ?`,
    [`${TEST_PREFIX}-%`],
  );
  await db.query(
    `DELETE al FROM activity_logs al
       JOIN schedule_events se ON al.target_type = 'schedule_event' AND al.target_id = se.id
       JOIN work_reqs wr ON se.work_req_id = wr.id
      WHERE wr.referenceNumber LIKE ?`,
    [`${TEST_PREFIX}-%`],
  );

  // 2. Delete schedule_events first to satisfy the FK constraint, even though
  //    it's ON DELETE SET NULL. Faster than the trigger path.
  await db.query(
    `DELETE se FROM schedule_events se
       JOIN work_reqs wr ON se.work_req_id = wr.id
      WHERE wr.referenceNumber LIKE ?`,
    [`${TEST_PREFIX}-%`],
  );
  await db.query(
    `DELETE FROM schedule_events WHERE title = 'IT seeded event' AND work_req_id IS NULL`,
  );
  await db.query(`DELETE FROM work_reqs WHERE referenceNumber LIKE ?`, [
    `${TEST_PREFIX}-%`,
  ]);

  // 3. Test employees (fk on activity_logs.actor_employee_id is ON DELETE SET NULL)
  await db.query(`DELETE FROM employees WHERE name LIKE ?`, [
    `${TEST_PREFIX}-emp-%`,
  ]);
}

beforeAll(async () => {
  dbAvailable = await checkDbAvailable();
  if (!dbAvailable) {
    console.warn(
      `[reqs.integration.test] SKIPPING — MySQL unreachable at ${process.env.DB_HOST}:${process.env.DB_PORT}. Start with \`cd apps/api/db && docker compose up -d\` to run these tests.`,
    );
  }
});

afterAll(async () => {
  if (dbAvailable) {
    await cleanup();
    // Close the pool so Jest can exit cleanly.
    try {
      const pool = db.getPool();
      await pool.end();
    } catch {
      // Pool may already be closed or never created.
    }
  }
});

// Wrapper so the whole suite skips when the DB isn't reachable. Using
// conditional describe at runtime — jest doesn't support dynamic .skip
// after beforeAll completes, so we gate every `it` on dbAvailable instead.
const itIfDb = (name, fn) =>
  it(name, async () => {
    if (!dbAvailable) {
      console.warn(`  → skipping: ${name}`);
      return;
    }
    await fn();
  });

describe("PUT /reqs/:id — integration against real MySQL", () => {
  afterEach(async () => {
    if (dbAvailable) await cleanup();
  });

  itIfDb(
    "auto-close happy path: flipping to completed with autoCloseScheduleEvents=true deletes linked events",
    async () => {
      const wrId = await seedWorkReq({ refSuffix: "happy" });
      await seedScheduleEvent(wrId);
      expect(await countEventsFor(wrId)).toBe(1);

      const response = await request(makeApp())
        .put(`/reqs/${wrId}`)
        .send({ status: "completed", autoCloseScheduleEvents: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, id: wrId });
      expect(await statusOf(wrId)).toBe("completed");
      expect(await countEventsFor(wrId)).toBe(0);
    },
  );

  itIfDb(
    "counter-case: flipping to completed WITHOUT the flag leaves linked events intact",
    async () => {
      const wrId = await seedWorkReq({ refSuffix: "counter" });
      const eventId = await seedScheduleEvent(wrId);
      expect(await countEventsFor(wrId)).toBe(1);

      const response = await request(makeApp())
        .put(`/reqs/${wrId}`)
        .send({ status: "completed" });

      expect(response.status).toBe(200);
      expect(await statusOf(wrId)).toBe("completed");
      expect(await countEventsFor(wrId)).toBe(1);

      // Event row is still there and still linked (not orphaned to NULL).
      const [rows] = await db.query(
        `SELECT id, work_req_id FROM schedule_events WHERE id = ?`,
        [eventId],
      );
      expect(rows[0].work_req_id).toBe(wrId);
    },
  );

  itIfDb(
    "no-transition guard: autoClose=true on an already-completed request does NOT delete events",
    async () => {
      const wrId = await seedWorkReq({
        refSuffix: "already-done",
        status: "completed",
      });
      await seedScheduleEvent(wrId);

      const response = await request(makeApp())
        .put(`/reqs/${wrId}`)
        .send({ status: "completed", autoCloseScheduleEvents: true });

      expect(response.status).toBe(200);
      expect(await countEventsFor(wrId)).toBe(1);
    },
  );

  itIfDb(
    "transaction rollback: invalid status never writes the UPDATE",
    async () => {
      const wrId = await seedWorkReq({ refSuffix: "rollback" });
      const originalStatus = await statusOf(wrId);

      const response = await request(makeApp())
        .put(`/reqs/${wrId}`)
        .send({ status: "frobnicated" });

      expect(response.status).toBe(400);
      expect(await statusOf(wrId)).toBe(originalStatus);
    },
  );
});

describe("POST /reqs/:id/schedule-events — auto-assign integration", () => {
  afterEach(async () => {
    if (dbAvailable) await cleanup();
  });

  itIfDb(
    "flips an unassigned WR to assigned with the event's employee_id",
    async () => {
      const empId = await seedEmployee("promote");
      const wrId = await seedWorkReq({
        refSuffix: "promote",
        status: "unassigned",
        assignedTo: null,
      });

      const response = await request(makeApp())
        .post(`/reqs/${wrId}/schedule-events`)
        .send({
          start_time: "2030-02-01T09:00",
          end_time: "2030-02-01T11:00",
          employee_id: empId,
        });

      expect(response.status).toBe(201);

      const wr = await getWorkReq(wrId);
      expect(wr.status).toBe("assigned");
      expect(wr.assignedTo).toBe(empId);

      expect(await waitForAutoAssignLogCount(wrId, 1)).toBe(1);
    },
  );

  itIfDb("does not clobber an already-assigned WR", async () => {
    const ownerId = await seedEmployee("owner");
    const schedulerEmpId = await seedEmployee("scheduler");
    const wrId = await seedWorkReq({
      refSuffix: "no-clobber",
      status: "assigned",
      assignedTo: ownerId,
    });

    const response = await request(makeApp())
      .post(`/reqs/${wrId}/schedule-events`)
      .send({
        start_time: "2030-02-01T09:00",
        end_time: "2030-02-01T11:00",
        employee_id: schedulerEmpId,
      });

    expect(response.status).toBe(201);

    const wr = await getWorkReq(wrId);
    expect(wr.status).toBe("assigned");
    expect(wr.assignedTo).toBe(ownerId);

    // Event was still created with the scheduler's employee_id
    expect(response.body?.data?.employee_id ?? response.body?.employee_id).toBe(
      schedulerEmpId,
    );

    // No auto-assign log should ever appear. Wait long enough that a late
    // fire-and-forget INSERT would still be caught before we assert.
    await settleAutoAssignLogs();
    expect(await countAutoAssignLogs(wrId)).toBe(0);
  });

  itIfDb(
    "Mark Complete preserves assignedTo after PUT to status=completed",
    async () => {
      const empId = await seedEmployee("preserve");
      const wrId = await seedWorkReq({
        refSuffix: "preserve",
        status: "unassigned",
        assignedTo: null,
      });

      // Step 1: schedule event → auto-assigns the WR
      const scheduleResponse = await request(makeApp())
        .post(`/reqs/${wrId}/schedule-events`)
        .send({
          start_time: "2030-02-01T09:00",
          end_time: "2030-02-01T11:00",
          employee_id: empId,
        });
      expect(scheduleResponse.status).toBe(201);
      const afterSchedule = await getWorkReq(wrId);
      expect(afterSchedule.assignedTo).toBe(empId);
      expect(afterSchedule.status).toBe("assigned");

      // Step 2: Mark Complete (without auto-close) — sends a partial payload
      const completeResponse = await request(makeApp())
        .put(`/reqs/${wrId}`)
        .send({ status: "completed", autoCloseScheduleEvents: false });
      expect(completeResponse.status).toBe(200);

      const afterComplete = await getWorkReq(wrId);
      expect(afterComplete.status).toBe("completed");
      expect(afterComplete.assignedTo).toBe(empId);
    },
  );
});
