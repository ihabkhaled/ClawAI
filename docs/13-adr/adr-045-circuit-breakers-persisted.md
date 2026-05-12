# ADR-045 — Persisted Circuit Breakers per Provider Scope

- **Status:** Accepted
- **Date:** 2026-05-11
- **Phase:** Smart Router Flagship · Phase 12

## Context

The router must route around providers that are temporarily failing
(Anthropic 5xx storm, Ollama crashed, llama.cpp segfault). The classic
options are:

- **In-memory CB** — fast but resets on container restart. A flapping
  provider re-armed after every redeploy.
- **Redis-backed CB** — survives restart but adds a Redis-availability dep
  to the routing hot path.
- **Postgres-backed CB** — durable, schema-bound, queryable for audit.

## Decision

Store circuit-breaker state in Postgres table `router_circuit_breakers`,
keyed by `scope` (provider name: `ANTHROPIC`, `OPENAI`, `OLLAMA`, `LLAMACPP`,
custom). Columns: `state` (CLOSED|OPEN|HALF_OPEN), `failure_count`,
`opened_at`, `last_transition_at`.

State machine:

```
CLOSED  ─(3 failures within 60s)─► OPEN
OPEN    ─(60s elapsed since opened_at)─► HALF_OPEN  (returned at read time only)
HALF_OPEN ─(success)─► CLOSED
HALF_OPEN ─(failure)─► OPEN  (re-opens, new opened_at)
```

State transitions emit RabbitMQ events
(`routing.circuit_breaker.opened` / `closed` / `half_open`) consumed by
audit-service.

The `HALF_OPEN` state is **never written** to DB — it's computed at read time
from `(state=OPEN AND now - opened_at > 60s)`. This keeps writes minimal
and avoids a cron job to flip states.

## Consequences

- Container restart preserves CB state — a provider OPEN for 30s stays OPEN
  for another 30s after restart instead of resetting.
- Admin reset path (`POST /circuit-breakers/:scope/reset`) writes CLOSED,
  count=0, audited.
- Each `evaluate()` call does N+1 reads (one per provider in candidate set)
  — mitigated by 5-second Redis cache layer (planned Phase 13).
- HALF_OPEN logic is centralized in the manager's `adjustOpenForExpiry`
  helper; future tweaks (multi-tier expiry, jitter) localized there.

## Alternatives considered

- **Per-(provider, model) breakers** — rejected: too granular; one bad
  Anthropic key shouldn't poison Anthropic claude-haiku.
- **Redis only** — rejected: routing must work even when Redis is degraded.
