jest.mock("../../config/firebase", () => {
  const verifyIdToken = jest.fn();
  return {
    auth: () => ({ verifyIdToken }),
  };
});
jest.mock("../db");

const { verifyToken } = require("./authMiddleware");
const admin = require("../../config/firebase");
const db = require("../db");
const { employee, firebaseDecodedToken } = require("../test/factories");
const { selectResult } = require("../test/mockDb");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("verifyToken", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const req = { headers: {} };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTH_TOKEN_MISSING" })
    );
  });

  it("returns 401 when Authorization header is not Bearer format", async () => {
    const req = { headers: { authorization: "Basic abc123" } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTH_TOKEN_MISSING" })
    );
  });

  it("returns 401 when Bearer token is empty", async () => {
    const req = { headers: { authorization: "Bearer " } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTH_TOKEN_MISSING" })
    );
  });

  it("returns 401 when Firebase rejects the token", async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error("Token expired"));
    const req = {
      headers: { authorization: "Bearer bad-token" },
      method: "GET",
      url: "/test",
    };
    const next = jest.fn();

    jest.spyOn(console, "error").mockImplementation(() => {});
    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTH_TOKEN_INVALID" })
    );
  });

  it("logs auth failures in the structured format with timestamp, request id, method, path", async () => {
    admin.auth().verifyIdToken.mockRejectedValue(
      Object.assign(new Error("Token expired"), { code: "auth/id-token-expired" })
    );
    const req = {
      headers: { authorization: "Bearer bad-token" },
      method: "POST",
      url: "/employees/5",
    };
    const next = jest.fn();

    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await verifyToken(req, mockRes(), next);

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[auth\] \d{4}-\d{2}-\d{2}T[\d:.]+Z req=[a-f0-9]{8} POST \/employees\/5 — auth\/id-token-expired: Token expired$/
      )
    );
  });

  it("sets req.user with employee data when employee exists in DB", async () => {
    const emp = employee({ id: 5, role: "Manager", permissionLevel: "Manager" });
    const decoded = firebaseDecodedToken({ email: emp.email });

    admin.auth().verifyIdToken.mockResolvedValue(decoded);
    db.query.mockResolvedValue(selectResult([emp]));

    const req = { headers: { authorization: "Bearer valid-token" } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(
      expect.objectContaining({
        uid: decoded.uid,
        email: emp.email,
        employeeId: 5,
        role: "Manager",
        permissionLevel: "Manager",
        employee: emp,
      })
    );
  });

  it("falls back to Firebase claims when employee is not in DB", async () => {
    const decoded = firebaseDecodedToken({
      email: "unknown@example.com",
      role: "Manager",
      permissionLevel: "Manager",
    });

    admin.auth().verifyIdToken.mockResolvedValue(decoded);
    db.query.mockResolvedValue(selectResult([]));

    const req = { headers: { authorization: "Bearer valid-token" } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.employeeId).toBeNull();
    expect(req.user.role).toBe("Manager");
    expect(req.user.permissionLevel).toBe("Manager");
    expect(req.user.employee).toBeNull();
  });

  it("normalizes email to lowercase", async () => {
    const decoded = firebaseDecodedToken({ email: "  UPPER@Example.COM  " });

    admin.auth().verifyIdToken.mockResolvedValue(decoded);
    db.query.mockResolvedValue(selectResult([]));

    const req = { headers: { authorization: "Bearer valid-token" } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(req.user.email).toBe("upper@example.com");
  });

  it("sets email to null when decoded token has no email", async () => {
    const decoded = firebaseDecodedToken({ email: undefined });
    delete decoded.email;

    admin.auth().verifyIdToken.mockResolvedValue(decoded);

    const req = { headers: { authorization: "Bearer valid-token" } };
    const next = jest.fn();

    await verifyToken(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user.email).toBeNull();
    expect(req.user.employee).toBeNull();
  });
});
