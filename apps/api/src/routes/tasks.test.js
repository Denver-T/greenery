jest.mock("../../config/firebase", () => {
  const verifyIdToken = jest.fn();
  return { auth: () => ({ verifyIdToken }) };
});
jest.mock("../db");

const request = require("supertest");
const app = require("../app");
const admin = require("../../config/firebase");
const db = require("../db");
const { employee, firebaseDecodedToken, workReqRow } = require("../test/factories");
const { selectResult, insertResult, updateResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

function mockAuth(emp) {
  const decoded = firebaseDecodedToken({ email: emp.email });
  admin.auth().verifyIdToken.mockResolvedValue(decoded);
  return emp;
}

// Default db mock: auth lookup returns the actor, other queries return configurable data.
function setupDbMock(actor, dataRows = [], opts = {}) {
  const { insertId = 1 } = opts;
  let authDone = false;

  db.query.mockImplementation((sql) => {
    if (typeof sql !== "string") return Promise.resolve(selectResult([]));

    // First SELECT with email is auth middleware lookup
    if (!authDone && sql.includes("email")) {
      authDone = true;
      return Promise.resolve(selectResult([actor]));
    }
    if (sql.includes("INSERT INTO work_reqs")) {
      return Promise.resolve(insertResult(insertId));
    }
    if (sql.includes("UPDATE work_reqs")) {
      return Promise.resolve(updateResult(dataRows.length > 0 ? 1 : 0));
    }
    return Promise.resolve(selectResult(dataRows));
  });
}

describe("GET /tasks", () => {
  it("returns tasks for an authenticated technician", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);

    const tasks = [workReqRow(), workReqRow({ id: 2 })];
    setupDbMock(actor, tasks);

    const res = await request(app)
      .get("/tasks")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toHaveProperty("title");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/tasks");

    expect(res.status).toBe(401);
  });
});

describe("GET /tasks/:id", () => {
  it("returns a single task by ID", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);

    const task = workReqRow({ id: 3 });
    setupDbMock(actor, [task]);

    const res = await request(app)
      .get("/tasks/3")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(3);
  });

  it("returns 404 when the task does not exist", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .get("/tasks/999")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid task ID", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .get("/tasks/abc")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(400);
  });
});

describe("POST /tasks", () => {
  it("creates a task when called by a manager", async () => {
    const actor = employee({ permissionLevel: "Manager", email: "mgr@greenery.test" });
    mockAuth(actor);

    const created = workReqRow({ id: 10 });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      // 1: auth middleware
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      // 2: ensureEmployeeExists (for assigned_to)
      if (callCount === 2) return Promise.resolve(selectResult([{ id: 1 }]));
      // 3: INSERT
      if (sql.includes("INSERT")) return Promise.resolve(insertResult(10));
      // 4: getTaskById after insert
      return Promise.resolve(selectResult([created]));
    });

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", "Bearer test-token")
      .send({ title: "New task", assigned_to: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(10);
  });

  it("returns 403 when a technician tries to create a task", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", "Bearer test-token")
      .send({ title: "Unauthorized task" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    const actor = employee({ permissionLevel: "Manager", email: "mgr@greenery.test" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", "Bearer test-token")
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid status value", async () => {
    const actor = employee({ permissionLevel: "Manager", email: "mgr@greenery.test" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", "Bearer test-token")
      .send({ title: "Task", status: "bogus" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/:id/status", () => {
  it("updates the task status for a technician", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);

    const updated = workReqRow({ id: 5, status: "completed" });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      if (sql.includes("UPDATE")) return Promise.resolve(updateResult(1));
      return Promise.resolve(selectResult([updated]));
    });

    const res = await request(app)
      .patch("/tasks/5/status")
      .set("Authorization", "Bearer test-token")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
  });

  it("returns 400 for an invalid status", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .patch("/tasks/5/status")
      .set("Authorization", "Bearer test-token")
      .send({ status: "invalid" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/:id/assign", () => {
  it("assigns a task when called by a manager", async () => {
    const actor = employee({ permissionLevel: "Manager", email: "mgr@greenery.test" });
    mockAuth(actor);

    const assigned = workReqRow({ id: 5, assignedTo: 2, status: "assigned" });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      // ensureEmployeeExists
      if (callCount === 2) return Promise.resolve(selectResult([{ id: 2 }]));
      // UPDATE
      if (sql.includes("UPDATE")) return Promise.resolve(updateResult(1));
      // getTaskById
      return Promise.resolve(selectResult([assigned]));
    });

    const res = await request(app)
      .patch("/tasks/5/assign")
      .set("Authorization", "Bearer test-token")
      .send({ assigned_to: 2 });

    expect(res.status).toBe(200);
  });

  it("returns 403 when a technician tries to assign", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock(actor, []);

    const res = await request(app)
      .patch("/tasks/5/assign")
      .set("Authorization", "Bearer test-token")
      .send({ assigned_to: 2 });

    expect(res.status).toBe(403);
  });
});
