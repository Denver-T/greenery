jest.mock("../db");
jest.mock("../utils/activityLogger", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("./mondaySyncService", () => ({
  pushUpdate: jest.fn().mockResolvedValue(undefined),
  isMondayConfigured: () => false,
}));

const db = require("../db");
const { logActivity } = require("../utils/activityLogger");
const mondaySyncService = require("./mondaySyncService");
const {
  selectResult,
  insertResult,
  updateResult,
  deleteResult,
} = require("../test/mockDb");
const service = require("./workReqScheduleService");

// Base work_req fixture. Default shape is `unassigned` + `assignedTo=null` so
// the createLinkedEvent happy path triggers the auto-assign branch by default.
// monday_item_id defaults to null so the happy path does NOT also fire Monday
// sync by default — the dedicated auto-assign-with-monday test overrides it.
// Override status/assignedTo per-test for the no-clobber cases.
const WORK_REQ_ROW = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  actionRequired: "Replace fern",
  status: "unassigned",
  assignedTo: null,
  monday_item_id: null,
};

const ACTIVE_EMPLOYEE = { id: 7 };

function reqFor(overrides = {}) {
  return {
    user: {
      email: "dispatcher@example.com",
      employeeId: 1,
      permissionLevel: "Manager",
      ...overrides,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// validateRequestScheduleEventPayload
// ---------------------------------------------------------------------------
describe("validateRequestScheduleEventPayload", () => {
  it("accepts a valid payload with all fields", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T11:00",
      employee_id: 7,
      audience_level: "technician",
      details: "Bring the replacement soil.",
    });

    expect(result.error).toBeUndefined();
    expect(result.data.employeeId).toBe(7);
    expect(result.data.audienceLevel).toBe("technician");
    expect(result.data.details).toBe("Bring the replacement soil.");
  });

  it("requires start_time", () => {
    const result = service.validateRequestScheduleEventPayload({
      end_time: "2026-04-15T11:00",
    });
    expect(result.error).toMatch(/start_time is required/);
  });

  it("requires end_time", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
    });
    expect(result.error).toMatch(/end_time is required/);
  });

  it("rejects end before start", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T11:00",
      end_time: "2026-04-15T09:00",
    });
    expect(result.error).toMatch(/must be after start_time/);
  });

  it("rejects end equal to start", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T09:00",
    });
    expect(result.error).toMatch(/must be after start_time/);
  });

  it("rejects non-integer employee_id", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T11:00",
      employee_id: "not-a-number",
    });
    expect(result.error).toMatch(/employee_id must be/);
  });

  it("defaults audienceLevel to technician when omitted", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T11:00",
    });
    expect(result.data.audienceLevel).toBe("technician");
  });

  it("accepts null employee_id as 'unassigned'", () => {
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T11:00",
      employee_id: null,
    });
    expect(result.error).toBeUndefined();
    expect(result.data.employeeId).toBeNull();
  });

  it("truncates details beyond 500 chars", () => {
    const long = "a".repeat(600);
    const result = service.validateRequestScheduleEventPayload({
      start_time: "2026-04-15T09:00",
      end_time: "2026-04-15T11:00",
      details: long,
    });
    expect(result.data.details.length).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// listLinkedEvents
// ---------------------------------------------------------------------------
describe("listLinkedEvents", () => {
  it("returns an empty array when no events exist", async () => {
    db.query.mockResolvedValueOnce(selectResult([]));
    const rows = await service.listLinkedEvents(42);
    expect(rows).toEqual([]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual([42]);
  });

  it("returns ordered rows when events exist", async () => {
    const rows = [
      { id: 1, start_time: "2026-04-15 09:00:00", employee_name: "Magnus" },
      { id: 2, start_time: "2026-04-17 14:00:00", employee_name: "Denver" },
    ];
    db.query.mockResolvedValueOnce(selectResult(rows));
    const result = await service.listLinkedEvents(42);
    expect(result).toEqual(rows);
    expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY s\.start_time ASC/);
  });
});

// ---------------------------------------------------------------------------
// createLinkedEvent
// ---------------------------------------------------------------------------
describe("createLinkedEvent", () => {
  const validBody = {
    start_time: "2026-04-15T09:00",
    end_time: "2026-04-15T11:00",
    employee_id: 7,
    details: "Bring the soil.",
  };

  // Canonical connection mock for this project — mirrors the pattern in
  // apps/api/src/routes/reqs.routes.test.js (DELETE /reqs/:id txn tests).
  // conn.query is the transactional spy; the post-commit getLinkedEventById
  // read stays on db.query (the pool).
  function setupConnMock() {
    const conn = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
      query: jest.fn(),
    };
    db.getConnection = jest.fn().mockResolvedValue(conn);
    return conn;
  }

  // Full happy auto-assign path:
  //   conn.query: [SELECT work_req FOR UPDATE, SELECT employee, INSERT event, UPDATE work_req]
  //   db.query  : [SELECT getLinkedEventById]
  function mockSuccessfulCreate({ workReqRow = WORK_REQ_ROW } = {}) {
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([workReqRow]))
      .mockResolvedValueOnce(selectResult([ACTIVE_EMPLOYEE]))
      .mockResolvedValueOnce(insertResult(101))
      .mockResolvedValueOnce(updateResult(1));
    db.query.mockResolvedValueOnce(
      selectResult([
        {
          id: 101,
          title: "WR-2026-0042 — Replace fern",
          start_time: "2026-04-15 09:00:00",
          end_time: "2026-04-15 11:00:00",
          employee_id: 7,
          work_req_id: 42,
          event_type: "request",
          employee_name: "Magnus",
        },
      ]),
    );
    return conn;
  }

  it("creates the event on a happy path", async () => {
    const conn = mockSuccessfulCreate();

    const result = await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    expect(result).toMatchObject({
      id: 101,
      event_type: "request",
      work_req_id: 42,
    });

    // Verify the INSERT query hardcoded event_type='request' (conn.query call #3)
    const insertCall = conn.query.mock.calls[2];
    expect(insertCall[0]).toMatch(
      /INSERT INTO schedule_events[\s\S]+VALUES.*'request'/,
    );
    expect(insertCall[1][0]).toBe("WR-2026-0042 — Replace fern");
    expect(insertCall[1][4]).toBe(42);

    // Transaction lifecycle
    expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("fires the activity log on success", async () => {
    mockSuccessfulCreate();
    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    // logActivity is invoked fire-and-forget — flush microtasks
    await Promise.resolve();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "schedule.request.create",
        targetType: "schedule_event",
        targetId: 101,
        metadata: expect.objectContaining({
          work_req_id: 42,
          reference_number: "WR-2026-0042",
        }),
      }),
    );
  });

  it("rejects invalid payload with VALIDATION_ERROR", async () => {
    // Validation errors short-circuit before opening a connection
    db.getConnection = jest.fn();

    await expect(
      service.createLinkedEvent({
        workReqId: 42,
        body: { start_time: "2026-04-15T11:00", end_time: "2026-04-15T09:00" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
    expect(db.getConnection).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("returns 404 WORK_REQ_NOT_FOUND when the work request does not exist", async () => {
    const conn = setupConnMock();
    conn.query.mockResolvedValueOnce(selectResult([]));

    await expect(
      service.createLinkedEvent({ workReqId: 999, body: validBody }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "WORK_REQ_NOT_FOUND",
    });

    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });

  it("returns 400 EMPLOYEE_NOT_FOUND when the employee does not exist", async () => {
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      .mockResolvedValueOnce(selectResult([])); // employee lookup returns zero

    await expect(
      service.createLinkedEvent({
        workReqId: 42,
        body: { ...validBody, employee_id: 99999 },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMPLOYEE_NOT_FOUND",
    });

    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
  });

  it("returns 400 EMPLOYEE_NOT_FOUND when the employee is inactive", async () => {
    // Inactive employee is filtered out by "AND status = 'Active'" in the
    // SELECT — the service sees an empty result set, same as 'not found'.
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      .mockResolvedValueOnce(selectResult([]));

    await expect(
      service.createLinkedEvent({
        workReqId: 42,
        body: { ...validBody, employee_id: 99 },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMPLOYEE_NOT_FOUND",
    });
  });

  it("skips the employee check when employee_id is null", async () => {
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      // NO employee lookup, NO auto-assign (employee_id is null)
      .mockResolvedValueOnce(insertResult(102));
    db.query.mockResolvedValueOnce(
      selectResult([
        {
          id: 102,
          employee_id: null,
          work_req_id: 42,
          event_type: "request",
        },
      ]),
    );

    const result = await service.createLinkedEvent({
      workReqId: 42,
      body: { ...validBody, employee_id: null },
    });

    expect(result.employee_id).toBeNull();
    // conn: SELECT work_req + INSERT = 2 calls (no employee lookup, no UPDATE)
    expect(conn.query).toHaveBeenCalledTimes(2);
    // pool: getLinkedEventById = 1 call
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(conn.commit).toHaveBeenCalledTimes(1);
  });

  it("derives the title from the reference and action", async () => {
    const conn = mockSuccessfulCreate();
    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
    });
    const insertCall = conn.query.mock.calls[2];
    expect(insertCall[1][0]).toBe("WR-2026-0042 — Replace fern");
  });

  it("truncates long action text in the title", () => {
    const longAction = "a".repeat(120);
    const title = service.buildEventTitle({
      referenceNumber: "WR-2026-0042",
      actionRequired: longAction,
    });
    // 60-char slice + ellipsis
    expect(title).toMatch(/^WR-2026-0042 — a{59}…$/);
  });

  // =========================================================================
  // Auto-assign coupling (schedule-assign-unify plan — Step 4)
  // =========================================================================

  it("auto-assigns the work request when employee provided and WR is unassigned", async () => {
    const conn = mockSuccessfulCreate();

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    // The UPDATE is conn.query call #4 (after work_req SELECT, employee SELECT, INSERT)
    const updateCall = conn.query.mock.calls[3];
    expect(updateCall[0]).toMatch(
      /UPDATE work_reqs SET assignedTo = \?, status = 'assigned'/,
    );
    expect(updateCall[1]).toEqual([7, 42]);
    expect(conn.commit).toHaveBeenCalledTimes(1);
    expect(conn.rollback).not.toHaveBeenCalled();

    // Flush the fire-and-forget activity log
    await Promise.resolve();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "work_req.auto_assigned",
        targetType: "work_req",
        targetId: 42,
        metadata: expect.objectContaining({
          from_status: "unassigned",
          to_status: "assigned",
          assigned_to: 7,
          trigger: "schedule_event_create",
          schedule_event_id: 101,
        }),
      }),
    );
  });

  it("does NOT auto-assign when the work request is already assigned", async () => {
    const alreadyAssigned = {
      ...WORK_REQ_ROW,
      status: "assigned",
      assignedTo: 5,
    };
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([alreadyAssigned]))
      .mockResolvedValueOnce(selectResult([ACTIVE_EMPLOYEE]))
      .mockResolvedValueOnce(insertResult(101));
    db.query.mockResolvedValueOnce(
      selectResult([
        { id: 101, employee_id: 7, work_req_id: 42, event_type: "request" },
      ]),
    );

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    // No UPDATE — only 3 conn.query invocations (SELECT wr, SELECT emp, INSERT)
    expect(conn.query).toHaveBeenCalledTimes(3);
    expect(
      conn.query.mock.calls.every((c) => !/UPDATE work_reqs/.test(c[0])),
    ).toBe(true);
    expect(conn.commit).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    const calls = logActivity.mock.calls;
    expect(calls.some((c) => c[0].action === "schedule.request.create")).toBe(
      true,
    );
    expect(calls.some((c) => c[0].action === "work_req.auto_assigned")).toBe(
      false,
    );
  });

  it("does NOT auto-assign when employee_id is null on the event", async () => {
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      .mockResolvedValueOnce(insertResult(102));
    db.query.mockResolvedValueOnce(
      selectResult([
        { id: 102, employee_id: null, work_req_id: 42, event_type: "request" },
      ]),
    );

    await service.createLinkedEvent({
      workReqId: 42,
      body: { ...validBody, employee_id: null },
      req: reqFor(),
    });

    expect(conn.query).toHaveBeenCalledTimes(2);
    expect(
      conn.query.mock.calls.every((c) => !/UPDATE work_reqs/.test(c[0])),
    ).toBe(true);

    await Promise.resolve();

    const calls = logActivity.mock.calls;
    expect(calls.some((c) => c[0].action === "work_req.auto_assigned")).toBe(
      false,
    );
  });

  it("rolls back the transaction when the auto-assign UPDATE fails", async () => {
    const conn = setupConnMock();
    conn.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      .mockResolvedValueOnce(selectResult([ACTIVE_EMPLOYEE]))
      .mockResolvedValueOnce(insertResult(101))
      .mockRejectedValueOnce(new Error("simulated UPDATE failure"));

    await expect(
      service.createLinkedEvent({
        workReqId: 42,
        body: validBody,
        req: reqFor(),
      }),
    ).rejects.toThrow("simulated UPDATE failure");

    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);

    await Promise.resolve();

    // Both activity logs fire AFTER commit — neither should have been emitted
    expect(logActivity).not.toHaveBeenCalled();
  });

  it("mirrors the status transition to Monday when auto-assign fires on a linked WR", async () => {
    const linkedRow = { ...WORK_REQ_ROW, monday_item_id: "999888" };
    mockSuccessfulCreate({ workReqRow: linkedRow });

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    // Flush the fire-and-forget IIFE
    await Promise.resolve();
    await Promise.resolve();

    expect(mondaySyncService.pushUpdate).toHaveBeenCalledTimes(1);
    expect(mondaySyncService.pushUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        monday_item_id: "999888",
        status: "assigned",
      }),
    );
  });

  it("does NOT call Monday pushUpdate when the WR has no monday_item_id", async () => {
    mockSuccessfulCreate();

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mondaySyncService.pushUpdate).not.toHaveBeenCalled();
  });

  it("does NOT call Monday pushUpdate when auto-assign did not fire", async () => {
    // Already-assigned WR — no auto-assign, so no Monday push even if linked
    const alreadyAssigned = {
      ...WORK_REQ_ROW,
      status: "assigned",
      assignedTo: 5,
      monday_item_id: "999888",
    };
    const connAlreadyAssigned = setupConnMock();
    connAlreadyAssigned.query
      .mockResolvedValueOnce(selectResult([alreadyAssigned]))
      .mockResolvedValueOnce(selectResult([ACTIVE_EMPLOYEE]))
      .mockResolvedValueOnce(insertResult(101));
    db.query.mockResolvedValueOnce(
      selectResult([
        { id: 101, employee_id: 7, work_req_id: 42, event_type: "request" },
      ]),
    );

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mondaySyncService.pushUpdate).not.toHaveBeenCalled();
  });

  it("locks the work_req row with FOR UPDATE inside the transaction", async () => {
    const conn = mockSuccessfulCreate();

    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
      req: reqFor(),
    });

    // The first conn.query call is the work_req SELECT, and it must include
    // FOR UPDATE. Running this on the pool (db.query) instead would lose the
    // row lock — the test must also confirm the call happened on conn.
    const workReqSelectCall = conn.query.mock.calls[0];
    expect(workReqSelectCall[0]).toMatch(/FOR UPDATE/);
    expect(workReqSelectCall[1]).toEqual([42]);

    // The pool is only used for the post-commit getLinkedEventById read
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toMatch(
      /SELECT[\s\S]+FROM schedule_events/,
    );
  });
});

