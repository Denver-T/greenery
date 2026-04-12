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
const { selectResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper: set up auth mock so requests authenticate as the given employee.
function mockAuth(emp) {
  const decoded = firebaseDecodedToken({ email: emp.email });
  admin.auth().verifyIdToken.mockResolvedValue(decoded);
  // authMiddleware calls getEmployeeByEmail → db.query with LOWER(email)
  // Subsequent db.query calls are for the actual route handler.
  return decoded;
}

describe("GET /auth/me", () => {
  it("returns the authenticated employee", async () => {
    const emp = employee({ id: 3, permissionLevel: "Manager" });
    mockAuth(emp);

    db.query
      .mockResolvedValueOnce(selectResult([emp]))  // authMiddleware getEmployeeByEmail
      .mockResolvedValueOnce(selectResult([emp]));  // getMe → getEmployeeByEmail

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ id: 3, email: emp.email })
    );
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
  });

  it("returns 404 when the authenticated email has no employee record", async () => {
    const decoded = firebaseDecodedToken({ email: "ghost@example.com" });
    admin.auth().verifyIdToken.mockResolvedValue(decoded);

    // authMiddleware lookup returns no employee
    db.query.mockResolvedValue(selectResult([]));

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(404);
  });
});

describe("GET /auth/my-tasks", () => {
  it("returns tasks for the authenticated user", async () => {
    const emp = employee({ id: 5 });
    mockAuth(emp);

    const tasks = [workReqRow({ id: 1, assignedTo: 5 })];
    db.query
      .mockResolvedValueOnce(selectResult([emp]))    // authMiddleware
      .mockResolvedValueOnce(selectResult(tasks));    // getMyTasks → getTasks

    const res = await request(app)
      .get("/auth/my-tasks")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("GET /auth/health", () => {
  it("returns user identity when authenticated", async () => {
    const emp = employee();
    mockAuth(emp);

    db.query.mockResolvedValue(selectResult([emp])); // authMiddleware

    const res = await request(app)
      .get("/auth/health")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(
      expect.objectContaining({ email: emp.email })
    );
  });
});
