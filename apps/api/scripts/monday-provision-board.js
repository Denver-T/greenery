#!/usr/bin/env node
/*
 * Idempotently provisions the target Monday.com board to match Greenery's
 * work_reqs schema. Creates columns that don't exist, renames the default
 * "date4" and "file_mkpt19b7" columns to human-readable names, and
 * optionally deletes the default placeholder items.
 *
 * Safe to re-run. Dry-run by default — nothing is mutated until --apply.
 *
 * Run from apps/api:
 *   node scripts/monday-provision-board.js                   # dry run, prints plan
 *   node scripts/monday-provision-board.js --apply           # create + rename columns
 *   node scripts/monday-provision-board.js --apply --clean   # + delete "Item 1..5"
 *
 * Notes on column types: keeping everything as text/long_text/numbers/date for
 * v1. Dropdowns, people-column sync, file uploads, and proper status columns
 * are intentional follow-ups after the first end-to-end sync is working.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID;
const APPLY = process.argv.includes("--apply");
const CLEAN = process.argv.includes("--clean");

if (!MONDAY_API_TOKEN || !MONDAY_BOARD_ID) {
  console.error(
    "[monday-provision] Missing MONDAY_API_TOKEN or MONDAY_BOARD_ID in apps/api/.env",
  );
  process.exit(1);
}

const boardId = String(MONDAY_BOARD_ID).trim();
if (!/^\d+$/.test(boardId)) {
  console.error(
    `[monday-provision] MONDAY_BOARD_ID must be numeric, got: "${boardId}"`,
  );
  process.exit(1);
}

// Desired columns for Greenery work_reqs sync.
// field = the work_reqs DB column, title = what shows on the Monday board.
// Order is display order — the script creates them in this order.
const DESIRED_COLUMNS = [
  { field: "requestDate", title: "Request Date", type: "date", description: "When the work request was filed" },
  { field: "techName", title: "Tech Name", type: "text", description: "Technician who submitted the request" },
  { field: "account", title: "Account", type: "text", description: "Client or account name" },
  { field: "accountContact", title: "Account Contact", type: "text", description: "Contact person at the account" },
  { field: "accountAddress", title: "Account Address", type: "long_text", description: "Site address" },
  { field: "actionRequired", title: "Action Required", type: "long_text", description: "What needs to be done" },
  { field: "numberOfPlants", title: "Number of Plants", type: "numbers", description: "How many plants are involved" },
  { field: "plantWanted", title: "Plant Wanted", type: "text", description: "Replacement plant species" },
  { field: "plantReplaced", title: "Plant Replaced", type: "text", description: "Plant being swapped out" },
  { field: "plantSize", title: "Plant Size", type: "text", description: "Pot size (1 Gal, 2 Gal, 3 Gal, 5 Gal)" },
  { field: "plantHeight", title: "Plant Height", type: "text", description: "Plant height bucket" },
  { field: "planterTypeSize", title: "Planter Type & Size", type: "text", description: "Container description" },
  { field: "planterColour", title: "Planter Colour", type: "text", description: "Container color" },
  { field: "stagingMaterial", title: "Staging Material", type: "text", description: "Soil / staging materials" },
  { field: "lighting", title: "Lighting", type: "text", description: "Low / Medium / High" },
  { field: "method", title: "Method", type: "long_text", description: "Execution instructions" },
  { field: "location", title: "Location", type: "text", description: "Location within the site" },
  { field: "notes", title: "Notes", type: "long_text", description: "General notes" },
  { field: "greeneryStatus", title: "Greenery Status", type: "text", description: "Work request status (unassigned/assigned/in_progress/completed/cancelled)" },
];

const ALLOWED_TYPES = new Set(["text", "long_text", "numbers", "date"]);
for (const col of DESIRED_COLUMNS) {
  if (!ALLOWED_TYPES.has(col.type)) {
    console.error(
      `[monday-provision] Internal: unsupported column type "${col.type}" for "${col.title}"`,
    );
    process.exit(1);
  }
}

// Existing default columns we want to rename.
const RENAMES = [
  { currentId: "date4", newTitle: "Due Date" },
  { currentId: "file_mkpt19b7", newTitle: "Photo" },
];

async function monday(query, variables = {}) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Version": "2024-10",
      Authorization: MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const raw = await res.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error(`Non-JSON response (HTTP ${res.status}): ${raw.slice(0, 200)}`);
  }
  if (!res.ok || body.errors || body.error_code) {
    throw new Error(`Monday API error (HTTP ${res.status}): ${JSON.stringify(body)}`);
  }
  return body.data;
}

async function getBoardState() {
  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        columns { id title type }
        items_page(limit: 50) {
          items { id name }
        }
      }
    }
  `;
  const data = await monday(query, { boardId });
  if (!data.boards || !data.boards[0]) {
    throw new Error(`No board returned for id ${boardId}`);
  }
  return data.boards[0];
}

async function createColumn({ title, type, description }) {
  // column_type is a GraphQL enum — inline it rather than passing as a variable
  // for maximum compatibility. Value is whitelisted above.
  const query = `
    mutation ($boardId: ID!, $title: String!, $description: String) {
      create_column(
        board_id: $boardId,
        title: $title,
        column_type: ${type},
        description: $description
      ) {
        id
        title
        type
      }
    }
  `;
  const data = await monday(query, { boardId, title, description: description ?? "" });
  return data.create_column;
}

async function renameColumn(columnId, newTitle) {
  const query = `
    mutation ($boardId: ID!, $columnId: String!, $title: String!) {
      change_column_title(
        board_id: $boardId,
        column_id: $columnId,
        title: $title
      ) {
        id
        title
      }
    }
  `;
  const data = await monday(query, { boardId, columnId, title: newTitle });
  return data.change_column_title;
}

async function deleteItem(itemId) {
  const query = `
    mutation ($itemId: ID!) {
      delete_item(item_id: $itemId) {
        id
      }
    }
  `;
  return monday(query, { itemId });
}

function normalize(title) {
  return String(title).trim().toLowerCase();
}

async function main() {
  console.log(
    `[monday-provision] Mode: ${APPLY ? "APPLY" : "DRY RUN"}${CLEAN ? " +CLEAN" : ""}`,
  );
  console.log(`[monday-provision] Board ID: ${boardId}`);

  const board = await getBoardState();
  console.log(
    `[monday-provision] Board "${board.name}" has ${board.columns.length} columns and ${board.items_page.items.length} items`,
  );

  const existingTitles = new Set(board.columns.map((c) => normalize(c.title)));
  const existingById = new Map(board.columns.map((c) => [c.id, c]));

  // Plan renames
  const plannedRenames = [];
  for (const rename of RENAMES) {
    const col = existingById.get(rename.currentId);
    if (!col) {
      console.log(`  [skip rename] column id ${rename.currentId} not on this board`);
      continue;
    }
    if (normalize(col.title) === normalize(rename.newTitle)) {
      console.log(`  [skip rename] "${col.title}" already named correctly`);
      continue;
    }
    plannedRenames.push({ ...rename, from: col.title });
  }

  // Plan creates
  const plannedCreates = [];
  for (const desired of DESIRED_COLUMNS) {
    if (existingTitles.has(normalize(desired.title))) {
      console.log(`  [skip create] "${desired.title}" already exists`);
      continue;
    }
    plannedCreates.push(desired);
  }

  // Plan item deletes
  const plannedDeletes = [];
  if (CLEAN) {
    for (const item of board.items_page.items) {
      if (/^Item\s*\d+$/i.test(item.name.trim())) {
        plannedDeletes.push(item);
      }
    }
  }

  console.log("");
  console.log("[monday-provision] Plan:");
  console.log(`  Rename ${plannedRenames.length} column(s)`);
  for (const r of plannedRenames) {
    console.log(`    - "${r.from}" → "${r.newTitle}"`);
  }
  console.log(`  Create ${plannedCreates.length} column(s)`);
  for (const c of plannedCreates) {
    console.log(`    - "${c.title}" (${c.type})`);
  }
  if (CLEAN) {
    console.log(`  Delete ${plannedDeletes.length} default item(s)`);
    for (const d of plannedDeletes) {
      console.log(`    - "${d.name}" (id ${d.id})`);
    }
  }
  console.log("");

  if (!APPLY) {
    console.log(
      "[monday-provision] Dry run complete. Re-run with --apply to execute.",
    );
    if (!CLEAN) {
      console.log(
        "[monday-provision] To also delete default Item 1..5 rows, add --clean to the --apply run.",
      );
    }
    return;
  }

  // Execute renames
  for (const r of plannedRenames) {
    try {
      await renameColumn(r.currentId, r.newTitle);
      console.log(`  [rename ok] "${r.from}" → "${r.newTitle}"`);
    } catch (err) {
      console.error(`  [rename fail] "${r.from}" → "${r.newTitle}": ${err.message}`);
    }
  }

  // Execute creates with small delay between calls to avoid rate limits
  for (const c of plannedCreates) {
    try {
      const created = await createColumn(c);
      console.log(`  [create ok] "${c.title}" (${c.type}) → id ${created.id}`);
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`  [create fail] "${c.title}": ${err.message}`);
    }
  }

  // Execute deletes
  for (const d of plannedDeletes) {
    try {
      await deleteItem(d.id);
      console.log(`  [delete ok] "${d.name}"`);
    } catch (err) {
      console.error(`  [delete fail] "${d.name}": ${err.message}`);
    }
  }

  // Print final column map
  console.log("");
  console.log("[monday-provision] Re-fetching final board state...");
  const finalBoard = await getBoardState();
  console.log(
    `[monday-provision] Final columns (${finalBoard.columns.length}):`,
  );
  console.log("");
  console.log("  column_id                 title                         type");
  console.log("  ------------------------  ----------------------------  ----------");
  for (const col of finalBoard.columns) {
    console.log(
      `  ${col.id.padEnd(26)}${col.title.padEnd(30)}${col.type}`,
    );
  }
  console.log("");
  console.log(
    "[monday-provision] Done. Save this column map — the sync code needs it.",
  );
}

main().catch((err) => {
  console.error("[monday-provision] Unexpected failure:");
  console.error(err);
  process.exit(1);
});
