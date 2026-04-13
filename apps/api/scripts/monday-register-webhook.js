#!/usr/bin/env node
/*
 * monday-register-webhook.js
 *
 * Register, list, or delete Monday webhooks against the configured board.
 * Replaces the four bash scripts used during Phase 4.2.0 capture work
 * with a single production-grade Node CLI.
 *
 * Run from apps/api:
 *   node scripts/monday-register-webhook.js --register --url https://api.example.com
 *   node scripts/monday-register-webhook.js --list
 *   node scripts/monday-register-webhook.js --delete <id>
 *   node scripts/monday-register-webhook.js --delete-all --yes
 *   node scripts/monday-register-webhook.js --help
 *
 * On register, the script appends `/monday/webhook/<MONDAY_WEBHOOK_SECRET>`
 * to the supplied --url before sending it to Monday. Monday issues a
 * synchronous challenge probe to that URL during registration, which
 * the inbound webhook route (apps/api/src/routes/mondayWebhook.js)
 * handles automatically. If the probe fails (target not reachable,
 * wrong secret, route not deployed, etc.), Monday returns a 500 and
 * we surface a friendly hint.
 *
 * Two webhook events are registered per --register call:
 *   - change_column_value (handler dispatches as update_column_value)
 *   - item_deleted        (handler dispatches as delete_pulse)
 *
 * The runtime event.type strings differ from the registration enums —
 * see apps/api/scripts/.monday-webhook-samples.json for the rename
 * rationale.
 *
 * Environment (read from apps/api/.env via dotenv):
 *   MONDAY_API_TOKEN       — personal access token
 *   MONDAY_BOARD_ID        — numeric board id
 *   MONDAY_WEBHOOK_SECRET  — 32+ char secret appended to --url path
 *   MONDAY_API_VERSION     — default 2024-10
 *
 * The script never prints the webhook secret. The full webhook URL is
 * shown to Monday but only the secret-redacted form is logged here.
 */

const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID;
const MONDAY_WEBHOOK_SECRET = process.env.MONDAY_WEBHOOK_SECRET;
const MONDAY_API_VERSION = process.env.MONDAY_API_VERSION || "2024-10";

const MONDAY_API_URL = "https://api.monday.com/v2";

// Registration enum names. The plan's older drafts referenced
// `delete_pulse` and `create_pulse` — those are the runtime event.type
// strings, not the modern registration enums. Verified via introspection
// in Phase 4.2.0.
const REGISTER_EVENTS = ["change_column_value", "item_deleted"];

function usage() {
  console.log(`Monday webhook registration CLI

Usage:
  node scripts/monday-register-webhook.js --register --url <public_url>
      Register change_column_value + item_deleted webhooks pointing at
      <public_url>/monday/webhook/<secret>. Reads MONDAY_WEBHOOK_SECRET
      from .env and appends it to the URL path automatically.

  node scripts/monday-register-webhook.js --list
      List every webhook on the configured board with id and event type.
      Use this to find IDs for --delete.

  node scripts/monday-register-webhook.js --delete <id>
      Delete a single webhook by id. Run --list first to find the id.

  node scripts/monday-register-webhook.js --delete-all --yes
      Delete EVERY webhook on the configured board. Requires --yes as
      a foot-gun guard. Useful for a clean re-register.

  node scripts/monday-register-webhook.js --help
      Show this help.

Environment (apps/api/.env):
  MONDAY_API_TOKEN       — personal access token (Monday Developer Center)
  MONDAY_BOARD_ID        — numeric board id from the board URL
  MONDAY_WEBHOOK_SECRET  — generate with: openssl rand -hex 32
  MONDAY_API_VERSION     — defaults to 2024-10
`);
}

function parseArgs(argv) {
  const args = { mode: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    switch (a) {
      case "--help":
      case "-h":
        args.mode = "help";
        break;
      case "--register":
        args.mode = "register";
        break;
      case "--list":
        args.mode = "list";
        break;
      case "--delete":
        args.mode = "delete";
        args.deleteId = argv[++i];
        break;
      case "--delete-all":
        args.mode = "delete-all";
        break;
      case "--url":
        args.url = argv[++i];
        break;
      case "--yes":
        args.confirm = true;
        break;
      default:
        console.error(`Unknown argument: ${a}`);
        console.error("Run --help for usage.");
        process.exit(2);
    }
  }
  return args;
}

