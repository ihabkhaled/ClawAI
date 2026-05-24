# Runbook — Desktop Agent Security, Privacy, and Sandboxing

> Owner: Desktop Agent V2 Stream 11
> Added: 2026-05-24

ClawAgent runs arbitrary capability invocations against the user's
local machine. This runbook documents the defenses-in-depth that
prevent a compromised agent (or a malicious recipe) from doing
unrecoverable damage.

## Defense layers

### 1. Capability framework gate (every invocation)

Every desktop-agent action goes through `CapabilityApprovalManager`:

```
propose() → CapabilityRiskService.assess()
              ↓
         Hard denylist (CAPABILITY_HARD_DENYLIST)
              ↓
         Policy match (AccessPolicy rows, priority-ordered)
              ↓
         {AUTO_APPROVED, PENDING_APPROVAL, DENIED}
```

The hard denylist (`apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts`)
refuses a small fixed set of tuples no operator should be able to
unlock without changing source — `rm -rf /`, fork bombs, kill PID 1,
`file://` browser navigates, etc. Even an org admin with a wildcard
ALLOW policy cannot override these.

### 2. Cryptographic auth (every CLI call)

- Device tokens (JWT, short-lived) issued via the device-code flow
  (`apps/claw-agent-service/src/modules/agent/services/token.service.ts`).
- Refresh-token rotation (`refresh.service.ts`); reuse-detection
  triggers `agent.token_reuse_detected` (V2 Stream 01c audit handler)
  and CRITICAL-severity audit log.
- Org-scoped policies + SAML SSO (V2 Stream 07 runbook).

### 3. Local-first defaults

- Activity-memory entries default to `syncedToCloud=false`. The CLI
  cloud-sync loop is OFF unless `CLAW_ACTIVITY_CLOUD_SYNC=true`
  (V2 Stream 05).
- Screen captures, audio recordings, clipboard contents stay in
  memory + temp files cleared at end of operation. Never written to
  the activity store unless the user explicitly opts in.
- Browser profile dirs are per-recipe and stored under `~/.claw-agent/recipe-browser-profiles/<runId>/`
  (V2 Stream 02) — cookies do not leak between recipe runs.

### 4. Audit redaction

`apps/claw-agent-service/src/app/app.module.ts` extends Pino redact
paths for V2 capability framework specifics (Stream 11):

- `req.body.target.{password,token,secret,apiKey,privateKey,contentBase64}`
- `req.body.payload.{password,token,secret,apiKey,privateKey,contentBase64}`
- `req.body.dsl.steps[*].target.{password,token}` (recipe DSLs)
- `req.body.result.{password,token,contentBase64}` (CLI completion)
- `req.body.SAMLResponse`

All redacted fields render as `[REDACTED]` in logs. The audit Mongo
collection receives the same redacted payload (the `audit-event.manager.ts`
in `claw-audit-service` only stores `entityId` + a hand-picked
summary, never the full request body).

### 5. Marketplace sandbox

Every recipe install goes through `MarketplaceService.install` →
`sandboxAnalyse` → worker_threads dry-run with `resourceLimits`
(128 MB heap, 5s wall-clock). Static analysis catches banned FS
paths, terminal patterns, browser domains; the worker rejects
runtime side effects.

### 6. Recipe DSL evaluator security

`recipe-expression.utility.ts` is a hand-written 500-LOC parser — NO
`eval`, NO `vm`, NO `new Function`. Locked behind 38 adversarial
fixtures including `__proto__` walks, constructor reflection, eval/
Function/require attempts, computed access, regex DoS, over-length
input (Round 11 close-out).

### 7. Tauri-shell signing

Auto-update bundles are Ed25519-signed at build time and pin-checked
at install time. `tauri.conf.json -> plugins.updater.pubkey` is the
pinned public key; a CDN compromise that serves a forged update will
fail the verify and the install aborts (Stream 04 + Stream 10
runbooks).

## Operator checklist

Before each release:

- [ ] `qa/test-stream-10-capability-framework.sh` — 28/28
- [ ] `qa/test-foundation-closeout.sh` — V2 Stream 01g
- [ ] `qa/test-providers-cross-os.sh` on Win/macOS/Linux + evidence
      filed under `.claude/Integrations/cross-os-evidence/`
- [ ] `npm run test -- --coverage` — agent-service ≥92%
- [ ] No new entries in `CAPABILITY_HARD_DENYLIST` without ADR review
- [ ] No new `redact.paths` removed without security-team sign-off
- [ ] Tauri pubkey unchanged unless rotating the entire updater key
      pair (separate runbook)

## Incident response

If a customer reports a capability that ran without approval:

1. **Capture** the relevant `CapabilityInvocation` row + every
   `audit_logs` row with `entityId=<invocationId>` (queries in
   `runbook-capability-framework.md`).
2. **Compare** the matched `AccessPolicy` row against the denylist —
   was the denylist supposed to catch it? If yes, file a P0 patch
   adding the missing entry.
3. **Revoke** the offending device immediately if it's a token-reuse
   pattern (`POST /agent/devices/:id/revoke`).
4. **Notify** the affected user + the security team.

## See also

- `apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts`
- `apps/claw-agent-service/src/common/constants/capability-policy.constants.ts` — default policies
- `docs/11-runbooks/runbook-capability-framework.md`
- `docs/11-runbooks/runbook-fleet-enterprise-sso.md` — SSO + device governance
- `docs/13-adr/ADR-029-capability-framework.md`
