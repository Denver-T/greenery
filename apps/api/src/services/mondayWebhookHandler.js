// apps/api/src/services/mondayWebhookHandler.js
// Phase 4.3 — inbound event handler for the Monday webhook route.
//
// Contract
// --------
// handleEvent(event) is called by mondayWebhook.js with the parsed
// `req.body.event` object. It is allowed to throw on infrastructure
// failures (DB errors, etc.) — the webhook route catches and logs them
// with sanitized context before returning 200. Defensive input handling
// (null checks, unknown type fallthrough) is enforced so that Monday's
// retry logic doesn't ping-pong on a user-caused bug.
//
// Dispatch table (keyed on runtime event.type string, NOT the registration
// enum — see samples file for the rename rationale):
//   update_column_value → handleUpdateColumnValue (column change inbound)
//   delete_pulse        → handleDeletePulse       (item deleted on Monday)
//   create_pulse        → handleCreatePulse       (ignored in v1)
//   <anything else>     → log + ignore
//
// Loop prevention
// ---------------
// Before applying ANY change to the DB, compute the signature from
// (itemId, columnId, value) and check loopPreventionSet.has(sig). If
// true, Greenery triggered this echo itself during an outbound push —
// silently skip to avoid the Greenery→Monday→Greenery update loop.
//
// The outbound side (Phase 4.4) will call loopPreventionSet.remember()
// with the matching signature right after a successful Monday API call.
//
// Direct DB path
// --------------
// Updates go through db.query() DIRECTLY — NOT through the reqs route
// or the reqs controller. Going through the normal write path would
// fire mondaySyncService.pushUpdate() again and create a loop even WITH
// loop prevention (because we'd be pushing a different triggerUuid).
// Direct SQL = one write, no echo.

const env = require("../lib/env");
const db = require("../db");
const loopPrevention = require("../utils/loopPreventionSet");
const { COLUMN_TO_FIELD } = require("../lib/mondayColumnValues");

// Whitelist used for the defense-in-depth guard on the dynamic SQL
// `SET <field> = ?` interpolation in handleUpdateColumnValue. COLUMN_TO_FIELD
// is a constant map built from FIELD_MAP at module load, so `field` is
// already safe TODAY — but a belt-and-suspenders check means a future
// refactor that makes COLUMN_TO_FIELD even partially user-derived can't
// introduce SQL injection without tripping this.
const SYNCED_FIELDS = new Set(Object.values(COLUMN_TO_FIELD));

/**
 * Top-level dispatcher. Always returns (never throws) — caller is the
 * webhook route and it already has its own try/catch safety net, but
 * keeping this defensive means bugs here don't accidentally take Monday's
 * retry machine offline.
 */
async function handleEvent(event /* , req */) {
  if (!event || typeof event !== "object") {
    console.warn("[monday-webhook] received event with no body — ignoring");
    return;
  }

  // Defense in depth: if a board_id is configured and the event is for
  // a different board, silently ignore. Single-board deployment means
  // this should never trigger in practice, but it protects against
  // mis-routed webhooks or a stolen secret being used against a different
  // board we happen to also own.
  if (
    env.MONDAY_BOARD_ID &&
    event.boardId != null &&
    String(event.boardId) !== String(env.MONDAY_BOARD_ID)
  ) {
    console.warn(
      `[monday-webhook] ignoring event for unexpected board ${event.boardId} (configured=${env.MONDAY_BOARD_ID})`,
    );
    return;
  }

  switch (event.type) {
    case "update_column_value":
      return handleUpdateColumnValue(event);
    case "delete_pulse":
      return handleDeletePulse(event);
    case "create_pulse":
      return handleCreatePulse(event);
    default: {
      const itemId = resolveItemId(event);
      console.log(
        `[monday-webhook] ignoring unsupported event type=${event.type || "unknown"} itemId=${itemId || "unknown"}`,
      );
      return;
    }
  }
}

/**
 * update_column_value — a column value changed on a Monday item.
 * Maps the Monday columnId back to a work_reqs field via COLUMN_TO_FIELD,
 * decodes the raw value into a scalar, checks loop prevention, and runs
 * a parameterized UPDATE if the column is one we care about.
 */
