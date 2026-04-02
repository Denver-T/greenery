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
const { selectResult, insertResult, updateResult, deleteResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

// Authenticate as the given employee for the request chain.
function mockAuth(emp) {
  const decoded = firebaseDecodedToken({ email: emp.email });
  admin.auth().verifyIdToken.mockResolvedValue(decoded);
  return emp;
}

// Smart db.query mock that returns appropriate results based on SQL content.
// Handles the multi-query flows (auth lookup, service calls, logActivity).
function setupDbMock(employees = [], opts = {}) {
  const { insertId = 1, affectedRows = 1 } = opts;
  db.query.mockImplementation((sql) => {
    if (typeof sql !== "string") return Promise.resolve(selectResult([]));
    if (sql.includes("INSERT INTO activity_logs")) {
      return Promise.resolve(insertResult(0));
    }
    if (sql.includes("INSERT INTO employees")) {
      return Promise.resolve(insertResult(insertId));
    }
    if (sql.includes("UPDATE employees")) {
      return Promise.resolve(updateResult(affectedRows));
    }
    if (sql.includes("DELETE FROM employees")) {
      return Promise.resolve(deleteResult(affectedRows));
    }
    // SELECT queries: return the employees array
    return Promise.resolve(selectResult(employees));
  });
}

describe("GET /employees", () => {
  it("returns a list of employees for an authenticated technician", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);

    const list = [actor, employee({ id: 2, name: "Other" })];
    setupDbMock(list);

    const res = await request(app)
      .get("/employees")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/employees");

    expect(res.status).toBe(401);
  });
});

describe("GET /employees/:id", () => {
  it("returns a single employee by ID", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);

    const target = employee({ id: 7, name: "Target" });
    setupDbMock([target]);

    const res = await request(app)
      .get("/employees/7")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(expect.objectContaining({ id: 7 }));
  });

  it("returns 404 when the employee does not exist", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);

    // Auth lookup returns the actor, but getById returns empty
    let callCount = 0;
    db.query.mockImplementation(() => {
      callCount++;
      // First SELECT is auth middleware, second is getById
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .get("/employees/999")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid ID", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupDbMock([actor]);

    const res = await request(app)
      .get("/employees/abc")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(400);
  });
});

describe("POST /employees", () => {
  it("creates an employee when called by a superadmin", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "super@greenery.test",
    });
    mockAuth(actor);

    const created = employee({ id: 10, name: "New Tech", email: "new@greenery.test" });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      // 1: auth middleware getEmployeeByEmail
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      // 2: duplicate email check (getEmployeeByEmail) → no duplicate
      if (callCount === 2) return Promise.resolve(selectResult([]));
      // 3: INSERT employee
      if (sql.includes("INSERT INTO employees")) return Promise.resolve(insertResult(10));
      // 4: getEmployeeById after insert
      if (callCount === 4) return Promise.resolve(selectResult([created]));
      // 5: logActivity INSERT
      if (sql.includes("activity_logs")) return Promise.resolve(insertResult(0));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .post("/employees")
      .set("Authorization", "Bearer test-token")
      .send({ name: "New Tech", email: "new@greenery.test" });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(expect.objectContaining({ id: 10 }));
  });

  it("returns 403 when a technician tries to create an employee", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock([actor]);

    const res = await request(app)
      .post("/employees")
      .set("Authorization", "Bearer test-token")
      .send({ name: "New" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "super@greenery.test",
    });
    mockAuth(actor);

    let callCount = 0;
    db.query.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .post("/employees")
      .set("Authorization", "Bearer test-token")
      .send({ name: "" });

    expect(res.status).toBe(400);
  });
});

describe("PUT /employees/:id", () => {
  it("updates an employee when called by a superadmin", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "super@greenery.test",
    });
    mockAuth(actor);

    const existing = employee({ id: 5, name: "Old Name" });
    const updated = employee({ id: 5, name: "New Name" });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      // getEmployeeById for existing check
      if (callCount === 2) return Promise.resolve(selectResult([existing]));
      // duplicate email check
      if (callCount === 3) return Promise.resolve(selectResult([]));
      // UPDATE
      if (sql.includes("UPDATE employees")) return Promise.resolve(updateResult(1));
      // getEmployeeById after update
      if (callCount === 5) return Promise.resolve(selectResult([updated]));
      // logActivity
      if (sql.includes("activity_logs")) return Promise.resolve(insertResult(0));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .put("/employees/5")
      .set("Authorization", "Bearer test-token")
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
  });

  it("returns 404 when updating a non-existent employee", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "super@greenery.test",
    });
    mockAuth(actor);

    let callCount = 0;
    db.query.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .put("/employees/999")
      .set("Authorization", "Bearer test-token")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /employees/:id", () => {
  it("deletes an employee when called by an admin", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "super@greenery.test",
    });
    mockAuth(actor);

    const target = employee({ id: 5, name: "Deletable" });

    let callCount = 0;
    db.query.mockImplementation((sql) => {
      callCount++;
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (callCount === 1) return Promise.resolve(selectResult([actor]));
      // getEmployeeById for existing check
      if (callCount === 2) return Promise.resolve(selectResult([target]));
      // DELETE
      if (sql.includes("DELETE FROM employees")) return Promise.resolve(deleteResult(1));
      // logActivity
      if (sql.includes("activity_logs")) return Promise.resolve(insertResult(0));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .delete("/employees/5")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });

  it("returns 403 when a technician tries to delete", async () => {
    const actor = employee({ permissionLevel: "Technician" });
    mockAuth(actor);
    setupDbMock([actor]);

    const res = await request(app)
      .delete("/employees/5")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(403);
  });

  it("returns 403 when a manager tries to delete", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupDbMock([actor]);

    const res = await request(app)
      .delete("/employees/5")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(403);
  });
});