// ---------------------------------------------------------------------------
// deleteLinkedEvent
// ---------------------------------------------------------------------------
describe("deleteLinkedEvent", () => {
  it("deletes when the event exists and belongs to the work req", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ id: 101, work_req_id: 42 }]))
      .mockResolvedValueOnce(deleteResult(1));

    const result = await service.deleteLinkedEvent({
      workReqId: 42,
      eventId: 101,
      req: reqFor(),
    });

    expect(result).toBe(true);
    expect(db.query.mock.calls[1][0]).toMatch(/DELETE FROM schedule_events/);
  });

  it("fires the activity log on success", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ id: 101, work_req_id: 42 }]))
      .mockResolvedValueOnce(deleteResult(1));

    await service.deleteLinkedEvent({
      workReqId: 42,
      eventId: 101,
      req: reqFor(),
    });
    await Promise.resolve();

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "schedule.request.delete",
        targetType: "schedule_event",
        targetId: 101,
      }),
    );
  });

  it("returns 404 SCHEDULE_EVENT_NOT_FOUND when the event does not exist", async () => {
    db.query.mockResolvedValueOnce(selectResult([]));

    await expect(
      service.deleteLinkedEvent({ workReqId: 42, eventId: 999 }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "SCHEDULE_EVENT_NOT_FOUND",
    });
  });

  it("returns 404 when the event exists but belongs to a different work req", async () => {
    db.query.mockResolvedValueOnce(
      selectResult([{ id: 101, work_req_id: 99 }]),
    );

    await expect(
      service.deleteLinkedEvent({ workReqId: 42, eventId: 101 }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "SCHEDULE_EVENT_NOT_FOUND",
    });
  });
});

