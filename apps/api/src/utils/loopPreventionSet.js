// loopPreventionSet
//
// In-memory deduplication set for Monday ↔ Greenery bidirectional sync.
// Before Greenery pushes an outbound change to Monday, we compute the
// signature of the webhook Monday will fire as a result of that change and
// remember() it here. When Monday's echo arrives at our webhook handler,
// the handler computes the same signature from the inbound event and calls
// has() — if present, we silently skip processing and avoid the infinite
// loop (Greenery write → Monday push → Monday webhook → Greenery write ↻).
//
// Lazy pruning strategy (no background timer):
//   • TTL = 15 seconds (Monday typically delivers webhooks within 1-2s)
//   • Expired entries are removed on each has() call that touches them
//   • Size cap (MAX_ENTRIES) is enforced on remember() by pruning all
//     expired first, then evicting the oldest insertion-order entry if
//     still at cap
//
// This module is process-local by design. A multi-process API would need
// Redis or similar — acceptable tradeoff for the current single-process
// deployment and the 15s TTL window.

const crypto = require("crypto");

const TTL_MS = 15_000;
const MAX_ENTRIES = 10_000;

// Map<signature, expiryEpochMs>. JavaScript Map preserves insertion order,
// which we rely on for FIFO eviction under the size cap.
const store = new Map();

/**
 * Stable-stringify a value so equivalent objects with different key order
 * produce identical hashes. Handles primitives, nested objects, arrays,
 * null, and undefined. Throws on circular references (which Monday values
 * should never contain).
 */
function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify(value[k]))
      .join(",") +
    "}"
  );
}

/**
 * Hash a column value (object or primitive) into a short stable string.
 * Used as part of the signature so the same "value after update" from
 * both sides of the loop produces the same signature. 16 hex chars is
 * 64 bits — collision risk is negligible for a 15-second window.
 *
 * Normalizes `undefined` → `null` up front. `stableStringify(undefined)`
 * returns JS `undefined` (not the string "undefined"), which would then
 * crash `crypto.update()`. Every current call site pre-filters null, but
 * this guard means a future caller can't accidentally trigger that.
 */
function hashValue(value) {
  const normalized = value === undefined ? null : value;
  return crypto
    .createHash("sha256")
    .update(stableStringify(normalized))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Compute a stable signature from the identifying fields of a Monday
 * change event. Both the outbound write path and the inbound webhook
 * handler must compute this the same way from the same inputs, or the
 * echo detection silently fails open and we get loops.
 *
 * Inputs:
 *   itemId      — Monday's item id (number or numeric string)
 *   columnId    — the changed column's id (string, e.g. "status")
 *   value       — the new value of the column (whatever shape Monday uses)
 */
function computeSignature(itemId, columnId, value) {
  const normalizedItemId = String(itemId);
  const normalizedColumnId = String(columnId);
  const valuePart = hashValue(value);
  return `${normalizedItemId}:${normalizedColumnId}:${valuePart}`;
}

/**
 * Record that we expect to see an inbound webhook matching this
 * signature within TTL_MS milliseconds, and silently skip it when we do.
 *
 * Enforces MAX_ENTRIES by pruning expired entries first, then evicting
 * the oldest insertion-order entry if still at cap.
 */
function remember(signature) {
  const now = Date.now();

  if (store.size >= MAX_ENTRIES) {
    // Cheap path: drop everything that's already expired.
    for (const [key, expiry] of store) {
      if (expiry <= now) {
        store.delete(key);
      }
    }
    // Still full? Evict the oldest entry (insertion order).
    if (store.size >= MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      store.delete(oldestKey);
    }
  }

  store.set(signature, now + TTL_MS);
}

/**
 * Check whether a signature is present and not yet expired. Lazy-prunes
 * the entry if it has expired. Returns true on hit, false on miss.
 */
function has(signature) {
  const expiry = store.get(signature);
  if (expiry === undefined) {
    return false;
  }
  if (expiry <= Date.now()) {
    store.delete(signature);
    return false;
  }
  return true;
}

/** Test-only: current entry count. */
function size() {
  return store.size;
}

/** Test-only: wipe the set. */
function clear() {
  store.clear();
}

module.exports = {
  TTL_MS,
  MAX_ENTRIES,
  computeSignature,
  hashValue,
  stableStringify,
  remember,
  has,
  size,
  clear,
};
