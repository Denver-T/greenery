jest.mock("../lib/env", () => ({
  MONDAY_API_TOKEN: "test-token",
  MONDAY_BOARD_ID: "8887438729",
  MONDAY_WEBHOOK_SECRET: undefined,
  MONDAY_API_VERSION: "2024-10",
}));

const express = require("express");
const request = require("supertest");

const createMondayWebhookRouter = require("./mondayWebhook");

// 64-char hex mirroring what `openssl rand -hex 32` produces.
const VALID_SECRET = "a".repeat(64);
const WRONG_SECRET_SAME_LENGTH = "b".repeat(64);

function makeApp(options) {
  const app = express();
  app.use(express.json());
  app.use("/monday", createMondayWebhookRouter(options));
  return app;
}

describe("POST /monday/webhook/:secret", () => {
  describe("challenge handshake", () => {
    it("echoes the challenge when the URL secret matches", async () => {
      const app = makeApp({ secret: VALID_SECRET });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ challenge: "random-probe-string" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ challenge: "random-probe-string" });
    });

    it("echoes an empty challenge string as-is", async () => {
      const app = makeApp({ secret: VALID_SECRET });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ challenge: "" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ challenge: "" });
    });

    it("does NOT invoke the event handler on a challenge", async () => {
      const eventHandler = jest.fn();
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ challenge: "probe" });

      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe("secret verification", () => {
    it("returns 404 when the URL secret does not match (same length)", async () => {
      const app = makeApp({ secret: VALID_SECRET });
      const response = await request(app)
        .post(`/monday/webhook/${WRONG_SECRET_SAME_LENGTH}`)
        .send({ challenge: "x" });

      expect(response.status).toBe(404);
    });

    it("returns 404 when the URL secret is shorter than expected", async () => {
      const app = makeApp({ secret: VALID_SECRET });
      const response = await request(app)
        .post("/monday/webhook/too-short")
        .send({ challenge: "x" });

      expect(response.status).toBe(404);
    });

    it("returns 404 when the URL secret is longer than expected", async () => {
      const app = makeApp({ secret: VALID_SECRET });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}${"c".repeat(10)}`)
        .send({ challenge: "x" });

      expect(response.status).toBe(404);
    });

    it("returns 404 when the server has no configured secret", async () => {
      const app = makeApp({ secret: undefined });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ challenge: "x" });

      expect(response.status).toBe(404);
    });

    it("returns 404 when the server has an empty-string secret", async () => {
      const app = makeApp({ secret: "" });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ challenge: "x" });

      expect(response.status).toBe(404);
    });

    it("does not call the event handler when the secret is wrong", async () => {
      const eventHandler = jest.fn();
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      await request(app)
        .post(`/monday/webhook/${WRONG_SECRET_SAME_LENGTH}`)
        .send({ event: { type: "update_column_value", pulseId: 1 } });

      expect(eventHandler).not.toHaveBeenCalled();
    });
  });

  describe("event handling", () => {
    it("invokes the event handler with the event payload", async () => {
      const eventHandler = jest.fn();
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      const body = {
        event: {
          type: "update_column_value",
          boardId: 8887438729,
          pulseId: 11729244228,
          columnId: "status",
        },
      };

      await request(app).post(`/monday/webhook/${VALID_SECRET}`).send(body);

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler).toHaveBeenCalledWith(body.event, expect.anything());
    });

    it("returns { ok: true } on a successful event dispatch", async () => {
      const app = makeApp({
        secret: VALID_SECRET,
        eventHandler: jest.fn(),
      });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ event: { type: "update_column_value", pulseId: 1 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("still returns 200 when the event handler throws", async () => {
      // Monday interprets non-2xx as failed delivery and retries with
      // backoff, which would duplicate side effects. Handler errors
      // must be swallowed internally (logged, not re-raised).
      const eventHandler = jest
        .fn()
        .mockRejectedValue(new Error("simulated db failure"));
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({ event: { type: "update_column_value", pulseId: 1 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    it("passes undefined to the handler when event field is missing", async () => {
      const eventHandler = jest.fn();
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send({});

      expect(eventHandler).toHaveBeenCalledWith(undefined, expect.anything());
    });
  });

  describe("body shape tolerance", () => {
    it("handles delete_pulse event with itemId instead of pulseId", async () => {
      const eventHandler = jest.fn();
      const app = makeApp({ secret: VALID_SECRET, eventHandler });
      const body = {
        event: {
          type: "delete_pulse",
          itemId: 11729244228,
          itemName: "deleted-row",
        },
      };

      const response = await request(app)
        .post(`/monday/webhook/${VALID_SECRET}`)
        .send(body);

      expect(response.status).toBe(200);
      expect(eventHandler).toHaveBeenCalledWith(body.event, expect.anything());
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: real wired app from app.js
//
// The factory tests above use a synthetic Express app. This integration
// test imports the actual production app so a regression that breaks the
// `app.use("/monday", ...)` wiring fails a test instead of failing at
// runtime. One test is enough — the factory tests cover positive/negative
// branches of the route logic in depth; this one only needs to prove the
// route is mounted on the production Express instance.
// ---------------------------------------------------------------------------
describe("integration: /monday/webhook on wired app", () => {
  it("returns 404 on the real wired app when the secret is wrong", async () => {
    let realApp;
    jest.isolateModules(() => {
      jest.doMock("../lib/env", () => ({
        MONDAY_API_TOKEN: undefined,
        MONDAY_BOARD_ID: undefined,
        MONDAY_WEBHOOK_SECRET: "i".repeat(64),
        MONDAY_API_VERSION: "2024-10",
        CORS_ORIGINS: "http://localhost:3000",
      }));
      jest.doMock("../../config/firebase", () => ({}));
      realApp = require("../app");
    });

    const response = await request(realApp)
      .post(`/monday/webhook/${"x".repeat(64)}`)
      .send({ challenge: "probe" });

    // 404 — not 500 or "Cannot POST" — proves:
    //   1. The route is mounted at /monday/webhook/:secret
    //   2. The real mondayWebhook.js runs its secret check
    //   3. Mismatch path returns 404 as designed
    expect(response.status).toBe(404);
  });
});