async function mondayRequest(query, variables) {
  const response = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: MONDAY_API_TOKEN,
      "Content-Type": "application/json",
      "API-Version": MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Monday API returned non-JSON response (status ${response.status})`,
    );
  }

  if (payload.errors && payload.errors.length > 0) {
    const message = payload.errors
      .map((e) => e.message || "(no message)")
      .join("; ");
    throw new Error(`Monday API error: ${message}`);
  }
  return payload.data;
}

async function listWebhooks(boardId) {
  const data = await mondayRequest(
    `query ($boardId: ID!) { webhooks(board_id: $boardId) { id board_id event } }`,
    { boardId: String(boardId) },
  );
  return data.webhooks || [];
}

async function createWebhook(boardId, url, event) {
  const data = await mondayRequest(
    `mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
      create_webhook(board_id: $boardId, url: $url, event: $event) {
        id
        board_id
      }
    }`,
    { boardId: String(boardId), url, event },
  );
  return data.create_webhook;
}

async function deleteWebhook(id) {
  const data = await mondayRequest(
    `mutation ($id: ID!) { delete_webhook(id: $id) { id } }`,
    { id: String(id) },
  );
  return data.delete_webhook;
}

function buildWebhookUrl(publicUrl, secret) {
  // Strip trailing slashes from the public URL to avoid double-slash.
  const base = publicUrl.replace(/\/+$/, "");
  return `${base}/monday/webhook/${secret}`;
}

function requireEnv(name, value) {
  if (!value) {
    console.error(`${name} is not set in .env`);
    if (name === "MONDAY_WEBHOOK_SECRET") {
      console.error("  Generate with: openssl rand -hex 32");
      console.error(
        "  Then add to apps/api/.env: MONDAY_WEBHOOK_SECRET=<generated>",
      );
    }
    process.exit(1);
  }
}

async function modeRegister(args) {
  if (!args.url) {
    console.error("--register requires --url <public_url>");
    console.error(
      "Example: --register --url https://abc.trycloudflare.com",
    );
    process.exit(2);
  }
  // Paranoia guard: reject a URL that already contains the webhook path
  // fragment. buildWebhookUrl would otherwise happily append a SECOND
  // /monday/webhook/<secret> segment, producing a broken registration
  // Monday silently accepts but can never challenge-probe.
  if (/\/monday\/webhook\//.test(args.url)) {
    console.error(
      "--url should be the base public URL only, NOT the full webhook path.",
    );
    console.error(
      `Received: ${args.url.replace(/\/monday\/webhook\/[^/]*/, "/monday/webhook/<redacted>")}`,
    );
    console.error(
      "Example of correct form: --url https://api.example.com",
    );
    process.exit(2);
  }
  requireEnv("MONDAY_API_TOKEN", MONDAY_API_TOKEN);
  requireEnv("MONDAY_BOARD_ID", MONDAY_BOARD_ID);
  requireEnv("MONDAY_WEBHOOK_SECRET", MONDAY_WEBHOOK_SECRET);

  const fullUrl = buildWebhookUrl(args.url, MONDAY_WEBHOOK_SECRET);
  // Print the redacted form — never the full URL with the secret.
  const baseForDisplay = args.url.replace(/\/+$/, "");
  console.log(`Board:        ${MONDAY_BOARD_ID}`);
  console.log(`Webhook URL:  ${baseForDisplay}/monday/webhook/<secret>`);
  console.log(`Events:       ${REGISTER_EVENTS.join(", ")}`);
  console.log("");

  // Detect existing webhooks for these events on the board so the user
  // knows about potential duplicates. Monday allows multiple webhooks
  // per event with different URLs and the API doesn't expose URL on
  // the list endpoint, so we can't auto-skip.
  const existing = await listWebhooks(MONDAY_BOARD_ID);
  const existingForOurEvents = existing.filter((w) =>
    REGISTER_EVENTS.includes(w.event),
  );
  if (existingForOurEvents.length > 0) {
    console.log(
      `⚠  ${existingForOurEvents.length} existing webhook(s) on this board for our event types:`,
    );
    for (const w of existingForOurEvents) {
      console.log(`     id=${w.id}  event=${w.event}`);
    }
    console.log(
      "   These will NOT be deleted. Monday allows multiple webhooks per",
    );
    console.log(
      "   event with different URLs — the new webhooks will be added on",
    );
    console.log(
      "   top of these. For a clean re-register, run --delete-all --yes first.",
    );
    console.log("");
  }

  const created = [];
  for (const event of REGISTER_EVENTS) {
    process.stdout.write(`Registering ${event}... `);
    try {
      const result = await createWebhook(MONDAY_BOARD_ID, fullUrl, event);
      console.log(`OK  (id=${result.id})`);
      created.push({ event, id: result.id });
    } catch (err) {
      console.log("FAILED");
      console.error(`  ${err.message}`);
      console.error("");
      console.error("  Common causes of registration failure:");
      console.error(
        "    1. Target URL not reachable from Monday's servers (check tunnel)",
      );
      console.error(
        "    2. Target URL doesn't echo Monday's challenge back as 200 + JSON",
      );
      console.error(
        "    3. MONDAY_WEBHOOK_SECRET on the target API doesn't match this .env",
      );
      console.error(
        "    4. Monday API token lacks webhook creation permission on this board",
      );
      // Roll back partial state so the user isn't left with a half-registered
      // pair. The script exits non-zero either way.
      if (created.length > 0) {
        console.error("");
        console.error("  Rolling back previously-created webhooks...");
        for (const w of created) {
          try {
            await deleteWebhook(w.id);
            console.error(`    deleted id=${w.id}`);
          } catch (rollbackErr) {
            console.error(
              `    failed to delete id=${w.id}: ${rollbackErr.message}`,
            );
          }
        }
      }
      process.exit(1);
    }
  }

  console.log("");
  console.log(`✓ Registered ${created.length} webhook(s):`);
  for (const w of created) {
    console.log(`   id=${w.id}  event=${w.event}`);
  }
  console.log("");
  console.log("Save these IDs if you want to delete them individually later.");
  console.log("To delete: node scripts/monday-register-webhook.js --delete <id>");
}

async function modeList() {
  requireEnv("MONDAY_API_TOKEN", MONDAY_API_TOKEN);
  requireEnv("MONDAY_BOARD_ID", MONDAY_BOARD_ID);

  const webhooks = await listWebhooks(MONDAY_BOARD_ID);
  if (webhooks.length === 0) {
    console.log(`No webhooks registered on board ${MONDAY_BOARD_ID}.`);
    return;
  }
  console.log(`Webhooks on board ${MONDAY_BOARD_ID}:`);
  console.log("");
  console.log("  id              event");
  console.log("  --------------  -----------------------");
  for (const w of webhooks) {
    console.log(`  ${String(w.id).padEnd(14)}  ${w.event}`);
  }
  console.log("");
  console.log(`(${webhooks.length} total)`);
}

async function modeDelete(args) {
  if (!args.deleteId) {
    console.error("--delete requires an id argument");
    console.error(
      "Example: --delete 564333409   (find ids with --list first)",
    );
    process.exit(2);
  }
  requireEnv("MONDAY_API_TOKEN", MONDAY_API_TOKEN);

  process.stdout.write(`Deleting webhook id=${args.deleteId}... `);
  try {
    await deleteWebhook(args.deleteId);
    console.log("OK");
  } catch (err) {
    console.log("FAILED");
    console.error(`  ${err.message}`);
    process.exit(1);
  }
}

async function modeDeleteAll(args) {
  if (!args.confirm) {
    console.error(
      "--delete-all requires --yes — this will delete EVERY webhook on the board.",
    );
    console.error(
      "Run --list first if you want to see what would be removed.",
    );
    process.exit(2);
  }
  requireEnv("MONDAY_API_TOKEN", MONDAY_API_TOKEN);
  requireEnv("MONDAY_BOARD_ID", MONDAY_BOARD_ID);

  const webhooks = await listWebhooks(MONDAY_BOARD_ID);
  if (webhooks.length === 0) {
    console.log("No webhooks to delete.");
    return;
  }
  console.log(`Deleting ${webhooks.length} webhook(s) from board ${MONDAY_BOARD_ID}...`);
  let deleted = 0;
  let failed = 0;
  for (const w of webhooks) {
    process.stdout.write(`  id=${w.id} event=${w.event}... `);
    try {
      await deleteWebhook(w.id);
      console.log("OK");
      deleted += 1;
    } catch (err) {
      console.log("FAILED");
      console.error(`    ${err.message}`);
      failed += 1;
    }
  }
  console.log("");
  console.log(`✓ Deleted ${deleted}, failed ${failed}`);
  if (failed > 0) process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.mode) {
    usage();
    process.exit(2);
  }
  if (args.mode === "help") {
    usage();
    process.exit(0);
  }

  try {
    switch (args.mode) {
      case "register":
        await modeRegister(args);
        break;
      case "list":
        await modeList();
        break;
      case "delete":
        await modeDelete(args);
        break;
      case "delete-all":
        await modeDeleteAll(args);
        break;
      default:
        usage();
        process.exit(2);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
