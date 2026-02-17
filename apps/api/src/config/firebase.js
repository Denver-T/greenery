/**
 * Firebase Admin Initialization
 * -----------------------------
 * Initializes Firebase Admin SDK once using service account credentials
 * provided via environment variables.
 *
 * Required env vars:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (single-line with literal \\n sequences)
 */

const admin = require("firebase-admin");

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Convert literal "\n" sequences into real newlines for PEM parsing
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

module.exports = admin;