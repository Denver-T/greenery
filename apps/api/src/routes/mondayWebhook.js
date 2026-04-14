// apps/api/src/routes/mondayWebhook.js
// Inbound webhook handler for Monday → Greenery sync (Phase 4.2).
//
// Path scheme:   POST /monday/webhook/:secret
// Auth:          URL-based secret, timing-safe compare against env.
//                 No JWT. Monday's GraphQL-registered webhooks arrive
//                 unauthenticated — see .agents/plans/monday-work-request-sync.md
//                 and apps/api/scripts/.monday-webhook-samples.json for the
//                 rationale and captured payload shapes.
// Flow:
//   1. If server has no configured secret → 404 (fail closed)
//   2. If the URL secret doesn't match → 404 (don't telegraph endpoint)
//   3. If the body contains a `challenge` field → 200 echo it back
//      (Monday's registration handshake — must succeed synchronously)
//   4. Otherwise, delegate to the event handler (Phase 4.3) and always
//      return 200, even if the handler throws — Monday retries non-2xx
//      with backoff which would duplicate events we've already processed
//
// Logging discipline:
//   - NEVER log req.path / req.originalUrl / req.params — contains the secret
//   - NEVER log the full body — notes field is PII
//   - Log only: event.type, normalized item id, handler errors

const express = require("express");
const crypto = require("crypto");
const env = require("../lib/env");
const mondayWebhookHandler = require("../services/mondayWebhookHandler");

/**
 * Create an Express router for Monday webhook delivery.
 *
 * Factory pattern so tests can inject their own secret and event handler
 * without monkey-patching the env module cache. Production mounts it with
 * the real env var from app.js.
 *
 * Options:
 *   secret:        the configured webhook secret (defaults to env)
 *   eventHandler:  async (event, req) => void (defaults to logging stub)
 */
function createMondayWebhookRouter({
  secret = env.MONDAY_WEBHOOK_SECRET,
  eventHandler = mondayWebhookHandler.handleEvent,
} = {}) {
  // Boot-time warning: in production, a missing secret means all webhooks
  // silently 404 and Monday retries forever with nothing visible to ops.
  // One warn at mount time makes the misconfiguration impossible to miss.
  if (!secret) {
    console.warn(
      "[monday-webhook] mounted with no configured secret — all requests will return 404",
    );
  }

  const router = express.Router();

  router.post("/webhook/:secret", async (req, res) => {
    // Fail closed when the server has no configured secret — same 404
    // response as a wrong secret so the endpoint's presence isn't leaked.
    if (!secret) {
      console.warn("[monday-webhook] auth failure: no configured secret");
      return res.status(404).end();
    }

    // Timing-safe comparison. crypto.timingSafeEqual requires equal-length
    // buffers; we pre-check length as a fast path, which is safe because
    // the expected length (64 hex chars) is public knowledge — the value
    // is the secret, not its length.
    const provided = Buffer.from(req.params.secret || "", "utf8");
    const expected = Buffer.from(secret, "utf8");
    if (
      provided.length !== expected.length ||
      !crypto.timingSafeEqual(provided, expected)
    ) {
      // Auth-failure log for ops visibility. Never logs the provided
      // secret or the URL path — only the fact of failure and the
      // (non-sensitive) Cloudflare-supplied source IP if present.
      const sourceIp =
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"] ||
        "unknown";
      console.warn(
        `[monday-webhook] auth failure: secret mismatch from=${sourceIp}`,
      );
      return res.status(404).end();
    }

    // Monday's registration probe. On create_webhook, Monday POSTs
    // { challenge: "random" } and requires 200 with the same value echoed
    // back before it marks the webhook active. This check MUST run before
    // event dispatch, since event handlers assume event.type exists.
    //
    // `!= null` (not `!== undefined`) so we don't accidentally echo a
    // bare null challenge — Monday never sends that, but tightening the
    // check costs nothing.
    if (req.body && req.body.challenge != null) {
      return res.status(200).json({ challenge: req.body.challenge });
    }

    // Real webhook event. Always return 200 after dispatch — Monday
    // interprets non-2xx as failed delivery and retries, which would
    // duplicate handler side-effects (DB updates, audit rows). We handle
    // errors internally by logging and swallowing.
    try {
      await eventHandler(req.body && req.body.event, req);
    } catch (err) {
      const event = (req.body && req.body.event) || {};
      const type = event.type || "unknown";
      const itemId = event.pulseId != null ? event.pulseId : event.itemId;
      console.error(
        `[monday-webhook] handler error type=${type} itemId=${itemId || "unknown"}: ${err.message}`,
      );
    }

    return res.status(200).json({ ok: true });
  });

  return router;
}

module.exports = createMondayWebhookRouter;
