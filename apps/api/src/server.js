require("dotenv").config();

const app = require("./app");

/**
 * Server Bootstrap
 * ----------------
 * Responsible for:
 * - Loading environment variables
 * - Starting the HTTP server
 *
 * This file should NOT:
 * - Register middleware
 * - Mount routes
 * - Contain business logic
 *
 * All application configuration lives in app.js.
 */

const PORT = process.env.PORT || 3001;

app.listen(PORT, "192.168.137.1", () => {
  console.log(`Greenery API running at http://localhost:${PORT}`);
});
