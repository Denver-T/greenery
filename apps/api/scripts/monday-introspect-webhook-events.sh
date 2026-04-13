#!/usr/bin/env bash
# Query Monday's GraphQL schema for the current valid values of the
# WebhookEventType enum. Needed because Monday has renamed webhook event
# enums across API versions (e.g. delete_pulse → item_deleted), so we must
# discover the right name for API version 2024-10 at runtime rather than
# guessing from outdated docs.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

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

QUERY='{"query":"{ __type(name: \"WebhookEventType\") { name kind enumValues { name description } } }"}'

echo "— Monday WebhookEventType introspection —"
echo "API version: $API_VERSION"
echo

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: $MONDAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "API-Version: $API_VERSION" \
  -d "$QUERY")

# Pretty-print so the enum values are easy to eyeball.
echo "$RESPONSE" | jq '.'

echo
echo "— Done. Look for enum values containing 'delete' or 'item' — that's the rename target. —"
