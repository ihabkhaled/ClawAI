#!/bin/bash
# Attachment round-trip: upload a real PNG, attach it to a ticket, then fetch
# it back through the authorised admin endpoint and check the security headers.
BASE="https://claw.local/api/v1"
PASS=0
FAIL=0

check() {
  if [ "$3" = "$2" ]; then echo "  EXECUTED_AND_PASSED  $1 (got $3)"; PASS=$((PASS+1));
  else echo "  EXECUTED_AND_FAILED  $1 (expected $2, got $3)"; FAIL=$((FAIL+1)); fi
}

ADMIN=$(curl -sk --max-time 20 -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' "$BASE/auth/login" |
  python -c "import sys,json;print(json.load(sys.stdin)['tokens']['accessToken'])")

# A genuine 1x1 PNG, so file-service's magic-byte check sees real image bytes.
PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

echo "== Upload a real image through file-service =="
UPLOAD=$(curl -sk --max-time 30 -X POST -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"filename\":\"evidence-shot.png\",\"mimeType\":\"image/png\",\"sizeBytes\":70,\"content\":\"$PNG\"}" \
  "$BASE/files/upload")
FILE_ID=$(echo "$UPLOAD" | python -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
echo "  fileId: ${FILE_ID:-<none>}"
[ -n "$FILE_ID" ] && { echo "  EXECUTED_AND_PASSED  image accepted by file-service"; PASS=$((PASS+1)); } \
                  || { echo "  EXECUTED_AND_FAILED  upload rejected: $(echo "$UPLOAD" | head -c 200)"; FAIL=$((FAIL+1)); }
echo

echo "== Attach it to a ticket =="
TICKET=$(curl -sk --max-time 25 -X POST -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' \
  -d "{\"type\":\"BUG_REPORT\",\"title\":\"Ticket with a real screenshot\",\"contentMarkdown\":\"Attached below.\",\"attachments\":[{\"fileId\":\"$FILE_ID\",\"filename\":\"evidence-shot.png\",\"mimeType\":\"image/png\",\"sizeBytes\":70,\"isScreenshot\":true}]}" \
  "$BASE/feedback")
echo "  $TICKET"
TID=$(echo "$TICKET" | python -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$TID" ] && { echo "  EXECUTED_AND_PASSED  ticket created with attachment"; PASS=$((PASS+1)); } \
              || { echo "  EXECUTED_AND_FAILED  ticket not created"; FAIL=$((FAIL+1)); }
echo

echo "== A forged attachment reference is refused =="
check "attachment fileId that does not exist" 400 \
  "$(curl -sk --max-time 25 -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $ADMIN" \
    -H 'Content-Type: application/json' \
    -d '{"type":"BUG_REPORT","title":"Forged reference","contentMarkdown":"x","attachments":[{"fileId":"does-not-exist","filename":"a.png","mimeType":"image/png","sizeBytes":10,"isScreenshot":false}]}' \
    "$BASE/feedback")"
echo

echo "== Fetch it back through the authorised admin endpoint =="
HEADERS=$(curl -sk --max-time 25 -D - -o /tmp/att.bin -H "Authorization: Bearer $ADMIN" \
  "$BASE/feedback/admin/$TID/attachments/$FILE_ID" 2>/dev/null)
STATUS=$(echo "$HEADERS" | head -1 | awk '{print $2}')
check "admin can stream the attachment" 200 "$STATUS"
echo "$HEADERS" | grep -qi 'content-type: image/png' \
  && { echo "  EXECUTED_AND_PASSED  Content-Type is the stored image type"; PASS=$((PASS+1)); } \
  || { echo "  EXECUTED_AND_FAILED  Content-Type header"; FAIL=$((FAIL+1)); }
echo "$HEADERS" | grep -qi 'x-content-type-options: nosniff' \
  && { echo "  EXECUTED_AND_PASSED  nosniff is set"; PASS=$((PASS+1)); } \
  || { echo "  EXECUTED_AND_FAILED  nosniff missing"; FAIL=$((FAIL+1)); }
echo "$HEADERS" | grep -qi "content-security-policy: default-src 'none'" \
  && { echo "  EXECUTED_AND_PASSED  attachment CSP is locked down"; PASS=$((PASS+1)); } \
  || { echo "  EXECUTED_AND_FAILED  CSP missing"; FAIL=$((FAIL+1)); }
head -c 4 /tmp/att.bin | grep -q 'PNG' \
  && { echo "  EXECUTED_AND_PASSED  the bytes returned are the PNG that went in"; PASS=$((PASS+1)); } \
  || { echo "  EXECUTED_AND_FAILED  returned bytes are not a PNG"; FAIL=$((FAIL+1)); }
echo

echo "== A file not on the ticket cannot be fetched through it =="
check "unrelated fileId on this ticket" 404 \
  "$(curl -sk --max-time 20 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $ADMIN" \
    "$BASE/feedback/admin/$TID/attachments/some-other-file")"

echo
echo "----------------------------------------"
echo "PASSED: $PASS   FAILED: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
