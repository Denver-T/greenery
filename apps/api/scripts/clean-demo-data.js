#!/usr/bin/env node
/*
 * Removes exactly the plants + work requests created by seed-demo-data.js.
 * Reads .seed-demo-manifest.json to know which IDs to delete — will never
 * touch rows it didn't seed itself.
 *
 * Run from apps/api:
 *   node scripts/clean-demo-data.js
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const MANIFEST_PATH = path.join(__dirname, ".seed-demo-manifest.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(
    `[clean-demo] No manifest found at ${MANIFEST_PATH}. Nothing to clean.`,
  );
  process.exit(0);
}

const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[clean-demo] Missing ${key} in apps/api/.env`);
    process.exit(1);
  }
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const workReqIds = manifest.work_reqs.map((r) => r.id);
  const plantIds = manifest.plants.map((p) => p.id);

  console.log(
    `[clean-demo] Manifest contains ${workReqIds.length} work requests + ${plantIds.length} plants`,
  );

  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 4,
  });

  try {
    // Delete work requests first — they might FK to other things, do them before plants
    if (workReqIds.length > 0) {
      const placeholders = workReqIds.map(() => "?").join(",");
      const [result] = await pool.execute(
        `DELETE FROM work_reqs WHERE id IN (${placeholders})`,
        workReqIds,
      );
      console.log(`  [work_reqs] deleted ${result.affectedRows} row(s)`);
    }

    if (plantIds.length > 0) {
      const placeholders = plantIds.map(() => "?").join(",");
      const [result] = await pool.execute(
        `DELETE FROM plants WHERE id IN (${placeholders})`,
        plantIds,
      );
      console.log(`  [plants]    deleted ${result.affectedRows} row(s)`);
    }

    fs.unlinkSync(MANIFEST_PATH);
    console.log("");
    console.log(`[clean-demo] Manifest removed → ${MANIFEST_PATH}`);
    console.log("[clean-demo] Database is back to pre-seed state.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[clean-demo] Failed:", err);
  process.exit(1);
});
