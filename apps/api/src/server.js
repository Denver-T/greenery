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

// Keep the bootstrap minimal so app.js stays easy to test/import in isolation.
app.listen(PORT, () => {
  console.log(`Greenery API running at http://localhost:${PORT}`);
});
