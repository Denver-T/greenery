jest.mock("../../config/firebase", () => {
  const verifyIdToken = jest.fn();
  const deleteUser = jest.fn().mockResolvedValue(undefined);
  return { auth: () => ({ verifyIdToken, deleteUser }) };
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

describe("DELETE /employees/me", () => {
  // Helper: stages db.query so the auth middleware lookup, the controller's
  // getEmployeeByEmail call, the optional countSuperAdmins call, the
  // logActivity insert, and the deleteSelfEmployee delete all return
  // sensible values in the order the controller runs them.
  function setupSelfDeleteDb({
    actor,
    superAdminCount = null,
    deleteAffectedRows = 1,
    employeeFound = true,
  }) {
    let selectCallCount = 0;
    db.query.mockImplementation((sql) => {
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      if (sql.includes("INSERT INTO activity_logs")) {
        return Promise.resolve(insertResult(0));
      }
      if (sql.includes("DELETE FROM employees")) {
        return Promise.resolve(deleteResult(deleteAffectedRows));
      }
      if (sql.includes("COUNT(*)") && sql.includes("SuperAdmin")) {
        return Promise.resolve(selectResult([{ count: superAdminCount ?? 0 }]));
      }
      // SELECT path: first call is auth middleware getEmployeeByEmail (returns actor),
      // second call is controller getEmployeeByEmail (returns actor or empty).
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return Promise.resolve(selectResult([actor]));
      }
      if (selectCallCount === 2) {
        return Promise.resolve(selectResult(employeeFound ? [actor] : []));
      }
      return Promise.resolve(selectResult([]));
    });
  }

  it("deletes the authenticated technician's own account", async () => {
    const actor = employee({
      id: 42,
      permissionLevel: "Technician",
      email: "tech@greenery.test",
    });
    mockAuth(actor);
    setupSelfDeleteDb({ actor });

    const res = await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).delete("/employees/me");

    expect(res.status).toBe(401);
  });

  it("returns 404 when the authenticated employee row does not exist", async () => {
    const actor = employee({
      id: 99,
      permissionLevel: "Technician",
      email: "ghost@greenery.test",
    });
    // Auth middleware finds the actor, but the controller's lookup does not.
    let selectCallCount = 0;
    admin.auth().verifyIdToken.mockResolvedValue(
      firebaseDecodedToken({ email: actor.email }),
    );
    db.query.mockImplementation((sql) => {
      if (typeof sql !== "string") return Promise.resolve(selectResult([]));
      selectCallCount += 1;
      if (selectCallCount === 1) return Promise.resolve(selectResult([actor]));
      return Promise.resolve(selectResult([]));
    });

    const res = await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(404);
  });

  it("returns 409 LAST_SUPERADMIN when the only super admin tries to self-delete", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "lonely-super@greenery.test",
    });
    mockAuth(actor);
    setupSelfDeleteDb({ actor, superAdminCount: 1 });

    const res = await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LAST_SUPERADMIN");
  });

  it("allows a super admin to self-delete when another super admin exists", async () => {
    const actor = employee({
      id: 1,
      permissionLevel: "SuperAdmin",
      email: "first-super@greenery.test",
    });
    mockAuth(actor);
    setupSelfDeleteDb({ actor, superAdminCount: 2 });

    const res = await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
  });

  it("writes an activity_logs row for the self-deletion", async () => {
    const actor = employee({
      id: 7,
      permissionLevel: "Technician",
      email: "audit@greenery.test",
    });
    mockAuth(actor);
    setupSelfDeleteDb({ actor });

    await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    const activityCalls = db.query.mock.calls.filter(
      ([sql]) => typeof sql === "string" && sql.includes("INSERT INTO activity_logs"),
    );
    expect(activityCalls.length).toBeGreaterThanOrEqual(1);
    // The action string is passed as a parameter; check the params bundle of the first matching call
    const params = activityCalls[0][1] || [];
    expect(params.some((p) => p === "employee.self_deleted")).toBe(true);
  });

  it("still returns 200 when Firebase user deletion fails (best-effort)", async () => {
    const actor = employee({
      id: 8,
      permissionLevel: "Technician",
      email: "fb-fail@greenery.test",
    });
    mockAuth(actor);
    setupSelfDeleteDb({ actor });

    // Spy on console.warn so we can assert the warning was emitted.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    admin.auth().deleteUser.mockRejectedValueOnce(new Error("firebase boom"));

    const res = await request(app)
      .delete("/employees/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[removeSelf] Firebase user deletion failed"),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});
