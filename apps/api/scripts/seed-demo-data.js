#!/usr/bin/env node
/*
 * Seeds realistic demo data (plants + work requests) for screenshots.
 * Writes a manifest of inserted IDs to .seed-demo-manifest.json so the
 * cleanup script can remove exactly what was seeded without touching real data.
 *
 * Run from apps/api:
 *   node scripts/seed-demo-data.js
 *
 * To clean up afterward:
 *   node scripts/clean-demo-data.js
 *
 * Safe to run multiple times — it won't re-insert if the manifest already exists.
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const MANIFEST_PATH = path.join(__dirname, ".seed-demo-manifest.json");

if (fs.existsSync(MANIFEST_PATH)) {
  console.error(
    `[seed-demo] Manifest already exists at ${MANIFEST_PATH}. Run clean-demo-data.js first to remove existing seed data.`,
  );
  process.exit(1);
}

const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[seed-demo] Missing ${key} in apps/api/.env`);
    process.exit(1);
  }
}

// Realistic indoor-plant maintenance inventory
const PLANTS = [
  { name: "Golden Pothos", location: "General stock", cost_per_unit: 18.5, quantity: 14 },
  { name: "Snake Plant (Laurentii)", location: "General stock", cost_per_unit: 24.0, quantity: 9 },
  { name: "ZZ Plant", location: "General stock", cost_per_unit: 32.0, quantity: 6 },
  { name: "Monstera Deliciosa", location: "Specialty", cost_per_unit: 45.0, quantity: 4 },
  { name: "Peace Lily", location: "General stock", cost_per_unit: 22.5, quantity: 12 },
  { name: "Bird of Paradise", location: "Specialty", cost_per_unit: 68.0, quantity: 3 },
  { name: "Dracaena Marginata", location: "General stock", cost_per_unit: 38.0, quantity: 7 },
  { name: "Aglaonema Silver Bay", location: "General stock", cost_per_unit: 28.0, quantity: 10 },
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Mix of statuses, dates, and accounts for a varied analytics dashboard
const WORK_REQS = [
  {
    requestDate: daysAgo(12),
    techName: "Jordan Reyes",
    account: "Inter Pipeline",
    accountContact: "Georgia Blevins",
    accountAddress: "215 9 Ave SW, Calgary, AB",
    actionRequired: "Replace failing Golden Pothos in lobby planter",
    numberOfPlants: 2,
    plantWanted: "Golden Pothos",
    plantReplaced: "Golden Pothos",
    plantSize: "3 Gal",
    plantHeight: "Shorter than 2 feet",
    planterTypeSize: "Lechuza 40",
    planterColour: "White",
    stagingMaterial: "Sphagnum moss",
    lighting: "Medium",
    method: "Remove failing specimens, transplant fresh stock, top dress with moss",
    location: "Main lobby",
    notes: "Client requested matching replacements; keep planter colour consistent",
    status: "completed",
  },
  {
    requestDate: daysAgo(3),
    techName: "Priya Chen",
    account: "Suncor Energy",
    accountContact: "Marcus Wong",
    accountAddress: "150 6 Ave SW, Calgary, AB",
    actionRequired: "Soil top up across executive suite plants",
    numberOfPlants: 5,
    plantSize: "2 Gal",
    plantHeight: "2 to 4 feet",
    planterTypeSize: "Mixed Lechuza",
    planterColour: "Charcoal",
    stagingMaterial: "Premium potting mix",
    lighting: "Low",
    method: "Clean debris, add 2in of fresh mix, water to field capacity",
    location: "Executive suite, 42nd floor",
    notes: "",
    status: "in_progress",
  },
  {
    requestDate: daysAgo(1),
    techName: "Sam Okafor",
    account: "Telus Convention Centre",
    accountContact: "Helena Tam",
    accountAddress: "136 8 Ave SE, Calgary, AB",
    actionRequired: "Install Peace Lily arrangement for reception desk",
    numberOfPlants: 3,
    plantWanted: "Peace Lily",
    plantSize: "3 Gal",
    plantHeight: "2 to 4 feet",
    planterTypeSize: "Fiberglass trough 30",
    planterColour: "White",
    stagingMaterial: "Grey Spanish moss",
    lighting: "Medium",
    method: "Staggered height arrangement, use drip tray to protect desk",
    location: "North reception",
    notes: "High visibility — prioritize presentation",
    status: "assigned",
  },
  {
    requestDate: daysAgo(18),
    techName: "Jordan Reyes",
    account: "Bow Valley College",
    accountContact: "Dmitri Lazar",
    accountAddress: "345 6 Ave SE, Calgary, AB",
    actionRequired: "Swap failing Snake Plant for ZZ Plant in atrium",
    numberOfPlants: 1,
    plantWanted: "ZZ Plant",
    plantReplaced: "Snake Plant (Laurentii)",
    plantSize: "5 Gal",
    plantHeight: "2 to 4 feet",
    planterTypeSize: "Ceramic 50",
    planterColour: "Matte black",
    stagingMaterial: "River stone top dress",
    lighting: "Low",
    method: "Remove old specimen, repot ZZ in same planter with fresh mix",
    location: "South atrium, level 2",
    notes: "Low light tolerant species requested",
    status: "completed",
  },
  {
    requestDate: daysAgo(22),
    techName: "Priya Chen",
    account: "City of Calgary Civic Centre",
    accountContact: "Robert Issa",
    accountAddress: "800 Macleod Trail SE, Calgary, AB",
    actionRequired: "Pest treatment — fungus gnats on Dracaena Marginata",
    numberOfPlants: 4,
    plantSize: "5 Gal",
    plantHeight: "4 to 6 feet",
    planterTypeSize: "Lechuza 50",
    planterColour: "Charcoal",
    stagingMaterial: "Gravel top dressing",
    lighting: "Medium",
    method: "Apply beneficial nematodes, let top 1in of soil dry between waterings",
    location: "Main atrium",
    notes: "Follow up in 2 weeks to confirm eradication",
    status: "completed",
  },
  {
    requestDate: daysAgo(0),
    techName: "Sam Okafor",
    account: "Inter Pipeline",
    accountContact: "Georgia Blevins",
    accountAddress: "215 9 Ave SW, Calgary, AB",
    actionRequired: "New install — Bird of Paradise for executive boardroom",
    numberOfPlants: 1,
    plantWanted: "Bird of Paradise",
    plantSize: "5 Gal",
    plantHeight: "Taller than 6 feet",
    planterTypeSize: "Custom oak box",
    planterColour: "Natural wood",
    stagingMaterial: "Premium mix",
    lighting: "High",
    method: "Statement piece — centre of room, rotate weekly for even growth",
    location: "52nd floor boardroom",
    notes: "Client approved $68 unit cost; delivery window Tuesday AM",
    status: "unassigned",
  },
  {
    requestDate: daysAgo(25),
    techName: "Jordan Reyes",
    account: "Suncor Energy",
    accountContact: "Marcus Wong",
    accountAddress: "150 6 Ave SW, Calgary, AB",
    actionRequired: "Remove dead Aglaonema Silver Bay (no replacement)",
    numberOfPlants: 1,
    plantReplaced: "Aglaonema Silver Bay",
    plantSize: "3 Gal",
    plantHeight: "Shorter than 2 feet",
    planterTypeSize: "Lechuza 30",
    planterColour: "White",
    stagingMaterial: "",
    lighting: "Low",
    method: "Client decided not to replace — dispose of specimen and remove planter",
    location: "Cafeteria",
    notes: "Account manager approved cancellation",
    status: "cancelled",
  },
  {
    requestDate: daysAgo(2),
    techName: "Priya Chen",
    account: "Telus Convention Centre",
    accountContact: "Helena Tam",
    accountAddress: "136 8 Ave SE, Calgary, AB",
    actionRequired: "Replace cracked planter, transfer existing Peace Lily",
    numberOfPlants: 1,
    plantSize: "3 Gal",
    plantHeight: "2 to 4 feet",
    planterTypeSize: "Lechuza 35",
    planterColour: "White",
    stagingMaterial: "Grey Spanish moss",
    lighting: "Medium",
    method: "Transplant existing specimen, match previous look, dispose of cracked planter",
    location: "East foyer",
    notes: "Planter cracked from a maintenance cart collision",
    status: "in_progress",
  },
  {
    requestDate: daysAgo(0),
    techName: "Sam Okafor",
    account: "Bow Valley College",
    accountContact: "Dmitri Lazar",
    accountAddress: "345 6 Ave SE, Calgary, AB",
    actionRequired: "Quarterly rotation, pruning, and fertilization",
    numberOfPlants: 8,
    plantSize: "Mixed",
    plantHeight: "Mixed",
    planterTypeSize: "Mixed existing planters",
    planterColour: "",
    stagingMaterial: "",
    lighting: "Medium",
    method: "Standard quarterly service — rotate, prune dead growth, slow-release fert",
    location: "All floors — walkthrough required",
    notes: "Scheduled visit for quarterly maintenance contract",
    status: "assigned",
  },
  {
    requestDate: daysAgo(7),
    techName: "Jordan Reyes",
    account: "City of Calgary Civic Centre",
    accountContact: "Robert Issa",
    accountAddress: "800 Macleod Trail SE, Calgary, AB",
    actionRequired: "Upgrade lobby centrepiece from Pothos to Monstera Deliciosa",
    numberOfPlants: 1,
    plantWanted: "Monstera Deliciosa",
    plantReplaced: "Golden Pothos",
    plantSize: "5 Gal",
    plantHeight: "4 to 6 feet",
    planterTypeSize: "Ceramic 60",
    planterColour: "Terracotta",
    stagingMaterial: "Lava rock top dress",
    lighting: "Medium",
    method: "Remove existing Pothos, install Monstera with support stake",
    location: "Main lobby centrepiece",
    notes: "Upgrade requested by facilities manager",
    status: "completed",
  },
];

function refNumber(index) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `WR-${today}-${String(index + 1).padStart(3, "0")}`;
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 4,
  });

  const manifest = { plants: [], work_reqs: [], created_at: new Date().toISOString() };

  try {
    console.log(`[seed-demo] Inserting ${PLANTS.length} plants...`);
    for (const p of PLANTS) {
      const [result] = await pool.execute(
        `INSERT INTO plants (name, location, cost_per_unit, quantity) VALUES (?, ?, ?, ?)`,
        [p.name, p.location, p.cost_per_unit, p.quantity],
      );
      manifest.plants.push({ id: result.insertId, name: p.name });
      console.log(`  [plant ok] ${p.name} (qty ${p.quantity}) → id ${result.insertId}`);
    }

    console.log("");
    console.log(`[seed-demo] Inserting ${WORK_REQS.length} work requests...`);
    for (let i = 0; i < WORK_REQS.length; i++) {
      const wr = WORK_REQS[i];
      const ref = refNumber(i);
      const [result] = await pool.execute(
        `INSERT INTO work_reqs (
          referenceNumber, requestDate, techName, account, accountContact, accountAddress,
          actionRequired, numberOfPlants, plantWanted, plantReplaced, plantSize, plantHeight,
          planterTypeSize, planterColour, stagingMaterial, lighting, method, location, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ref,
          wr.requestDate,
          wr.techName ?? null,
          wr.account,
          wr.accountContact ?? null,
          wr.accountAddress ?? null,
          wr.actionRequired,
          wr.numberOfPlants ?? null,
          wr.plantWanted ?? null,
          wr.plantReplaced ?? null,
          wr.plantSize ?? null,
          wr.plantHeight ?? null,
          wr.planterTypeSize ?? null,
          wr.planterColour ?? null,
          wr.stagingMaterial ?? null,
          wr.lighting ?? null,
          wr.method ?? null,
          wr.location ?? null,
          wr.notes ?? null,
          wr.status,
        ],
      );
      manifest.work_reqs.push({ id: result.insertId, ref, account: wr.account });
      console.log(`  [req ok]   ${ref} ${wr.account.padEnd(35)} ${wr.status.padEnd(12)} → id ${result.insertId}`);
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log("");
    console.log(`[seed-demo] Manifest written → ${MANIFEST_PATH}`);
    console.log(
      `[seed-demo] Seeded ${manifest.plants.length} plants + ${manifest.work_reqs.length} work requests.`,
    );
    console.log(
      `[seed-demo] Clean up with: node scripts/clean-demo-data.js`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed-demo] Failed:", err);
  process.exit(1);
});
