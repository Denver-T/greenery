// CORS_ORIGINS must be set BEFORE require("../app") so the module-level
// allowlist computation in app.js sees a deterministic value (independent of
// any ambient CORS_ORIGINS in the developer's shell or CI environment).
process.env.CORS_ORIGINS = "http://localhost:3000";

jest.mock("../../config/firebase", () => {
  const verifyIdToken = jest.fn();
  return { auth: () => ({ verifyIdToken }) };
});
jest.mock("../db");

const request = require("supertest");
const app = require("../app");

describe("helmet security headers", () => {
  it("sets x-frame-options on responses", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("sets x-content-type-options: nosniff on responses", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets strict-transport-security on responses", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["strict-transport-security"]).toBeDefined();
  });
});

describe("CORS allowlist", () => {
  it("allows requests from an allowed origin", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects requests from a disallowed origin with 403 CORS_ORIGIN_DENIED", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://evil.com");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORS_ORIGIN_DENIED");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows requests with no Origin header (curl / server-to-server)", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });

  it("rejects substring-match origins like http://localhost:3000.evil.com", async () => {
    // The allowlist uses exact string equality, not prefix or substring matching.
    // This guards against the classic attack: register evil.com and host
    // a subdomain that lexically begins with the allowed origin.
    const res = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:3000.evil.com");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORS_ORIGIN_DENIED");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("handles preflight OPTIONS from an allowed origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET");

    // cors() responds 204 to a successful preflight
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects preflight OPTIONS from a disallowed origin", async () => {
    const res = await request(app)
      .options("/health")
      .set("Origin", "http://evil.com")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CORS_ORIGIN_DENIED");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Swagger UI smoke", () => {
  it("serves /api-docs/ with the swagger-ui shell after the per-route CSP override", async () => {
    const res = await request(app).get("/api-docs/");

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger-ui/i);
  });

  it("does not set Content-Security-Policy on /api-docs (so inline scripts can run)", async () => {
    // The global helmet() at app.js sets a strict CSP including `script-src 'self'`
    // which blocks the inline scripts in swagger-ui-express's HTML shell.
    // The per-route `helmet({ contentSecurityPolicy: false })` override is NOT
    // sufficient on its own — it only prevents that middleware from setting a
    // CSP header, it does not remove one that was already set by the global helmet
    // earlier in the middleware chain. The fix is to also remove the existing
    // header in a small middleware before swaggerUi.serve.
    const res = await request(app).get("/api-docs/");

    expect(res.headers["content-security-policy"]).toBeUndefined();
  });
});
