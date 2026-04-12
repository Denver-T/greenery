#!/usr/bin/env node
/*
 * One-shot introspection for the target Monday.com board.
 *
 * Run from apps/api:
 *   node scripts/monday-introspect.js
 *
 * Outputs board columns + first 5 items so the Monday sync plan can
 * map Greenery work_reqs fields → Monday column IDs without guessing.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID;

if (!MONDAY_API_TOKEN || !MONDAY_BOARD_ID) {
  console.error("[monday-introspect] Missing env vars.");
  console.error(
    "  Expected MONDAY_API_TOKEN and MONDAY_BOARD_ID in apps/api/.env",
  );
  console.error(
    "  MONDAY_API_TOKEN set:",
    Boolean(MONDAY_API_TOKEN),
    " MONDAY_BOARD_ID set:",
    Boolean(MONDAY_BOARD_ID),
  );
  process.exit(1);
}

const boardId = String(MONDAY_BOARD_ID).trim();
if (!/^\d+$/.test(boardId)) {
  console.error(
    `[monday-introspect] MONDAY_BOARD_ID must be numeric, got: "${boardId}"`,
  );
  console.error(
    "  Copy the number from your board URL, e.g. monday.com/boards/1234567890",
  );
  process.exit(1);
}

const query = `
  query ($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      name
      description
      state
      board_kind
      columns {
        id
        title
        type
        description
        settings_str
      }
      groups {
        id
        title
        color
      }
      items_page(limit: 5) {
        items {
          id
          name
          state
          group {
            id
            title
          }
          column_values {
            id
            type
            text
            value
          }
        }
      }
    }
  }
`;

async function main() {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Version": "2024-10",
      Authorization: MONDAY_API_TOKEN,
    },
    body: JSON.stringify({ query, variables: { boardId } }),
  });

  const raw = await res.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.error(`[monday-introspect] Non-JSON response (HTTP ${res.status}):`);
    console.error(raw);
    process.exit(1);
  }

  if (!res.ok || payload.errors || payload.error_code) {
    console.error(`[monday-introspect] Monday API error (HTTP ${res.status}):`);
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const board = payload?.data?.boards?.[0];
  if (!board) {
    console.error(
      `[monday-introspect] No board returned for id ${boardId}. Check that the token has access to this board.`,
    );
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const summary = {
    board: {
      id: board.id,
      name: board.name,
      kind: board.board_kind,
      state: board.state,
      description: board.description,
    },
    groups: board.groups,
    columns: board.columns.map((c) => {
      let settings = null;
      try {
        settings = c.settings_str ? JSON.parse(c.settings_str) : null;
      } catch {
        settings = c.settings_str;
      }
      return {
        id: c.id,
        title: c.title,
        type: c.type,
        description: c.description,
        settings,
      };
    }),
    sample_items: (board.items_page?.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      state: item.state,
      group: item.group,
      column_values: item.column_values.map((cv) => {
        let parsedValue = null;
        try {
          parsedValue = cv.value ? JSON.parse(cv.value) : null;
        } catch {
          parsedValue = cv.value;
        }
        return {
          column_id: cv.id,
          type: cv.type,
          text: cv.text,
          value: parsedValue,
        };
      }),
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("[monday-introspect] Unexpected failure:");
  console.error(err);
  process.exit(1);
});
