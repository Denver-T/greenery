const { authorize } = require("./authorize");
const { authenticatedUser } = require("../test/factories");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authorize", () => {
  it("allows technician when technician+ is required", () => {
    const middleware = authorize("technician");
    const next = jest.fn();
    const req = { user: authenticatedUser({ permissionLevel: "Technician" }) };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("allows manager when technician+ is required", () => {
    const middleware = authorize("technician");
    const next = jest.fn();
    const req = { user: authenticatedUser({ permissionLevel: "Manager" }) };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks technician when manager+ is required", () => {
    const middleware = authorize("manager");
    const next = jest.fn();
    const req = { user: authenticatedUser({ permissionLevel: "Technician" }) };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: "AUTH_FORBIDDEN" })
    );
  });

  it("allows manager when manager+ is required", () => {
    const middleware = authorize("manager");
    const next = jest.fn();
    const req = { user: authenticatedUser({ permissionLevel: "Manager" }) };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("blocks technician and manager when admin+ is required", () => {
    const middleware = authorize("admin");
    const next = jest.fn();

    const techReq = { user: authenticatedUser({ permissionLevel: "Technician" }) };
    middleware(techReq, mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );

    next.mockClear();
    const mgrReq = { user: authenticatedUser({ permissionLevel: "Manager" }) };
    middleware(mgrReq, mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it("allows admin when admin+ is required", () => {
    const middleware = authorize("admin");
    const next = jest.fn();
    const req = { user: authenticatedUser({ permissionLevel: "Administrator" }) };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it("allows superadmin for any role requirement", () => {
    const levels = ["technician", "manager", "admin", "superadmin"];

    for (const level of levels) {
      const middleware = authorize(level);
      const next = jest.fn();
      const req = { user: authenticatedUser({ permissionLevel: "SuperAdmin" }) };

      middleware(req, mockRes(), next);

      expect(next).toHaveBeenCalledWith();
    }
  });

  it("only allows superadmin when superadmin is required", () => {
    const middleware = authorize("superadmin");
    const next = jest.fn();

    const adminReq = { user: authenticatedUser({ permissionLevel: "Administrator" }) };
    middleware(adminReq, mockRes(), next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );

    next.mockClear();
    const superReq = { user: authenticatedUser({ permissionLevel: "SuperAdmin" }) };
    middleware(superReq, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 401 when req.user is not set", () => {
    const middleware = authorize("technician");
    const next = jest.fn();
    const req = {};

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: "AUTH_REQUIRED" })
    );
  });

  it("uses permissionLevel over role for rank check", () => {
    const middleware = authorize("admin");
    const next = jest.fn();
    const req = {
      user: authenticatedUser({
        role: "Technician",
        permissionLevel: "Administrator",
      }),
    };

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
