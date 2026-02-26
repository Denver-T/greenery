//commented out until fixed. 

/**
//  * Firebase Admin Initialization
//  * -----------------------------
//  * Initializes Firebase Admin SDK once using service account credentials
//  * provided via environment variables.
//  *
//  * Required env vars:
//  * - FIREBASE_PROJECT_ID
//  * - FIREBASE_CLIENT_EMAIL
//  * - FIREBASE_PRIVATE_KEY (single-line with literal \\n sequences)
//  */

// const admin = require("firebase-admin");


// const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
// for (const key of required) {
//   if (!process.env[key] || process.env[key].trim() === "") {
//     throw new Error(`Missing required environment variable: ${key}`);
//   }
// }

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: process.env.FIREBASE_PROJECT_ID,
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//       // Convert literal "\n" sequences into real newlines for PEM parsing
//       privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//     }),
//   });
// }

// module.exports = admin;

// apps/api/src/config/firebase.js
// Firebase is OPTIONAL in development until you enable it.
//
// If env vars are missing, we export { enabled:false } and the auth middleware
// should fall back to a dev mode (or no-auth mode).

function getEnv(key) {
  return process.env[key];
}

// Minimal set your app expects:
const requiredKeys = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

// If ANY required key is missing, treat firebase as disabled
const missing = requiredKeys.filter((k) => !getEnv(k));

const enabled = missing.length === 0;

module.exports = {
  enabled,
  projectId: getEnv("FIREBASE_PROJECT_ID") || null,
  clientEmail: getEnv("FIREBASE_CLIENT_EMAIL") || null,
  // Common gotcha: private key often needs newline fix when stored in env
  privateKey: (getEnv("FIREBASE_PRIVATE_KEY") || "").replace(/\\n/g, "\n") || null,
  missing,
};