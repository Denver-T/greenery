const env = require("./env");

const MONDAY_API_URL = "https://api.monday.com/v2";

/**
 * Low-level Monday.com GraphQL client.
 * All Monday API interactions go through this module.
 */

async function call(query, variables = {}) {
  if (!env.MONDAY_API_TOKEN) {
    throw new Error("[monday-client] MONDAY_API_TOKEN not configured");
  }

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: env.MONDAY_API_TOKEN,
      "API-Version": env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await res.json();

  if (!res.ok || payload.errors || payload.error_code) {
    const msg = payload.errors?.[0]?.message || payload.error_message || `HTTP ${res.status}`;
    const err = new Error(`[monday-client] ${msg}`);
    err.status = res.status;
    err.mondayErrors = payload.errors;
    throw err;
  }

  return payload.data;
}

async function createItem(boardId, name, columnValues) {
  const data = await call(
    `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }`,
    {
      boardId: String(boardId),
      itemName: name,
      columnValues: JSON.stringify(columnValues),
    },
  );
  return data.create_item.id;
}

async function updateItem(boardId, itemId, columnValues) {
  await call(
    `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
        id
      }
    }`,
    {
      boardId: String(boardId),
      itemId: String(itemId),
      columnValues: JSON.stringify(columnValues),
    },
  );
}

async function deleteItem(itemId) {
  await call(
    `mutation ($itemId: ID!) {
      delete_item(item_id: $itemId) {
        id
      }
    }`,
    { itemId: String(itemId) },
  );
}

module.exports = { call, createItem, updateItem, deleteItem };
