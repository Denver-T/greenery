require("dotenv").config();

const env = require("./lib/env");
const app = require("./app");
const mondaySyncWorker = require("./workers/mondaySyncWorker");

/**
 * Server Bootstrap
 * ----------------
 * Responsible for:
 * - Loading environment variables (dotenv + Zod validation via lib/env)
 * - Starting the HTTP server
 * - Starting background workers (Monday sync)
 *
 * This file should NOT:
 * - Register middleware
 * - Mount routes
 * - Contain business logic
 *
 * All application configuration lives in app.js.
 */

// Keep the bootstrap minimal so app.js stays easy to test/import in isolation.
app.listen(env.PORT, () => {
  console.log(`Greenery API running at http://localhost:${env.PORT}`);
  mondaySyncWorker.start();
});
