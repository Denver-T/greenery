const errorHandler = require("./errorHandler");
const { httpError } = require("../utils/httpError");

const mockReq = () => ({});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe("errorHandler", () => {
  it("returns standardized error shape for httpError", () => {
    const err = httpError(400, "Bad input", "VALIDATION_ERROR");
    const res = mockRes();

    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: {
          code: "VALIDATION_ERROR",
          message: "Bad input",
          details: [],
        },
      })
    );
  });

  it("includes a timestamp in the response", () => {
    const err = httpError(400, "Bad input");
    const res = mockRes();

    errorHandler(err, mockReq(), res, mockNext);

    const body = res.json.mock.calls[0][0];
    expect(body.timestamp).toBeDefined();
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
  });

  it("defaults to 500 for errors without a valid statusCode", () => {
    const err = new Error("unexpected");
    const res = mockRes();

    jest.spyOn(console, "error").mockImplementation(() => {});
    errorHandler(err, mockReq(), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 503 for database connection errors", () => {
    const dbCodes = [
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
      "PROTOCOL_CONNECTION_LOST",
      "ER_ACCESS_DENIED_ERROR",
      "ER_BAD_DB_ERROR",
    ];

    for (const code of dbCodes) {
      const err = new Error("db error");
      err.code = code;
      const res = mockRes();

      jest.spyOn(console, "error").mockImplementation(() => {});
      errorHandler(err, mockReq(), res, mockNext);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "DATABASE_UNAVAILABLE",
          }),
        })
      );
    }
  });

  it("logs 5xx errors to console.error", () => {
    const err = new Error("server broke");
    const res = mockRes();
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(err, mockReq(), res, mockNext);

    expect(spy).toHaveBeenCalled();
  });

  it("does not expose stack traces in the response", () => {
    const err = new Error("server broke");
    const res = mockRes();

    jest.spyOn(console, "error").mockImplementation(() => {});
    errorHandler(err, mockReq(), res, mockNext);

    const body = res.json.mock.calls[0][0];
    expect(body.stack).toBeUndefined();
    expect(body.error.stack).toBeUndefined();
  });

  it("preserves details array from httpError", () => {
    const details = [{ field: "email", issue: "required" }];
    const err = httpError(400, "Bad input", "VALIDATION_ERROR", details);
    const res = mockRes();

    errorHandler(err, mockReq(), res, mockNext);

    const body = res.json.mock.calls[0][0];
    expect(body.error.details).toEqual(details);
  });

  it("defaults details to empty array when not provided", () => {
    const err = new Error("plain error");
    err.statusCode = 422;
    const res = mockRes();

    errorHandler(err, mockReq(), res, mockNext);

    const body = res.json.mock.calls[0][0];
    expect(body.error.details).toEqual([]);
  });
});
