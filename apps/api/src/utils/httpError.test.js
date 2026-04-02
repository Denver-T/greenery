const { httpError } = require("./httpError");

describe("httpError", () => {
  it("creates an Error with the given statusCode and message", () => {
    const err = httpError(400, "Bad input");

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Bad input");
  });

  it("defaults code to VALIDATION_ERROR", () => {
    const err = httpError(400, "Bad input");

    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("uses a custom code when provided", () => {
    const err = httpError(401, "No token", "AUTH_TOKEN_MISSING");

    expect(err.code).toBe("AUTH_TOKEN_MISSING");
  });

  it("defaults details to an empty array", () => {
    const err = httpError(400, "Bad input");

    expect(err.details).toEqual([]);
  });

  it("passes through array details as-is", () => {
    const details = [{ field: "email", issue: "required" }];
    const err = httpError(400, "Bad input", "VALIDATION_ERROR", details);

    expect(err.details).toEqual(details);
  });

  it("wraps non-array details in an array", () => {
    const detail = { field: "email", issue: "required" };
    const err = httpError(400, "Bad input", "VALIDATION_ERROR", detail);

    expect(err.details).toEqual([detail]);
  });

  it("sets isOperational to true", () => {
    const err = httpError(500, "Server error", "INTERNAL_SERVER_ERROR");

    expect(err.isOperational).toBe(true);
  });
});