// ---------------------------------------------------------------------------
// listUnscheduledWorkReqs
// ---------------------------------------------------------------------------
describe("listUnscheduledWorkReqs", () => {
  const rows = [
    { id: 1, referenceNumber: "WR-2026-0001" },
    { id: 2, referenceNumber: "WR-2026-0002" },
  ];

  function mockListReturn(totalRow = { total: 2 }, listRows = rows) {
    db.query
      .mockResolvedValueOnce(selectResult([totalRow]))
      .mockResolvedValueOnce(selectResult(listRows));
  }

  it("returns rows and total", async () => {
    mockListReturn();
    const result = await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: {},
    });
    expect(result.total).toBe(2);
    expect(result.rows).toEqual(rows);
  });

  it("applies the default 30-day filter when includeOlder is not set", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: {},
    });
    const countSql = db.query.mock.calls[0][0];
    expect(countSql).toMatch(/wr\.created_at >= \(NOW\(\) - INTERVAL 30 DAY\)/);
  });

  it("drops the 30-day filter when includeOlder is true", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: { includeOlder: true },
    });
    const countSql = db.query.mock.calls[0][0];
    expect(countSql).not.toMatch(/INTERVAL 30 DAY/);
  });

  it("uses LEFT JOIN ... IS NULL per Decision E", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({ pageSize: 25, offset: 0 });
    const countSql = db.query.mock.calls[0][0];
    expect(countSql).toMatch(/LEFT JOIN schedule_events/);
    expect(countSql).toMatch(/se\.work_req_id IS NULL/);
  });

  it("applies the assignedToPresent filter when set", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: { assignedToPresent: true },
    });
    const countSql = db.query.mock.calls[0][0];
    expect(countSql).toMatch(/wr\.assignedTo IS NOT NULL/);
  });

  it("applies an exact-integer assignedTo filter", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: { assignedTo: 7 },
    });
    const countSql = db.query.mock.calls[0][0];
    const countParams = db.query.mock.calls[0][1];
    expect(countSql).toMatch(/wr\.assignedTo = \?/);
    expect(countParams).toContain(7);
  });

  it("applies a case-insensitive LIKE on the account filter", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: { account: "Inter" },
    });
    const countSql = db.query.mock.calls[0][0];
    const countParams = db.query.mock.calls[0][1];
    expect(countSql).toMatch(/LOWER\(wr\.account\) LIKE LOWER\(\?\)/);
    expect(countParams).toContain("%Inter%");
  });

  it("honors pageSize and offset in the row query", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 50,
      offset: 100,
      filters: {},
    });
    const listParams = db.query.mock.calls[1][1];
    // Last two params are always limit, offset
    expect(listParams.slice(-2)).toEqual([50, 100]);
  });

  it("ignores a non-integer assignedTo silently", async () => {
    mockListReturn();
    await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
      filters: { assignedTo: "not-a-number" },
    });
    const countSql = db.query.mock.calls[0][0];
    expect(countSql).not.toMatch(/wr\.assignedTo = \?/);
  });

  it("returns total=0 when the DB returns no rows", async () => {
    db.query
      .mockResolvedValueOnce(selectResult([{ total: 0 }]))
      .mockResolvedValueOnce(selectResult([]));
    const result = await service.listUnscheduledWorkReqs({
      pageSize: 25,
      offset: 0,
    });
    expect(result).toEqual({ rows: [], total: 0 });
  });
});

// ---------------------------------------------------------------------------
// normalizeDateTime
// ---------------------------------------------------------------------------
describe("normalizeDateTime", () => {
  it("converts a datetime-local string to MySQL DATETIME", () => {
    const result = service.normalizeDateTime("2026-04-15T09:00");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("returns null for empty/undefined/null", () => {
    expect(service.normalizeDateTime("")).toBeNull();
    expect(service.normalizeDateTime(undefined)).toBeNull();
    expect(service.normalizeDateTime(null)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(service.normalizeDateTime("not-a-date")).toBeNull();
  });
});
