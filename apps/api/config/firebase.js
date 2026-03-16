const admin = require("firebase-admin");

function getPrivateKey() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!rawKey) {
    throw new Error("Missing FIREBASE_PRIVATE_KEY environment variable");
  }

  return rawKey.replace(/\\n/g, "\n");
}

const required = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === "") {
    throw new Error(`Missing required Firebase environment variable: ${key}`);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: getPrivateKey(),
    }),
  });
}

module.exports = admin;