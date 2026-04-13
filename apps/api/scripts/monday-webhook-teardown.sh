#!/usr/bin/env bash
# Delete Monday webhooks by id. Used to tear down the throwaway webhooks
# registered in Phase 4.2.0 so webhook.site and our board stop echoing.
#
# Usage:
#   bash apps/api/scripts/monday-webhook-teardown.sh <id1> [<id2> ...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [[ $# -eq 0 ]]; then
  echo "usage: $0 <webhook_id> [<webhook_id> ...]" >&2
  echo "example: $0 12345678 23456789" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ .env not found at $ENV_FILE" >&2
  exit 1
fi

MONDAY_TOKEN=$(grep '^MONDAY_API_TOKEN=' "$ENV_FILE" | cut -d= -f2-)

if [[ -z "${MONDAY_TOKEN}" ]]; then
  echo "✗ MONDAY_API_TOKEN is empty in .env" >&2
  exit 1
fi

API_URL="https://api.monday.com/v2"
API_VERSION="2024-10"

DELETE_QUERY=$(cat <<'GRAPHQL'
mutation ($id: ID!) {
  delete_webhook(id: $id) { id }
}
GRAPHQL
)

echo "— Monday webhook teardown —"

for WEBHOOK_ID in "$@"; do
  echo
  echo "Deleting webhook ${WEBHOOK_ID}..."

  BODY=$(jq -n \
    --arg q "$DELETE_QUERY" \
    --arg id "$WEBHOOK_ID" \
    '{query: $q, variables: {id: $id}}')

  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: $MONDAY_TOKEN" \
    -H "Content-Type: application/json" \
    -H "API-Version: $API_VERSION" \
    -d "$BODY")

  echo "$RESPONSE"
done

echo
echo "— Done. —"
