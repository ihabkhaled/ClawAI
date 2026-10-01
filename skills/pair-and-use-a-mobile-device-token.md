# Skill: Pair and Use a Mobile Device Token (F097)

How to mint, use, narrow and revoke the `mobile` agent device token, and how to prove it is default-deny.
Design and rationale: [ADR-144](../docs/13-adr/adr-144-mobile-device-token-class.md). Allow-list table:
[`context/permission-map.md`](../context/permission-map.md). **No native mobile client exists**; this is the
curl contract a client will implement.

## When to use

- Changing anything under `agent/mobile`, `DeviceAccessGuard`, `MobileRoute`, pairing, or device refresh.
- Adding a route a phone should reach (then also update the allow-list in the inventory test).
- Verifying a deployment: the live recipe below.

## Change checklist

1. New phone-reachable route: put it on `AgentMobileController` (class already carries `@MobileRoute()`), add
   `@RequireScopes(<MobileDeviceScope>)` to the handler, add its signature to `MOBILE_ROUTES` in
   `apps/claw-agent-service/src/app/__tests__/mobile-token-route-inventory.spec.ts`. Never put `@MobileRoute()`
   on a desktop controller.
2. New mobile scope: `MobileDeviceScope` (shared-types) AND `MOBILE_DEVICE_SCOPE_VALUES` (shared-constants);
   `device.utility.spec.ts` fails if they drift. Rebuild both packages; every dev container needs a recreate.
3. Run `npx vitest run src/app/__tests__ src/common` in `apps/claw-agent-service`. If the inventory test passes
   after you removed your `@RequireScopes`, the test is not driving your route: stop and read it.

## Live recipe (curl, through nginx)

```bash
H=https://claw.local/api/v1
# 1. Owner signs in (user JWT)
OWNER=$(curl -sk $H/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@claw.local","password":"ClawAdmin123!"}' | jq -r '.data.accessToken // .accessToken')

# 2. Phone asks to pair (public)
CODE=$(curl -sk $H/agent/auth/pair/init -H 'content-type: application/json' \
  -d '{"deviceHint":{"hostname":"my-iphone","os":"ios","platform":"ios","agentVersion":"1.0.0"}}' | jq -r .pairingCode)

# 3. Owner approves AS A MOBILE DEVICE with run scopes only
curl -sk $H/agent/auth/pair/approve -H "authorization: Bearer $OWNER" -H 'content-type: application/json' \
  -d "{\"pairingCode\":\"$CODE\",\"tokenClass\":\"mobile\",\"deviceName\":\"My iPhone\",\"scopes\":[\"runs:read\",\"runs:approve\",\"runs:cancel\"]}"
#    -> {"deviceId":"..."}   (a mobile pairing with "shell:exec" in scopes answers 400)

# 4. Phone polls and receives its tokens (access 600 s, refresh 7 d)
TOK=$(curl -sk -X POST "$H/agent/auth/pair/poll?pairingCode=$CODE")
MOBILE=$(echo "$TOK" | jq -r .tokens.accessToken); REFRESH=$(echo "$TOK" | jq -r .tokens.refreshToken)

# 5. A pending run to act on (owner side: register a session, queue a command that needs approval)
SID=$(curl -sk $H/agent/sessions -H "authorization: Bearer $OWNER" -H 'content-type: application/json' \
  -d '{"hostname":"dev","platform":"linux","agentVersion":"1.0.0"}' | jq -r .id)
CMD=$(curl -sk $H/agent/commands -H "authorization: Bearer $OWNER" -H 'content-type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"command\":\"rm -rf ./build\"}" | jq -r .id)

# 6. The phone: list, read, approve (or reject / cancel)
curl -sk $H/agent/mobile/commands -H "authorization: Bearer $MOBILE"
curl -sk $H/agent/mobile/commands/$CMD -H "authorization: Bearer $MOBILE"
curl -sk -X POST $H/agent/mobile/commands/$CMD/approve -H "authorization: Bearer $MOBILE"

# 7. Refresh (rotates; reusing an old refresh token revokes the device)
curl -sk $H/agent/auth/refresh -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}"
```

### Prove default deny with the same token

Every line must be refused (401 or 403); none may return data or perform the action.

```bash
curl -sk -o /dev/null -w '%{http_code} devices\n'   $H/agent/devices            -H "authorization: Bearer $MOBILE"   # 401 user route
curl -sk -o /dev/null -w '%{http_code} create cmd\n' -X POST $H/agent/commands  -H "authorization: Bearer $MOBILE" \
  -H 'content-type: application/json' -d '{"sessionId":"x","command":"id"}'                                          # 401
curl -sk -o /dev/null -w '%{http_code} pending\n'   $H/agent/commands/pending   -H "authorization: Bearer $MOBILE"   # 403 shell route
curl -sk -o /dev/null -w '%{http_code} attach\n'    -X POST $H/agent/sessions/attach -H "authorization: Bearer $MOBILE" \
  -H 'content-type: application/json' -d '{}'                                                                         # 403
curl -sk -o /dev/null -w '%{http_code} runners\n'   -X POST $H/agent/runners/jobs -H "authorization: Bearer $MOBILE" \
  -H 'content-type: application/json' -d '{}'                                                                         # 401
curl -sk -o /dev/null -w '%{http_code} chat\n'      $H/chat/threads             -H "authorization: Bearer $MOBILE"   # 401 other service
```

Another user's run: pair a second user's phone and read `$CMD` with its token: **404**.

### Narrow, revoke, expire

```bash
DEV=<deviceId from step 3>
# narrow: allowed; widening to shell:exec answers 400 device_scope_class_mismatch
curl -sk -X PATCH $H/agent/devices/$DEV -H "authorization: Bearer $OWNER" -H 'content-type: application/json' \
  -d '{"scopes":["runs:read"]}'            # the phone's next approve is now 403 scope_denied
# revoke this one phone (the others keep working)
curl -sk -X POST $H/agent/devices/$DEV/revoke -H "authorization: Bearer $OWNER" -H 'content-type: application/json' -d '{"reason":"lost phone"}'
curl -sk -o /dev/null -w '%{http_code}\n' $H/agent/mobile/commands -H "authorization: Bearer $MOBILE"   # 401
```

Audit (admin): `GET $H/audits?action=AGENT_MOBILE_ACTION` shows one row per approve, reject and cancel, refused ones HIGH.

## Gotchas

- `JWT_SECRET` rotation retires every mobile token (the signing key is derived from it) and every refresh hash.
- A shared-types or shared-constants change reaches dev containers only after a recreate/rebuild.
- A mobile pairing needs the owner's user JWT on `pair/approve`; the phone alone cannot mint itself.
- Unit lane: `cd apps/claw-agent-service && npx vitest run src/app src/common src/modules/agent`.
