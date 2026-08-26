#!/bin/bash
# Proves the admin boundary against a REAL non-admin session, not just an
# unauthenticated one. Hiding the nav entry is not the control; these are the
# calls an attacker would make by hand.
#
# Needs a throwaway non-admin account on the local stack. Create one through
# the normal sign-up flow, activate it, then run:
#
#   FEEDBACK_USER_EMAIL=<address> FEEDBACK_USER_PASSWORD=<password> ./rbac-boundary.sh
#
# The password is deliberately not committed. The admin address below is the
# local dev seed account that .env.example and the existing e2e specs already
# use, so it is not a new secret.
BASE="https://claw.local/api/v1"
USER_EMAIL="${FEEDBACK_USER_EMAIL:?set FEEDBACK_USER_EMAIL to a non-admin account}"
USER_PASSWORD="${FEEDBACK_USER_PASSWORD:?set FEEDBACK_USER_PASSWORD for that account}"
PASS=0
FAIL=0

login() {
  curl -sk --max-time 20 -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$BASE/auth/login" |
    python -c "import sys,json;print(json.load(sys.stdin)['tokens']['accessToken'])" 2>/dev/null
}

check() {
  if [ "$3" = "$2" ]; then
    echo "  EXECUTED_AND_PASSED  $1 (got $3)"
    PASS=$((PASS + 1))
  else
    echo "  EXECUTED_AND_FAILED  $1 (expected $2, got $3)"
    FAIL=$((FAIL + 1))
  fi
}

code() {
  if [ -n "$4" ]; then
    curl -sk --max-time 20 -o /dev/null -w '%{http_code}' -X "$1" \
      -H "Authorization: Bearer $3" -H 'Content-Type: application/json' -d "$4" "$2"
  else
    curl -sk --max-time 20 -o /dev/null -w '%{http_code}' -X "$1" \
      -H "Authorization: Bearer $3" "$2"
  fi
}

ADMIN=$(login 'admin@claw.local' 'ClawAdmin123!')
USER=$(login "$USER_EMAIL" "$USER_PASSWORD")
echo "admin token ${#ADMIN} chars · user token ${#USER} chars"
echo

echo "== A normal user is refused every admin route =="
check "GET  /feedback/admin"        403 "$(code GET   "$BASE/feedback/admin" "$USER")"
check "GET  /feedback/admin/stats"  403 "$(code GET   "$BASE/feedback/admin/stats" "$USER")"
check "GET  /feedback/admin/:id"    403 "$(code GET   "$BASE/feedback/admin/6a8acedf6bad54a5a3c078da" "$USER")"
check "PATCH admin status change"   403 "$(code PATCH "$BASE/feedback/admin/6a8acedf6bad54a5a3c078da/status" "$USER" '{"status":"RESOLVED"}')"
check "GET  admin attachment"       403 "$(code GET   "$BASE/feedback/admin/6a8acedf6bad54a5a3c078da/attachments/x" "$USER")"
echo

echo "== The same user CAN use the feature they are entitled to =="
check "POST /feedback"        201 "$(code POST "$BASE/feedback" "$USER" '{"type":"GENERAL_FEEDBACK","title":"Filed by a normal user","contentMarkdown":"Body from a non-admin account."}')"
check "GET  /feedback/mine"   200 "$(code GET  "$BASE/feedback/mine" "$USER")"
echo

echo "== Tenant isolation: the user sees ONLY their own tickets =="
python - "$USER" "$ADMIN" "$USER_EMAIL" <<'PY'
import json, subprocess, sys

user_token, admin_token, expected_email = sys.argv[1], sys.argv[2], sys.argv[3]

def get(url, token):
    out = subprocess.run(
        ['curl', '-sk', '--max-time', '20', '-H', f'Authorization: Bearer {token}', url],
        capture_output=True, text=True,
    ).stdout
    return json.loads(out)

mine = get('https://claw.local/api/v1/feedback/mine', user_token)
everything = get('https://claw.local/api/v1/feedback/admin?limit=100', admin_token)

owners = {item.get('reporterEmail') for item in mine['items']}
print(f"  user's own list  : {mine['total']} ticket(s), reporters={sorted(owners) or ['-']}")
print(f"  admin total      : {everything['total']} ticket(s)")

ok_scoped = owners <= {expected_email}
ok_subset = mine['total'] < everything['total']
print(('  EXECUTED_AND_PASSED  ' if ok_scoped else '  EXECUTED_AND_FAILED  ')
      + 'own list contains only the caller\'s tickets')
print(('  EXECUTED_AND_PASSED  ' if ok_subset else '  EXECUTED_AND_FAILED  ')
      + 'own list is a strict subset of all tickets (IDOR closed)')
sys.exit(0 if (ok_scoped and ok_subset) else 1)
PY
ISO=$?
echo
echo "----------------------------------------"
echo "route checks — PASSED: $PASS  FAILED: $FAIL   | isolation exit: $ISO"
[ "$FAIL" -eq 0 ] && [ "$ISO" -eq 0 ] || exit 1