async function handleUpdateColumnValue(event) {
  const itemId = resolveItemId(event);
  const columnId = event.columnId;

  if (!itemId) {
    console.warn(
      "[monday-webhook] update_column_value missing itemId/pulseId — ignoring",
    );
    return;
  }
  if (!columnId) {
    console.warn(
      `[monday-webhook] update_column_value itemId=${itemId} missing columnId — ignoring`,
    );
    return;
  }

  // Is this a column we care about? Monday has a lot of columns on the
  // board we don't sync (native "status", "person", etc.).
  const field = COLUMN_TO_FIELD[columnId];
  if (!field) {
    console.log(
      `[monday-webhook] update_column_value itemId=${itemId} column=${columnId} — not a Greenery-owned column, ignoring`,
    );
    return;
  }

  // Decode the Monday-shape value into a scalar BEFORE computing the
  // signature — the outbound side in mondaySyncService computes the
  // signature from the canonical DB value, so both sides must hash the
  // same canonical form or echo detection silently fails.
  const decoded = decodeWebhookValue(event.value, event.columnType);

  const signature = loopPrevention.computeSignature(itemId, columnId, decoded);
  if (loopPrevention.has(signature)) {
    console.log(
      `[monday-webhook] update_column_value itemId=${itemId} column=${columnId} — skipping echo (loop prevention)`,
    );
    return;
  }

  // Defense-in-depth: verify `field` is in the whitelist before the
  // dynamic interpolation. COLUMN_TO_FIELD already guarantees this, but
  // the assertion protects against future refactors that weaken the
  // invariant.
  if (!SYNCED_FIELDS.has(field)) {
    console.warn(
      `[monday-webhook] rejected non-whitelisted field=${field} itemId=${itemId} — possible SQL injection attempt or map drift`,
    );
    return;
  }

  // Parameterized UPDATE filtered by monday_item_id. No separate lookup
  // — if the row doesn't exist the UPDATE matches zero rows and we log.
  // `field` is safe because SYNCED_FIELDS is a static whitelist.
  const [result] = await db.query(
    `UPDATE work_reqs SET ${field} = ?, updated_at = NOW() WHERE monday_item_id = ?`,
    [decoded, String(itemId)],
  );

  if (result.affectedRows === 0) {
    console.warn(
      `[monday-webhook] update_column_value itemId=${itemId} field=${field} — no matching work_req row (Phase 2 sync may have failed for this item)`,
    );
    return;
  }

  console.log(
    `[monday-webhook] applied update_column_value itemId=${itemId} field=${field}`,
  );
}

/**
 * delete_pulse — a Monday item was deleted. Hard-delete the matching
 * work_req (matching the existing DELETE /reqs/:id semantics). No
 * outbound echo needed — Monday already deleted it.
 */
async function handleDeletePulse(event) {
  const itemId = resolveItemId(event);

  if (!itemId) {
    console.warn(
      "[monday-webhook] delete_pulse missing itemId/pulseId — ignoring",
    );
    return;
  }

  // Loop prevention signature for deletes uses a sentinel columnId + null
  // value so the outbound side can compute the same hash after
  // mondayClient.deleteItem() succeeds.
  const signature = loopPrevention.computeSignature(
    itemId,
    "__delete__",
    null,
  );
  if (loopPrevention.has(signature)) {
    console.log(
      `[monday-webhook] delete_pulse itemId=${itemId} — skipping echo (loop prevention)`,
    );
    return;
  }

  const [result] = await db.query(
    `DELETE FROM work_reqs WHERE monday_item_id = ?`,
    [String(itemId)],
  );

  if (result.affectedRows === 0) {
    console.warn(
      `[monday-webhook] delete_pulse itemId=${itemId} — no matching work_req row (already deleted or never synced)`,
    );
    return;
  }

  console.log(`[monday-webhook] applied delete_pulse itemId=${itemId}`);
}

/**
 * create_pulse — someone created an item directly on Monday. v1 behavior
 * is to log and ignore. v2 would need to reverse-map the Monday columns
 * into a brand new work_req row, which has significant UX implications
 * (what tech? what account? the board doesn't enforce required fields
 * the way our form does) — deferred to a follow-up plan.
 */
async function handleCreatePulse(event) {
  const itemId = resolveItemId(event);
  console.log(
    `[monday-webhook] create_pulse itemId=${itemId || "unknown"} name="${event.pulseName || event.itemName || ""}" — ignored in v1`,
  );
}

/**
 * Extract the numeric item id from an event body, handling Monday's
 * field-name flip between event types (pulseId vs itemId — see samples).
 */
function resolveItemId(event) {
  if (event.pulseId != null) return event.pulseId;
  if (event.itemId != null) return event.itemId;
  return null;
}

/**
 * Decode a Monday webhook `event.value` into a scalar that matches the
 * work_reqs column type. Defensive — null-safe, unknown-type-safe,
 * accepts multiple shapes because Monday's webhook body format varies
 * across column types.
 *
 * Column types we care about (from .agents/monday-board-map.md):
 *   text, long_text, numbers, date
 *
 * Returns null for "clear the field".
 */
function decodeWebhookValue(value, columnType) {
  if (value === null || value === undefined) return null;

  switch (columnType) {
    case "text":
      // Short text: webhook body is { value: "the string" } in 2024-10.
      // Fall back to value.text for defensive compatibility.
      if (typeof value === "string") return value;
      if (value.value != null) return String(value.value);
      if (value.text != null) return String(value.text);
      return null;

    case "long_text":
      // Long text: body shape is { text: "..." }.
      if (typeof value === "string") return value;
      if (value.text != null) return String(value.text);
      if (value.value != null) return String(value.value);
      return null;

    case "numbers":
      // Numbers: Monday stores as strings in JSON.
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      }
      if (value.value != null) {
        const n = Number(value.value);
        return Number.isFinite(n) ? n : null;
      }
      return null;

    case "date": {
      // Date: body shape is { date: "YYYY-MM-DD", time: null | "HH:MM" }.
      if (typeof value === "string") return value.slice(0, 10);
      if (value.date) return String(value.date).slice(0, 10);
      return null;
    }

    default:
      // Unknown column type — log once (caller already logs the event)
      // and return null so the UPDATE clears the field. Safer than
      // writing arbitrary shapes as JSON strings into a VARCHAR column.
      console.warn(
        `[monday-webhook] decodeWebhookValue: unknown columnType=${columnType} — returning null`,
      );
      return null;
  }
}

module.exports = {
  handleEvent,
  handleUpdateColumnValue,
  handleDeletePulse,
  handleCreatePulse,
  decodeWebhookValue,
  resolveItemId,
};
