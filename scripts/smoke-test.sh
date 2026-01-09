#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
REVIEWER_KEY="${REVIEWER_KEY:-reviewer_demo_key}"
ADMIN_KEY="${ADMIN_KEY:-admin_demo_key}"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require curl
require node

uuid() {
  node -e "console.log(require('crypto').randomUUID())"
}

json_get() {
  # json_get <json> <js_expr_returning_value>
  # Example: json_get "$body" "j.id"
  local json="$1"
  local expr="$2"
  node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); const v=(${expr}); if(v===undefined||v===null){process.exit(2)}; process.stdout.write(String(v));" <<<"$json"
}

echo "== Smoke Test =="
echo "BASE_URL=$BASE_URL"

echo
echo "-- Health"
curl -sS "$BASE_URL/health" | node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); if(j.ok!==true){process.exit(1)}; console.log('ok')"

echo
echo "-- Books: list (reviewer)"
curl -sS -H "X-API-Key: $REVIEWER_KEY" "$BASE_URL/api/books?limit=2" >/dev/null
echo "ok"

echo
echo "-- Books: create (reviewer) + audits should capture"
REQUEST_ID="$(uuid)"
CREATE_BODY="$(curl -sS -H "X-API-Key: $REVIEWER_KEY" -H "X-Request-Id: $REQUEST_ID" -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Book","authors":"Smoke","publishedBy":"Self"}' \
  "$BASE_URL/api/books")"
BOOK_ID="$(json_get "$CREATE_BODY" "j.id")"
echo "created bookId=$BOOK_ID requestId=$REQUEST_ID"

echo
echo "-- Books: update (reviewer)"
curl -sS -H "X-API-Key: $REVIEWER_KEY" -H "X-Request-Id: $(uuid)" -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Book v2"}' \
  "$BASE_URL/api/books/$BOOK_ID" >/dev/null
echo "ok"

echo
echo "-- Books: delete (reviewer)"
curl -sS -H "X-API-Key: $REVIEWER_KEY" -H "X-Request-Id: $(uuid)" \
  -X DELETE "$BASE_URL/api/books/$BOOK_ID" >/dev/null
echo "ok"

echo
echo "-- Audits: query by requestId (admin) should return >=1 item"
AUDITS_BODY="$(curl -sS -H "X-API-Key: $ADMIN_KEY" "$BASE_URL/api/audits?requestId=$REQUEST_ID&limit=10")"
AUDIT_COUNT="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); console.log((j.items||[]).length)" <<<"$AUDITS_BODY")"
if [[ "$AUDIT_COUNT" -lt 1 ]]; then
  echo "Expected audits for requestId=$REQUEST_ID, got 0" >&2
  echo "$AUDITS_BODY" >&2
  exit 1
fi
AUDIT_ID="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(0,'utf8')); console.log(j.items[0].id)" <<<"$AUDITS_BODY")"
echo "ok (auditId=$AUDIT_ID)"

echo
echo "-- Audits: get one (admin)"
curl -sS -H "X-API-Key: $ADMIN_KEY" "$BASE_URL/api/audits/$AUDIT_ID" >/dev/null
echo "ok"

echo
echo "-- Audits: reviewer forbidden"
STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -H "X-API-Key: $REVIEWER_KEY" "$BASE_URL/api/audits?limit=1")"
if [[ "$STATUS" != "403" ]]; then
  echo "Expected 403, got $STATUS" >&2
  exit 1
fi
echo "ok"

echo
echo "✅ Smoke test passed"

