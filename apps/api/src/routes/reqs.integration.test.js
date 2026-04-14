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

async function seedWorkReq({ refSuffix, status = "in_progress" }) {
  const [result] = await db.query(
    `INSERT INTO work_reqs (
       referenceNumber, requestDate, account, actionRequired, status
     ) VALUES (?, CURDATE(), ?, ?, ?)`,
    [
      `${TEST_PREFIX}-${refSuffix}`,
      "Integration Test Co",
      "Seeded for auto-close integration test",
      status,
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

async function countEventsFor(workReqId) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS c FROM schedule_events WHERE work_req_id = ?`,
    [workReqId],
  );
  return rows[0].c;
}

async function statusOf(workReqId) {
  const [rows] = await db.query(
    `SELECT status FROM work_reqs WHERE id = ?`,
    [workReqId],
  );
  return rows[0]?.status;
}

async function cleanup() {
  // Delete schedule_events first to satisfy the FK constraint, even though
  // it's ON DELETE SET NULL. Faster than the trigger path.
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
