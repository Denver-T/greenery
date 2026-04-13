const db = require("../db");
const env = require("../lib/env");
const mondayClient = require("../lib/mondayClient");
const {
  toMondayColumnValues,
  toSignatureValue,
  FIELD_MAP,
} = require("../lib/mondayColumnValues");
const loopPrevention = require("../utils/loopPreventionSet");

// Sentinel columnId for delete signatures. Matches what the inbound
// handler uses in handleDeletePulse so the two sides compute the same hash.
const DELETE_SENTINEL_COLUMN = "__delete__";

/**
 * After a successful Monday push, remember the resulting webhook
 * signatures so the inbound handler can silently skip the echoes.
 *
 * For create/update: one signature per non-null field we pushed, keyed
 * on the field's Monday columnId and its canonical scalar value.
 * For delete: one signature keyed on the sentinel columnId and null.
 *
 * Called AFTER the Monday API call succeeds — never before, so a failed
 * push doesn't poison the set with signatures for changes that never
 * actually reached Monday.
 */
function rememberOutboundColumnSignatures(mondayItemId, workReq) {
  if (!mondayItemId) return;

  for (const [field, { columnId }] of Object.entries(FIELD_MAP)) {
    const value = toSignatureValue(field, workReq[field]);
    if (value === null) continue;
    const signature = loopPrevention.computeSignature(
      mondayItemId,
      columnId,
      value,
    );
    loopPrevention.remember(signature);
  }
}

function rememberOutboundDeleteSignature(mondayItemId) {
  if (!mondayItemId) return;
  const signature = loopPrevention.computeSignature(
    mondayItemId,
    DELETE_SENTINEL_COLUMN,
    null,
  );
  loopPrevention.remember(signature);
}

const BOARD_ID = env.MONDAY_BOARD_ID;
const MAX_ATTEMPTS = 10;

// Backoff schedule in seconds: 30s, 2min, 10min, 1hr, 1hr, ...
const BACKOFF = [30, 120, 600, 3600];

function backoffSeconds(attempts) {
  return BACKOFF[Math.min(attempts, BACKOFF.length - 1)];
}

function isMondayConfigured() {
  return Boolean(env.MONDAY_API_TOKEN && BOARD_ID);
}

/**
 * Push a newly created work request to Monday.
 * On success: stores monday_item_id + monday_synced_at on the row.
 * On failure: enqueues for retry.
 */
async function pushCreate(workReq) {
  if (!isMondayConfigured()) return;

  try {
    const columnValues = toMondayColumnValues(workReq);
    const itemId = await mondayClient.createItem(
      BOARD_ID,
      workReq.referenceNumber,
      columnValues,
    );

    // `remember` must run AFTER createItem succeeds so we never populate
    // the set with signatures for changes that didn't actually reach Monday.
    // Do NOT move this earlier even though in theory Monday could fire a
    // column webhook before createItem's HTTPS response arrives — in practice
    // (a) Monday fires `create_pulse` on new items, not `change_column_value`,
    // so this race does not apply to the create path, and (b) webhook delivery
    // latency exceeds the local `await` resolution by orders of magnitude.
    // Moving the remember earlier would create orphan signatures on failure.
    rememberOutboundColumnSignatures(itemId, workReq);

    await db.query(
      `UPDATE work_reqs SET monday_item_id = ?, monday_synced_at = NOW() WHERE id = ?`,
      [itemId, workReq.id],
    );
  } catch (err) {
    console.error("[monday-sync] pushCreate failed:", err.message);
    await enqueue("create", workReq.id, workReq);
  }
}

/**
 * Push an updated work request to Monday.
 */
async function pushUpdate(workReq) {
  if (!isMondayConfigured()) return;
  if (!workReq.monday_item_id) return;

  try {
    const columnValues = toMondayColumnValues(workReq);
    await mondayClient.updateItem(
      BOARD_ID,
      workReq.monday_item_id,
      columnValues,
    );

    rememberOutboundColumnSignatures(workReq.monday_item_id, workReq);

    await db.query(
      `UPDATE work_reqs SET monday_synced_at = NOW() WHERE id = ?`,
      [workReq.id],
    );
  } catch (err) {
    console.error("[monday-sync] pushUpdate failed:", err.message);
    await enqueue("update", workReq.id, workReq);
  }
}

/**
 * Push a deletion to Monday.
 */
async function pushDelete(workReq) {
  if (!isMondayConfigured()) return;
  if (!workReq.monday_item_id) return;

  try {
    await mondayClient.deleteItem(workReq.monday_item_id);
    rememberOutboundDeleteSignature(workReq.monday_item_id);
  } catch (err) {
    console.error("[monday-sync] pushDelete failed:", err.message);
    await enqueue("delete", workReq.id, {
      monday_item_id: workReq.monday_item_id,
    });
  }
}

/**
 * Add a failed sync operation to the retry queue.
 */
async function enqueue(operation, workReqId, payload) {
  await db.query(
    `INSERT INTO monday_sync_queue (work_req_id, operation, payload, next_attempt_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
    [workReqId, operation, JSON.stringify(payload), BACKOFF[0]],
  );
}

/**
 * Process pending items in the retry queue.
 * Called by the worker on a 30s interval.
 */
async function drainQueue() {
  const [rows] = await db.query(
    `SELECT id, work_req_id, operation, payload, attempts
     FROM monday_sync_queue
     WHERE next_attempt_at <= NOW() AND attempts < ?
     ORDER BY next_attempt_at ASC
     LIMIT 20`,
    [MAX_ATTEMPTS],
  );

  for (const row of rows) {
    const payload =
      typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

    try {
      switch (row.operation) {
        case "create": {
          const columnValues = toMondayColumnValues(payload);
          const itemId = await mondayClient.createItem(
            BOARD_ID,
            payload.referenceNumber,
            columnValues,
          );
          rememberOutboundColumnSignatures(itemId, payload);
          if (row.work_req_id) {
            await db.query(
              `UPDATE work_reqs SET monday_item_id = ?, monday_synced_at = NOW() WHERE id = ?`,
              [itemId, row.work_req_id],
            );
          }
          break;
        }
        case "update": {
          if (payload.monday_item_id) {
            const columnValues = toMondayColumnValues(payload);
            await mondayClient.updateItem(
              BOARD_ID,
              payload.monday_item_id,
              columnValues,
            );
            rememberOutboundColumnSignatures(payload.monday_item_id, payload);
            if (row.work_req_id) {
              await db.query(
                `UPDATE work_reqs SET monday_synced_at = NOW() WHERE id = ?`,
                [row.work_req_id],
              );
            }
          }
          break;
        }
        case "delete": {
          if (payload.monday_item_id) {
            await mondayClient.deleteItem(payload.monday_item_id);
            rememberOutboundDeleteSignature(payload.monday_item_id);
          }
          break;
        }
      }

      // Success — remove from queue
      await db.query(`DELETE FROM monday_sync_queue WHERE id = ?`, [row.id]);
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      const delaySec = backoffSeconds(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        console.error(
          `[monday-sync] queue item ${row.id} dead after ${MAX_ATTEMPTS} attempts:`,
          err.message,
        );
      }

      await db.query(
        `UPDATE monday_sync_queue
         SET attempts = ?, last_error = ?, next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND), updated_at = NOW()
         WHERE id = ?`,
        [nextAttempts, err.message, delaySec, row.id],
      );
    }
  }
}

module.exports = {
  pushCreate,
  pushUpdate,
  pushDelete,
  enqueue,
  drainQueue,
  isMondayConfigured,
};
