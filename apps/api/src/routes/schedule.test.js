jest.mock("../../config/firebase", () => {
  const verifyIdToken = jest.fn();
  return { auth: () => ({ verifyIdToken }) };
});
jest.mock("../db");

const request = require("supertest");
const app = require("../app");
const admin = require("../../config/firebase");
const db = require("../db");
const { employee, firebaseDecodedToken } = require("../test/factories");
const { selectResult, deleteResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

// Authenticate as the given employee for the request chain.
function mockAuth(emp) {
  const decoded = firebaseDecodedToken({ email: emp.email });
  admin.auth().verifyIdToken.mockResolvedValue(decoded);
  return emp;
}

// Smart db.query mock for the negative-path tests: returns the admin actor
// on the first SELECT (auth middleware lookup) and empty results otherwise.
// The handler never reaches db.query because the param validation fires first.
function setupAuthOnlyMock(actor) {
  db.query.mockImplementation((sql) => {
    if (typeof sql !== "string") return Promise.resolve(selectResult([]));
    return Promise.resolve(selectResult([actor]));
  });
}

const adminActor = employee({
  id: 1,
  permissionLevel: "Administrator",
  email: "admin@greenery.test",
});

describe("PUT /schedule/:id — param validation", () => {
  it.each([
    ["non-numeric", "abc"],
    ["decimal", "1.5"],
    ["negative", "-3"],
    ["zero", "0"],
  ])("rejects %s id with 400 VALIDATION_ERROR", async (_label, badId) => {
    mockAuth(adminActor);
    setupAuthOnlyMock(adminActor);

    const res = await request(app)
      .put(`/schedule/${badId}`)
      .set("Authorization", "Bearer test-token")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /schedule/:id — param validation", () => {
  it.each([
    ["non-numeric", "abc"],
    ["decimal", "1.5"],
    ["negative", "-3"],
    ["zero", "0"],
  ])("rejects %s id with 400 VALIDATION_ERROR", async (_label, badId) => {
    mockAuth(adminActor);
    setupAuthOnlyMock(adminActor);

    const res = await request(app)
      .delete(`/schedule/${badId}`)
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /schedule/:id — happy-path regression", () => {
  it("deletes a custom schedule event by valid id", async () => {
    mockAuth(adminActor);

    const customEvent = {
      id: 42,
      event_type: "custom",
      title: "Team standup",
      start_time: "2026-04-09 10:00:00",
      end_time: "2026-04-09 11:00:00",
      employee_id: null,
      work_req_id: null,
      audience_level: "admin",
      created_by_email: "admin@greenery.test",
    };

    let selectCallCount = 0;
    db.query.mockImplementation((sql) => {
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (sql.includes("DELETE FROM schedule_events")) {
        return Promise.resolve(deleteResult(1));
      }
      // SELECT path: 1st = auth middleware lookup, 2nd = getScheduleEventById
      selectCallCount += 1;
      if (selectCallCount === 1) return Promise.resolve(selectResult([adminActor]));
      return Promise.resolve(selectResult([customEvent]));
    });

    const res = await request(app)
      .delete("/schedule/42")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(204);
  });
});
