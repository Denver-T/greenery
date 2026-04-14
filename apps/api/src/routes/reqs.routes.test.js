// Route-level tests for reqs.js — focused on the work-request-schedule-coupling
// additions in Chunk A. Uses supertest against a synthetic Express app so we can
// exercise the real Express route registration order, the real middleware
// pipeline (with auth + rate limiter mocked), and the real error handler.
//
// Two regressions this file is the safety net for:
//   1. Route ordering — `/reqs/unscheduled` must hit the inbox handler, NOT
//      the `/:id` handler with toPositiveInt('unscheduled') failing
//   2. DELETE /reqs/:id transactional orphan cleanup — schedule_events linked
//      to the deleted work_req must be removed in the same transaction

jest.mock("../db");

// Auth middleware: pass through and inject a fake admin user
jest.mock("../middleware/authMiddleware", () => ({
  verifyToken: (req, res, next) => {
    req.user = {
      email: "admin@example.com",
      employeeId: 1,
      permissionLevel: "Administrator",
      role: "Administrator",
    };
    return next();
  },
}));

// Authorize middleware: pass through (we test auth separately in middleware/authorize.test.js)
jest.mock("../middleware/authorize", () => ({
  authorize: () => (req, res, next) => next(),
}));

// Rate limiter: pass through (tested separately)
jest.mock("../middleware/rateLimiters", () => ({
  writeLimiter: (req, res, next) => next(),
}));

// Monday sync: stub so the fire-and-forget DELETE side-effect does not throw
jest.mock("../services/mondaySyncService", () => ({
  pushCreate: jest.fn().mockResolvedValue(undefined),
  pushUpdate: jest.fn().mockResolvedValue(undefined),
  pushDelete: jest.fn().mockResolvedValue(undefined),
  isMondayConfigured: () => false,
}));

