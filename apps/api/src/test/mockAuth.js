// Shared auth mock setup for supertest integration tests.
//
// authMiddleware calls:
//   1. admin.auth().verifyIdToken(token) → decoded Firebase token
//   2. employeesService.getEmployeeByEmail(email) → db.query SELECT
//
// This helper wires both mocks so requests with "Authorization: Bearer test-token"
// authenticate as the specified user.

const { employee, firebaseDecodedToken } = require("./factories");
const { selectResult } = require("./mockDb");

function setupAuth(db, firebaseAdmin, userOverrides = {}) {
  const emp = employee(userOverrides);
  const decoded = firebaseDecodedToken({ email: emp.email });

  firebaseAdmin.auth().verifyIdToken.mockResolvedValue(decoded);

  // The first db.query call from authMiddleware is getEmployeeByEmail.
  // Return the employee for that lookup. Subsequent calls use default mock.
  db.query.mockImplementation((sql) => {
    if (typeof sql === "string" && sql.includes("SELECT") && sql.includes("email")) {
      return Promise.resolve(selectResult([emp]));
    }
    // Default: return empty result for any other query (safe fallback)
    return Promise.resolve(selectResult([]));
  });

  return { employee: emp, decoded };
}

module.exports = { setupAuth };
