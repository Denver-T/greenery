const db = require("../db");

/**
 * Generates the next sequential reference number in WR-YYYY-NNNN format.
 * Uses MySQL's LAST_INSERT_ID(expr) idiom for atomic, race-free incrementing.
 *
 * CRITICAL: Both the upsert AND the SELECT LAST_INSERT_ID() must run on the
 * SAME connection. LAST_INSERT_ID() is session-local — running the SELECT on
 * a different pool connection returns stale/unrelated state. Acquire a
 * dedicated connection and release it in finally.
 */
async function nextReferenceNumber() {
  const year = new Date().getFullYear();
  const conn = await db.getConnection();
  try {
    // Atomic upsert: inserts year with seq=1 if missing, otherwise increments.
    // LAST_INSERT_ID(expr) stores the result in the connection's session state.
    await conn.query(
      `INSERT INTO work_req_sequences (year, next_seq) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE next_seq = LAST_INSERT_ID(next_seq + 1)`,
      [year],
    );

    // Retrieve the value set by LAST_INSERT_ID(expr) above — same connection.
    // On a fresh insert (first ref of the year), LAST_INSERT_ID returns 0
    // because the ON DUPLICATE KEY branch didn't fire. Handle that case.
    const [[row]] = await conn.query("SELECT LAST_INSERT_ID() AS seq");
    const seq = row.seq === 0 ? 1 : row.seq;

    return `WR-${year}-${String(seq).padStart(4, "0")}`;
  } finally {
    conn.release();
  }
}

module.exports = { nextReferenceNumber };
