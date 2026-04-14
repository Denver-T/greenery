#!/usr/bin/env node
// One-shot seed for the Monday inbound-webhook smoke test.
//
// Inserts a throwaway work_req, calls mondaySyncService.pushCreate to
// mirror it onto the Monday board, then prints the row id + monday_item_id
// so the smoke test driver knows which item to edit / delete in the Monday
// UI. Safe to run multiple times — each run creates a new row and a new
// Monday item with a fresh sequenced referenceNumber.
//
// Usage:  node scripts/monday-smoke-seed.js
//
// Cleanup: after the smoke test, the delete-pulse round-trip will remove
// the row automatically. Otherwise:
//   node -e "require('dotenv').config({quiet:true});const db=require('./src/db');db.query('DELETE FROM work_reqs WHERE account=\\'SMOKE TEST\\'').then(()=>db.end())"

require("dotenv").config({ quiet: true });

const db = require("../src/db");
const mondaySync = require("../src/services/mondaySyncService");
const { nextReferenceNumber } = require("../src/services/reqSequenceService");

(async () => {
  const referenceNumber = await nextReferenceNumber();
  const today = new Date().toISOString().slice(0, 10);

  const row = {
    referenceNumber,
    requestDate: today,
    techName: "Smoke Test Bot",
    account: "SMOKE TEST",
    accountContact: "do-not-contact",
    accountAddress: "127.0.0.1",
    actionRequired: "replace_plant",
    numberOfPlants: 1,
    plantWanted: "Monstera",
    plantReplaced: "Pothos",
    plantSize: "medium",
    plantHeight: "short",
    planterTypeSize: "8in ceramic",
    planterColour: "white",
    stagingMaterial: "pebbles",
    lighting: "low",
    method: "manual",
    location: "lobby",
    notes: "Smoke test row — webhook round-trip verification.",
    status: "unassigned",
    dueDate: today,
  };

  const [result] = await db.query(
    `INSERT INTO work_reqs
      (referenceNumber, requestDate, techName, account, accountContact, accountAddress,
       actionRequired, numberOfPlants, plantWanted, plantReplaced, plantSize, plantHeight,
       planterTypeSize, planterColour, stagingMaterial, lighting, method, location, notes,
       status, dueDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.referenceNumber, row.requestDate, row.techName, row.account,
      row.accountContact, row.accountAddress, row.actionRequired,
      row.numberOfPlants, row.plantWanted, row.plantReplaced, row.plantSize,
      row.plantHeight, row.planterTypeSize, row.planterColour,
      row.stagingMaterial, row.lighting, row.method, row.location, row.notes,
      row.status, row.dueDate,
    ],
  );

  row.id = result.insertId;

  console.log(`[seed] inserted work_req id=${row.id} ref=${row.referenceNumber}`);
  console.log(`[seed] calling mondaySync.pushCreate...`);

  await mondaySync.pushCreate(row);

  const [[check]] = await db.query(
    `SELECT id, referenceNumber, monday_item_id, monday_synced_at FROM work_reqs WHERE id = ?`,
    [row.id],
  );

  console.log("");
  console.log("=== smoke seed result ===");
  console.table([check]);

  if (!check.monday_item_id) {
    console.error("[seed] FAIL — pushCreate did not populate monday_item_id. Check API logs for pushCreate error.");
    process.exitCode = 1;
  } else {
    console.log("");
    console.log(`✓ Monday item created. Edit item id=${check.monday_item_id} on the board to trigger the inbound webhook.`);
  }

  await db.getPool().end();
})().catch((err) => {
  console.error("[seed] crashed:", err);
  process.exit(1);
});
