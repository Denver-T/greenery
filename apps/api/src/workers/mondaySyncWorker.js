const { drainQueue, isMondayConfigured } = require("../services/mondaySyncService");

const INTERVAL_MS = 30000; // 30 seconds

let draining = false;
let intervalId = null;

function start() {
  if (!isMondayConfigured()) {
    console.log("[monday-worker] Monday not configured — sync worker disabled");
    return;
  }

  console.log("[monday-worker] Starting sync worker (30s interval)");

  intervalId = setInterval(async () => {
    if (draining) return;
    draining = true;
    try {
      await drainQueue();
    } catch (err) {
      console.error("[monday-worker] drain failed:", err.message);
    } finally {
      draining = false;
    }
  }, INTERVAL_MS);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { start, stop };
