# Stream 10 — Capability Framework QA Evidence

**Date**: 2026-05-01
**Script**: [qa/test-stream-10-capability-framework.sh](../../qa/test-stream-10-capability-framework.sh)
**Stack**: docker-compose.dev.yml — claw-agent-service:4015 + claw-audit-service:4007 + claw-pg-agent:5451 + claw-rabbitmq

## Result

**28 passed / 0 failed.**

## Coverage

| Section | Cases | Result |
|---|---:|---|
| AUTH (admin login) | 1 | PASS |
| Device pairing (magic-link) | 2 | PASS |
| PROPOSE — AUTO_APPROVE (FS READ in Documents) | 1 | PASS |
| PROPOSE — DENY (FS WRITE to /etc/passwd → matched `deny-fs-system-paths`, label=CRITICAL) | 1 | PASS |
| PROPOSE — PENDING_APPROVAL (FS WRITE to /tmp, no policy match) | 1 | PASS |
| Additional PENDING proposals (for reject/cancel paths) | 2 | PASS |
| APPROVE transition (PENDING → APPROVED, reviewedBy populated) | 1 | PASS |
| REJECT transition (PENDING → REJECTED with reason captured) | 1 | PASS |
| CANCEL transition (PENDING → CANCELLED) | 1 | PASS |
| Invalid transitions (double-approve, reject-after-approve → 409) | 2 | PASS |
| GET-by-id (single fetch + 404 on unknown) | 2 | PASS |
| LIST (pagination + status=DENIED filter) | 2 | PASS |
| DTO validation (non-CUID deviceId → 400, invalid enum → 400) | 2 | PASS |
| Auth (no JWT → 401) | 1 | PASS |
| DB persistence (5 rows, 1 AUTO_APPROVED, 1 DENIED, 2 reviewedAt, 18 capability defaults seeded) | 5 | PASS |
| RabbitMQ (12 capability event queues bound) | 1 | PASS |
| Docker logs (0 UnhandledPromiseRejection / FATAL across agent + audit) | 2 | PASS |

## Bugs Found & Fixed During Live QA

### Bug 1 — Legacy terminal policies leaking into capability path

**Symptom**: every capability proposal was matched against `block-rm-recursive-root` (a legacy terminal-command DENY policy with `capabilityClass=null`), forcing every proposal to status=DENIED with riskLabel=CRITICAL.

**Root cause**: [policy.repository.ts](../../apps/claw-agent-service/src/modules/agent/repositories/policy.repository.ts) `findActiveForCapabilityClass` returned policies with `capabilityClass=null` OR matching class. Combined with `targetMatcherJson=null` (legacy policies have no structured matcher), the legacy DENY rule matched every input. The legacy `pattern` regex column is consulted only in [command-risk.service.ts](../../apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts) — capability-risk service ignores it, so the legacy policy degenerated to "match anything".

**Fix**: capability path now reads only policies whose `capabilityClass` matches the input class. Legacy policies remain owned by the command-risk path.

### Bug 2 — AUTO_APPROVE never wins against a higher-priority ALLOW

**Symptom**: an FS READ in Documents matched both `allow-fs-read-user-dirs` (priority 500) and `auto-approve-fs-read-user-docs-low-risk` (priority 100). The capability service captured the higher-priority ALLOW first and returned PENDING_APPROVAL instead of AUTO_APPROVED.

**Root cause**: [capability-risk.service.ts](../../apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts) `matchFirstPolicy` walked policies in priority desc and recorded the first non-DENY match, no matter the kind. ALLOW always shadowed AUTO_APPROVE because ALLOWs are seeded at higher priorities (broader scope).

**Fix**: split into two passes inside the same loop — DENY short-circuits, AUTO_APPROVE preferred over ALLOW when both target-match. Locked behind a new regression test `AUTO_APPROVE wins over a higher-priority ALLOW when both target-match` in [capability-risk.service.spec.ts](../../apps/claw-agent-service/src/modules/agent/services/__tests__/capability-risk.service.spec.ts) (17 capability-risk tests now, 25 total in agent-service).

Both fixes shipped with this QA round; the script ends green afterwards.

## Stack State at Time of Run

```
$ ./scripts/claw.sh ps agent-service audit-service --format "table {{.Name}}\t{{.Status}}"
NAME                 STATUS
claw-agent-service   Up (healthy)
claw-audit-service   Up (healthy)
```

```
$ docker exec claw-pg-agent psql -U claw -d claw_agent -tAc \
    "SELECT status, COUNT(*) FROM capability_invocations GROUP BY status ORDER BY status;"
APPROVED|1
AUTO_APPROVED|1
CANCELLED|1
DENIED|1
REJECTED|1
```

```
$ docker exec claw-rabbitmq rabbitmqctl list_bindings | grep "claw.audit-service.agent.capability" | grep -v dlq | wc -l
12
```

## Files Touched in This QA Round

- [qa/test-stream-10-capability-framework.sh](../../qa/test-stream-10-capability-framework.sh) — new (220 lines)
- [apps/claw-agent-service/src/modules/agent/repositories/policy.repository.ts](../../apps/claw-agent-service/src/modules/agent/repositories/policy.repository.ts) — capability path no longer reads legacy null-class rows
- [apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts](../../apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts) — `matchFirstPolicy` precedence fix
- [apps/claw-agent-service/src/modules/agent/services/__tests__/capability-risk.service.spec.ts](../../apps/claw-agent-service/src/modules/agent/services/__tests__/capability-risk.service.spec.ts) — added AUTO_APPROVE-vs-ALLOW precedence regression