jest.mock("../services/reqSequenceService", () => ({
  nextReferenceNumber: jest.fn().mockResolvedValue("WR-2026-9999"),
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

beforeEach(() => {
  jest.clearAllMocks();
  // Silence the global error handler's console.error for deliberate-500 tests.
  // Restored after each test by jest.restoreAllMocks below.
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Route ordering regression
// ---------------------------------------------------------------------------
describe("GET /reqs/unscheduled — route ordering regression", () => {
  it("hits the inbox handler, NOT the :id parameter handler", async () => {
    // The COUNT query for the inbox returns total=0
    // The list query returns an empty array
    db.query
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(makeApp()).get("/reqs/unscheduled");

    // If route ordering broke and Express matched /:id first, this would be a
    // 400 from `parsePositiveInt('unscheduled')` returning null. The inbox
    // handler returns a paginated shape with totalCount.
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [],
      totalCount: 0,
    });

    // The first DB call should be the inbox COUNT query — NOT a SELECT by id
    expect(db.query).toHaveBeenCalled();
    const firstSql = db.query.mock.calls[0][0];
    expect(firstSql).toMatch(/COUNT\(\*\)/);
    expect(firstSql).toMatch(/LEFT JOIN schedule_events/);
  });

  it("returns inbox shape when called with no query params (default pagination)", async () => {
    db.query.mockResolvedValueOnce([[{ total: 2 }], []]).mockResolvedValueOnce([
      [
        { id: 1, referenceNumber: "WR-2026-0001" },
        { id: 2, referenceNumber: "WR-2026-0002" },
      ],
      [],
    ]);

    const response = await request(makeApp()).get("/reqs/unscheduled");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.totalCount).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(25);
  });

  it("forwards filter query params to the service", async () => {
    db.query
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([[], []]);

    await request(makeApp()).get(
      "/reqs/unscheduled?account=Inter&assignedToPresent=true&includeOlder=true",
    );

    const countSql = db.query.mock.calls[0][0];
    const countParams = db.query.mock.calls[0][1];

    expect(countSql).toMatch(/LOWER\(wr\.account\) LIKE LOWER\(\?\)/);
    expect(countSql).toMatch(/wr\.assignedTo IS NOT NULL/);
    expect(countSql).not.toMatch(/INTERVAL 30 DAY/); // includeOlder removes default window
    expect(countParams).toContain("%Inter%");
  });
});

// ---------------------------------------------------------------------------
// DELETE /reqs/:id — transactional orphan cleanup
// ---------------------------------------------------------------------------
describe("DELETE /reqs/:id — orphan cleanup transaction", () => {
  function mockGetConnection() {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const query = jest.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]);

    const conn = {
      beginTransaction,
      commit,
      rollback,
      release,
      query,
    };

    db.getConnection = jest.fn().mockResolvedValue(conn);
    return conn;
  }

  it("pre-deletes linked schedule_events before deleting the work_req, in a transaction", async () => {
    // 1. getReqById returns the existing work_req
    db.query.mockResolvedValueOnce([
      [{ id: 42, referenceNumber: "WR-2026-0042", monday_item_id: null }],
      [],
    ]);

    const conn = mockGetConnection();

    const response = await request(makeApp()).delete("/reqs/42");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });

    // Transaction was opened, both deletes ran on the same connection, then
    // committed and released
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(conn.query.mock.calls[0][0]).toMatch(
      /DELETE FROM schedule_events WHERE work_req_id = \?/,
    );
    expect(conn.query.mock.calls[0][1]).toEqual([42]);
    expect(conn.query.mock.calls[1][0]).toMatch(
      /DELETE FROM work_reqs WHERE id = \?/,
    );
    expect(conn.query.mock.calls[1][1]).toEqual([42]);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases when the schedule_events delete fails", async () => {
    db.query.mockResolvedValueOnce([
      [{ id: 42, referenceNumber: "WR-2026-0042", monday_item_id: null }],
      [],
    ]);

    const conn = mockGetConnection();
    // First DELETE (schedule_events) throws
    conn.query
      .mockRejectedValueOnce(new Error("simulated schedule delete failure"))
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined]);

    const response = await request(makeApp()).delete("/reqs/42");

    expect(response.status).toBe(500);
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases when the work_req delete fails", async () => {
    db.query.mockResolvedValueOnce([
      [{ id: 42, referenceNumber: "WR-2026-0042", monday_item_id: null }],
      [],
    ]);

    const conn = mockGetConnection();
    // First DELETE succeeds, second (work_reqs) throws
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 0 }, undefined])
      .mockRejectedValueOnce(new Error("simulated work_req delete failure"));

    const response = await request(makeApp()).delete("/reqs/42");

    expect(response.status).toBe(500);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the work_req does not exist (no transaction opened)", async () => {
    // getReqById returns no rows
    db.query.mockResolvedValueOnce([[], []]);

    db.getConnection = jest.fn();

    const response = await request(makeApp()).delete("/reqs/9999");

    expect(response.status).toBe(404);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it("returns 400 with VALIDATION_ERROR shape on invalid id", async () => {
    const response = await request(makeApp()).delete("/reqs/not-an-int");

    expect(response.status).toBe(400);
    // After the error-shape fix, the new sub-resource routes use the
    // structured shape via httpError. The legacy DELETE /reqs/:id path
    // still uses the legacy string shape (pre-existing pattern); this
    // test asserts the existing behavior and will need to be tightened
    // when the api-error-shape-consistency cleanup ships.
    expect(response.body).toEqual({ error: "Invalid id" });
  });
});

// ---------------------------------------------------------------------------
// New sub-resource routes — error shape regression
// ---------------------------------------------------------------------------
describe("Sub-resource routes — structured error shape", () => {
  it("GET /reqs/:id/schedule-events returns structured error on bad id", async () => {
    const response = await request(makeApp()).get("/reqs/abc/schedule-events");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid id",
      },
    });
  });

  it("POST /reqs/:id/schedule-events returns structured error on bad id", async () => {
    const response = await request(makeApp())
      .post("/reqs/abc/schedule-events")
      .send({ start_time: "2026-04-15T09:00", end_time: "2026-04-15T11:00" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid id",
      },
    });
  });

  it("DELETE /reqs/:id/schedule-events/:eventId returns structured error on bad id", async () => {
    const response = await request(makeApp()).delete(
      "/reqs/abc/schedule-events/1",
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid id",
      },
    });
  });
});

