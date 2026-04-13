#!/usr/bin/env bash
# Monday API diagnostic — read MONDAY_API_TOKEN and MONDAY_BOARD_ID from .env,
# run three progressive checks (board read, webhook read, list webhooks) so we
# can isolate whether a create_webhook failure is auth, permission, or shape.
#
# Usage:  bash apps/api/scripts/monday-diag.sh
# The token is only kept in a local variable for the duration of this script.
# It never prints to stdout — only redacted success/failure messages print.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ .env not found at $ENV_FILE" >&2
  exit 1
fi

MONDAY_TOKEN=$(grep '^MONDAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
BOARD_ID=$(grep '^MONDAY_BOARD_ID=' "$ENV_FILE" | cut -d= -f2-)

if [[ -z "${MONDAY_TOKEN}" ]]; then
  echo "✗ MONDAY_API_TOKEN is empty in .env" >&2
  exit 1
fi
if [[ -z "${BOARD_ID}" ]]; then
  echo "✗ MONDAY_BOARD_ID is empty in .env" >&2
  exit 1
fi

API_URL="https://api.monday.com/v2"
API_VERSION="2024-10"

echo "— Monday API diagnostic —"
echo "Board: $BOARD_ID"
echo "API version: $API_VERSION"
echo

# --------------------------------------------------------------------
# Check 1 — can this token see the target board at all?
# --------------------------------------------------------------------
echo "[1] Board read check…"
BOARD_QUERY='{"query":"query { boards(ids: ['"$BOARD_ID"']) { id name owners { id name } } }"}'

BOARD_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$BOARD_QUERY")

echo "$BOARD_RESPONSE"
echo

# --------------------------------------------------------------------
# Check 2 — can this token list webhooks on that board?
# Requires the same permission tier as create_webhook.
# --------------------------------------------------------------------
echo "[2] Webhook list check…"
WEBHOOK_QUERY='{"query":"query { webhooks(board_id: '"$BOARD_ID"') { id event config } }"}'

WEBHOOK_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$WEBHOOK_QUERY")

echo "$WEBHOOK_RESPONSE"
echo

# --------------------------------------------------------------------
# Check 3 — what does `me` look like? Confirms token identity and scopes.
# --------------------------------------------------------------------
echo "[3] Current user check…"
ME_QUERY='{"query":"query { me { id name email account { id name } } }"}'

ME_RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$ME_QUERY")

echo "$ME_RESPONSE"
echo

echo "— Done. Token variable cleared on script exit. —"
