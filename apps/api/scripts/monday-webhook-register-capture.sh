#!/usr/bin/env bash
# Throwaway: register two Monday webhooks (change_column_value + a delete
# event — the exact enum name is TBD after introspection) pointing at the
# webhook.site URL stored in MONDAY_WEBHOOK_CAPTURE_URL in .env, so we can
# capture one real payload of each type during Phase 4.2.0 of the Monday
# sync plan.
#
# Usage:
#   bash apps/api/scripts/monday-webhook-register-capture.sh
#
# After the script prints the two webhook IDs, trigger a column change and a
# delete on the Monday board, copy the captured payloads from webhook.site,
# then run scripts/monday-webhook-teardown.sh <id1> <id2> to clean up.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ .env not found at $ENV_FILE" >&2
  exit 1
fi

MONDAY_TOKEN=$(grep '^MONDAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
BOARD_ID=$(grep '^MONDAY_BOARD_ID=' "$ENV_FILE" | cut -d= -f2-)
WEBHOOK_URL=$(grep '^MONDAY_WEBHOOK_CAPTURE_URL=' "$ENV_FILE" | cut -d= -f2-)

if [[ -z "${MONDAY_TOKEN}" || -z "${BOARD_ID}" ]]; then
  echo "✗ MONDAY_API_TOKEN or MONDAY_BOARD_ID is empty in .env" >&2
  exit 1
fi
if [[ -z "${WEBHOOK_URL}" ]]; then
  echo "✗ MONDAY_WEBHOOK_CAPTURE_URL is empty in .env" >&2
  echo "  Add a line like:" >&2
  echo "  MONDAY_WEBHOOK_CAPTURE_URL=https://webhook.site/YOUR-ID" >&2
  exit 1
fi

API_URL="https://api.monday.com/v2"
API_VERSION="2024-10"

echo "— Monday webhook register+capture —"
echo "Board:   $BOARD_ID"
echo "Target:  $WEBHOOK_URL"
echo "Version: $API_VERSION"
echo

# --------------------------------------------------------------------
# Register 1 — change_column_value
# Build the JSON body with jq for proper escaping. The mutation uses
# $url as a GraphQL variable so we avoid quoting headaches.
# --------------------------------------------------------------------
REGISTER_QUERY=$(cat <<'GRAPHQL'
mutation ($boardId: ID!, $url: String!) {
  create_webhook(board_id: $boardId, url: $url, event: change_column_value) {
    id
    board_id
  }
}
GRAPHQL
)

BODY_CHANGE=$(jq -n \
  --arg q "$REGISTER_QUERY" \
  --arg boardId "$BOARD_ID" \
  --arg url "$WEBHOOK_URL" \
  '{query: $q, variables: {boardId: $boardId, url: $url}}')

echo "[1] Registering change_column_value webhook…"
RESPONSE_CHANGE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$BODY_CHANGE")

echo "$RESPONSE_CHANGE"
echo

# --------------------------------------------------------------------
# Register 2 — item_deleted
# (Monday's API was `delete_pulse` in older versions. The 2024-10
# schema renamed it to `item_deleted` — verified via introspection.)
# --------------------------------------------------------------------
DELETE_QUERY=$(cat <<'GRAPHQL'
mutation ($boardId: ID!, $url: String!) {
  create_webhook(board_id: $boardId, url: $url, event: item_deleted) {
    id
    board_id
  }
}
GRAPHQL
)

BODY_DELETE=$(jq -n \
  --arg q "$DELETE_QUERY" \
  --arg boardId "$BOARD_ID" \
  --arg url "$WEBHOOK_URL" \
  '{query: $q, variables: {boardId: $boardId, url: $url}}')

echo "[2] Registering item_deleted webhook…"
RESPONSE_DELETE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$BODY_DELETE")

echo "$RESPONSE_DELETE"
echo

echo "— Done. If both responses contain an \"id\", the webhooks are live. —"
echo "   Next: trigger a column change + a delete on the Monday board."
echo "   Then: tear down with scripts/monday-webhook-teardown.sh <id1> <id2>"
