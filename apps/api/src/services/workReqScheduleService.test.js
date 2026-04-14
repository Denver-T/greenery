jest.mock("../db");
jest.mock("../utils/activityLogger", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const db = require("../db");
const { logActivity } = require("../utils/activityLogger");
const {
  selectResult,
  insertResult,
  deleteResult,
} = require("../test/mockDb");
const service = require("./workReqScheduleService");

const WORK_REQ_ROW = {
  id: 42,
  referenceNumber: "WR-2026-0042",
  actionRequired: "Replace fern",
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

  function mockSuccessfulCreate() {
    db.query
      // 1. work req lookup
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      // 2. employee lookup
      .mockResolvedValueOnce(selectResult([ACTIVE_EMPLOYEE]))
      // 3. INSERT
      .mockResolvedValueOnce(insertResult(101))
      // 4. getLinkedEventById
      .mockResolvedValueOnce(
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
  }

  it("creates the event on a happy path", async () => {
    mockSuccessfulCreate();

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

    // Verify the INSERT query hardcoded event_type='request'
    const insertCall = db.query.mock.calls[2];
    expect(insertCall[0]).toMatch(
      /INSERT INTO schedule_events[\s\S]+VALUES.*'request'/,
    );
    // Title derived from reference + action
    expect(insertCall[1][0]).toBe("WR-2026-0042 — Replace fern");
    // work_req_id bound correctly
    expect(insertCall[1][4]).toBe(42);
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
    await expect(
      service.createLinkedEvent({
        workReqId: 42,
        body: { start_time: "2026-04-15T11:00", end_time: "2026-04-15T09:00" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
    // Did not touch the DB
    expect(db.query).not.toHaveBeenCalled();
  });

  it("returns 404 WORK_REQ_NOT_FOUND when the work request does not exist", async () => {
    db.query.mockResolvedValueOnce(selectResult([]));
    await expect(
      service.createLinkedEvent({ workReqId: 999, body: validBody }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "WORK_REQ_NOT_FOUND",
    });
  });

  it("returns 400 EMPLOYEE_NOT_FOUND when the employee does not exist", async () => {
    db.query
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
  });

  it("returns 400 EMPLOYEE_NOT_FOUND when the employee is inactive", async () => {
    // Inactive employee is filtered out by "AND status = 'Active'" in the
    // SELECT — the service sees an empty result set, same as 'not found'.
    db.query
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
    db.query
      .mockResolvedValueOnce(selectResult([WORK_REQ_ROW]))
      // NO employee lookup
      .mockResolvedValueOnce(insertResult(102))
      .mockResolvedValueOnce(
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
    // work req lookup + INSERT + getLinkedEventById = 3 calls, no employee lookup
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it("derives the title from the reference and action", async () => {
    mockSuccessfulCreate();
    await service.createLinkedEvent({
      workReqId: 42,
      body: validBody,
    });
    const insertCall = db.query.mock.calls[2];
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
