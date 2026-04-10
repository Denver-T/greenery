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
const { selectResult } = require("../test/mockDb");

beforeEach(() => {
  jest.clearAllMocks();
});

function mockAuth(emp) {
  const decoded = firebaseDecodedToken({ email: emp.email });
  admin.auth().verifyIdToken.mockResolvedValue(decoded);
  return emp;
}

function setupAnalyticsMock(actor) {
  let authDone = false;

  db.query.mockImplementation((sql) => {
    if (typeof sql !== "string") return Promise.resolve(selectResult([]));

    // Auth middleware employee lookup
    if (!authDone && sql.includes("email")) {
      authDone = true;
      return Promise.resolve(selectResult([actor]));
    }

    // Overview: plants aggregate
    if (sql.includes("FROM plants") && sql.includes("SUM(quantity)")) {
      return Promise.resolve(selectResult([{ types: 5, units: 42, value: "1250.00", lowStock: 2 }]));
    }

    // Top requested
    if (sql.includes("plantWanted") && sql.includes("GROUP BY")) {
      return Promise.resolve(selectResult([
        { plant: "fern", count: 8, totalPlants: 12 },
        { plant: "pothos", count: 5, totalPlants: 7 },
      ]));
    }

    // Top replaced
    if (sql.includes("plantReplaced") && sql.includes("GROUP BY")) {
      return Promise.resolve(selectResult([
        { plant: "palm", count: 3, totalPlants: 3 },
      ]));
    }

    // Requests by status
    if (sql.includes("GROUP BY status")) {
      return Promise.resolve(selectResult([
        { status: "unassigned", count: 4 },
        { status: "completed", count: 10 },
      ]));
    }

    // Requests over time
    if (sql.includes("DATE_FORMAT")) {
      return Promise.resolve(selectResult([
        { period: "2026-03-01", count: 6 },
        { period: "2026-04-01", count: 8 },
      ]));
    }

    // Top accounts
    if (sql.includes("GROUP BY account")) {
      return Promise.resolve(selectResult([
        { label: "Acme Corp", count: 7 },
      ]));
    }

    // Stock vs demand (LEFT JOIN plants)
    if (sql.includes("LEFT JOIN") && sql.includes("plants")) {
      return Promise.resolve(selectResult([
        { name: "Fern", quantity: 5, openRequests: 3 },
      ]));
    }

    // Low stock
    if (sql.includes("quantity <= 2")) {
      return Promise.resolve(selectResult([
        { name: "Snake Plant", quantity: 1, cost_per_unit: "15.00" },
      ]));
    }

    return Promise.resolve(selectResult([]));
  });
}

function setupEmptyMock(actor) {
  let authDone = false;

  db.query.mockImplementation((sql) => {
    if (typeof sql !== "string") return Promise.resolve(selectResult([]));

    if (!authDone && sql.includes("email")) {
      authDone = true;
      return Promise.resolve(selectResult([actor]));
    }

    // Overview returns zeros
    if (sql.includes("FROM plants") && sql.includes("SUM(quantity)")) {
      return Promise.resolve(selectResult([{ types: 0, units: 0, value: "0", lowStock: 0 }]));
    }

    return Promise.resolve(selectResult([]));
  });
}

describe("GET /analytics/summary", () => {
  it("returns analytics data for an authenticated manager", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupAnalyticsMock(actor);

    const res = await request(app)
      .get("/analytics/summary")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("overview");
    expect(res.body.data).toHaveProperty("topRequested");
    expect(res.body.data).toHaveProperty("topReplaced");
    expect(res.body.data).toHaveProperty("requestsByStatus");
    expect(res.body.data).toHaveProperty("requestsOverTime");
    expect(res.body.data).toHaveProperty("topAccountsByVolume");
    expect(res.body.data).toHaveProperty("stockVsDemand");
    expect(res.body.data).toHaveProperty("lowStockPlants");

    expect(res.body.data.overview).toEqual({
      types: 5,
      units: 42,
      value: 1250,
      lowStock: 2,
    });
    expect(res.body.data.topRequested).toHaveLength(2);
    expect(res.body.data.topRequested[0].plant).toBe("fern");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request(app).get("/analytics/summary");

    expect(res.status).toBe(401);
  });

  it("returns analytics with period=7d shortcut", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupAnalyticsMock(actor);

    const res = await request(app)
      .get("/analytics/summary?period=7d")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("overview");
  });

  it("returns analytics with explicit startDate and endDate", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupAnalyticsMock(actor);

    const res = await request(app)
      .get("/analytics/summary?startDate=2026-01-01&endDate=2026-03-01")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("overview");
  });

  it("returns 400 for an invalid period", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupAnalyticsMock(actor);

    const res = await request(app)
      .get("/analytics/summary?period=invalid")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(400);
  });

  it("returns valid shape with empty data", async () => {
    const actor = employee({ permissionLevel: "Manager" });
    mockAuth(actor);
    setupEmptyMock(actor);

    const res = await request(app)
      .get("/analytics/summary")
      .set("Authorization", "Bearer test-token");

    expect(res.status).toBe(200);
    expect(res.body.data.overview).toEqual({
      types: 0,
      units: 0,
      value: 0,
      lowStock: 0,
    });
    expect(res.body.data.topRequested).toEqual([]);
    expect(res.body.data.stockVsDemand).toEqual([]);
    expect(res.body.data.lowStockPlants).toEqual([]);
  });
});