// ---------------------------------------------------------------------------
// PUT /reqs/:id — transaction refactor + autoCloseScheduleEvents hook (Phase 6)
// ---------------------------------------------------------------------------
describe("PUT /reqs/:id — transaction + auto-close", () => {
  // Base row returned by getReqById before each test. Includes every column
  // buildReqPayload reads so we don't need to re-provide values in the request
  // body unless the test is specifically exercising that field.
  const baseExisting = {
    id: 42,
    referenceNumber: "WR-2026-0042",
    requestDate: "2026-04-01",
    techName: "Alex",
    account: "Green Corp",
    accountContact: "alex@green.co",
    accountAddress: "1 Main St",
    actionRequired: "Replace plant",
    numberOfPlants: 1,
    plantWanted: "Ficus",
    plantReplaced: null,
    plantSize: null,
    plantHeight: null,
    planterTypeSize: null,
    planterColour: null,
    stagingMaterial: null,
    lighting: null,
    method: null,
    location: null,
    notes: null,
    picturePath: null,
    assignedTo: 5,
    dueDate: "2026-04-20",
    status: "in_progress",
    monday_item_id: null,
    monday_synced_at: null,
  };

  function mockGetConnection() {
    const beginTransaction = jest.fn().mockResolvedValue(undefined);
    const commit = jest.fn().mockResolvedValue(undefined);
    const rollback = jest.fn().mockResolvedValue(undefined);
    const release = jest.fn();
    const query = jest.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]);

    const conn = { beginTransaction, commit, rollback, release, query };
    db.getConnection = jest.fn().mockResolvedValue(conn);
    return conn;
  }

  it("runs UPDATE inside a transaction and commits on happy path", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]); // getReqById
    const conn = mockGetConnection();

    const response = await request(makeApp()).put("/reqs/42").send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, id: 42 });

    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    // Only one query inside the transaction — the UPDATE. No DELETE because
    // autoCloseScheduleEvents was not provided.
    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(conn.query.mock.calls[0][0]).toMatch(/UPDATE work_reqs/);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("UPDATE writes the status column from the request body", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();

    await request(makeApp()).put("/reqs/42").send({ status: "completed" });

    const updateSql = conn.query.mock.calls[0][0];
    const updateParams = conn.query.mock.calls[0][1];
    expect(updateSql).toMatch(/status = \?/);
    // status is the second-to-last param, id is last.
    expect(updateParams[updateParams.length - 2]).toBe("completed");
    expect(updateParams[updateParams.length - 1]).toBe(42);
  });

  it("deletes linked schedule_events when autoCloseScheduleEvents=true AND status transitions to completed", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();
    // UPDATE succeeds, DELETE returns 2 deleted rows
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockResolvedValueOnce([{ affectedRows: 2 }, undefined]);

    const response = await request(makeApp())
      .put("/reqs/42")
      .send({ status: "completed", autoCloseScheduleEvents: true });

    expect(response.status).toBe(200);
    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(conn.query.mock.calls[0][0]).toMatch(/UPDATE work_reqs/);
    expect(conn.query.mock.calls[1][0]).toMatch(
      /DELETE FROM schedule_events WHERE work_req_id = \?/,
    );
    expect(conn.query.mock.calls[1][1]).toEqual([42]);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
  });

  it("does NOT delete schedule_events when autoCloseScheduleEvents is absent, even on → completed", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();

    await request(makeApp()).put("/reqs/42").send({ status: "completed" });

    // Only the UPDATE ran. The default preserves the audit trail — the
    // calendar shows the completed event as a completed receipt.
    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(conn.query.mock.calls[0][0]).toMatch(/UPDATE work_reqs/);
  });

  it("does NOT delete schedule_events when existing status is already completed", async () => {
    // Not a transition — existing already completed. The flag has no effect
    // because the isCompletionTransition guard is false. This prevents a
    // stale-form replay from wiping events the operator didn't mean to touch.
    db.query.mockResolvedValueOnce([
      [{ ...baseExisting, status: "completed" }],
      [],
    ]);
    const conn = mockGetConnection();

    await request(makeApp())
      .put("/reqs/42")
      .send({ status: "completed", autoCloseScheduleEvents: true });

    expect(conn.query).toHaveBeenCalledTimes(1);
    expect(conn.query.mock.calls[0][0]).toMatch(/UPDATE work_reqs/);
  });

  it("rolls back the transaction when the auto-close DELETE fails — status NOT persisted", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();
    // UPDATE succeeds, DELETE throws — the whole transaction must roll back so
    // the status change is reverted alongside the failed cleanup.
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 1 }, undefined])
      .mockRejectedValueOnce(new Error("simulated schedule delete failure"));

    const response = await request(makeApp())
      .put("/reqs/42")
      .send({ status: "completed", autoCloseScheduleEvents: true });

    expect(response.status).toBe(500);
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases when the UPDATE itself fails", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();
    conn.query.mockRejectedValueOnce(new Error("simulated update failure"));

    const response = await request(makeApp()).put("/reqs/42").send({});

    expect(response.status).toBe(500);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when status is not in the accepted enum", async () => {
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    db.getConnection = jest.fn();

    const response = await request(makeApp())
      .put("/reqs/42")
      .send({ status: "frobnicated" });

    expect(response.status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it("returns 404 (no transaction opened) when the work_req does not exist", async () => {
    db.query.mockResolvedValueOnce([[], []]);
    db.getConnection = jest.fn();

    const response = await request(makeApp()).put("/reqs/9999").send({});

    expect(response.status).toBe(404);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  it("coerces Date objects from mysql2 into exact YYYY-MM-DD for date columns", async () => {
    // Regression: when the client sends only {status: 'completed'} (as the
    // Mark Complete dialog does), buildReqPayload falls back to
    // existing.requestDate — which mysql2 returns as a JS Date object built
    // via the local-midnight constructor `new Date(y, m-1, d)`. The
    // pre-fix code passed String(Date) ("Tue Apr 14 2026 …") to the UPDATE
    // and MySQL rejected it. The integration test caught this end-to-end;
    // this unit test locks the exact-value coercion so a future refactor
    // can't silently reintroduce the bug or shift the day.
    //
    // Fixture note: use the local-midnight constructor, NOT
    // `new Date("2026-04-01T00:00:00Z")`, because that is not what mysql2
    // actually produces — mysql2 emits local-midnight Dates and a UTC
    // fixture hides timezone bugs that only surface in non-UTC locales.
    const existingWithDateObjects = {
      ...baseExisting,
      requestDate: new Date(2026, 3, 1), // 2026-04-01 local midnight
      dueDate: new Date(2026, 3, 20), // 2026-04-20 local midnight
    };
    db.query.mockResolvedValueOnce([[existingWithDateObjects], []]);
    const conn = mockGetConnection();

    const response = await request(makeApp())
      .put("/reqs/42")
      .send({ status: "completed" });

    expect(response.status).toBe(200);
    const updateParams = conn.query.mock.calls[0][1];
    // requestDate is param index 1, dueDate is param index 20 (see the
    // UPDATE column order in routes/reqs.js PUT handler). Assert the
    // EXACT day, not just the format — a format-only check let the
    // timezone shift bug ship in the original cycle-2 test.
    expect(updateParams[1]).toBe("2026-04-01");
    expect(updateParams[20]).toBe("2026-04-20");
  });

  it("passes YYYY-MM-DD strings from the client through verbatim (timezone-safe)", async () => {
    // Regression: ECMAScript parses bare ISO date strings like "2026-04-14"
    // as UTC midnight. Reading them back with local getters in a non-UTC
    // timezone silently shifts the day — in UTC-6 this would save
    // "2026-04-13" for every request submitted on Apr 14. The helper must
    // short-circuit YYYY-MM-DD strings and pass them through unchanged.
    //
    // This covers the edit-form path (`<input type="date">` → JSON PUT)
    // which is the real-world source of the regression.
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    const conn = mockGetConnection();

    const response = await request(makeApp()).put("/reqs/42").send({
      requestDate: "2026-04-14",
      dueDate: "2026-04-20",
    });

    expect(response.status).toBe(200);
    const updateParams = conn.query.mock.calls[0][1];
    expect(updateParams[1]).toBe("2026-04-14");
    expect(updateParams[20]).toBe("2026-04-20");
  });

  it("rejects 'unassigned' from the PUT enum (one-way door invariant)", async () => {
    // The assign endpoint owns un-assignment because it also clears the
    // assignedTo FK. PUT /reqs/:id must never accept 'unassigned' as a
    // status, even if taskService.VALID_STATUSES later adds it. The
    // explicit filter in reqs.js is load-bearing — this test pins it.
    db.query.mockResolvedValueOnce([[baseExisting], []]);
    db.getConnection = jest.fn();

    const response = await request(makeApp())
      .put("/reqs/42")
      .send({ status: "unassigned" });

    expect(response.status).toBe(400);
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  // Per Decision D: Monday-inbound completions go through
  // mondayWebhookHandler.js's direct-SQL path, NOT through PUT /reqs/:id.
  // Those writes cannot accidentally trigger auto-close because the webhook
  // handler doesn't touch this route. This test pins that invariant by
  // asserting the webhook handler's module does not reference the auto-close
  // field name — if someone later wires autoCloseScheduleEvents into the
  // webhook path, this test fails and forces a conscious decision.
  it("Monday webhook handler does not reference autoCloseScheduleEvents (Decision D invariant)", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs.readFileSync(
      path.join(__dirname, "../services/mondayWebhookHandler.js"),
      "utf8",
    );
    expect(src).not.toMatch(/autoCloseScheduleEvents/);
  });
});
