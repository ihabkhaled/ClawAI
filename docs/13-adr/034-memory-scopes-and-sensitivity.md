# ADR-034 — Memory Scopes and Sensitivity Classification

## Status

Accepted (2026-05-24)

## Context

V1 stored every memory under a single `userId` bucket. There was no way to confine "Acme deal" facts to a single thread or workspace, no way to mark content as sensitive, and no defensible audit trail when an enterprise reviewer asked "what does ClawAI store about user X for project Y?".

## Decision

1. **Scope** — every memory carries a `MemoryScope` enum + nullable `scopeRef` (id of the owning entity):
   - `USER`: global per-user (the v1 default; remains the default for new memories).
   - `THREAD`: scoped to one chat thread.
   - `WORKSPACE`: scoped to one workspace.
   - `PROJECT`: scoped to one project.
     Retrieval enforces scope at the query layer (`findByUserScopeForRetrieval` builds an `OR` clause that only includes scopes the request's caller belongs to).

2. **Sensitivity** — every memory carries a `MemorySensitivity` enum (`NORMAL`, `SENSITIVE`, `REDACTED`). The new `MemorySensitivityManager` runs:
   - A regex pre-filter for high-confidence patterns (AWS access/secret keys, JWTs, SSNs, credit cards, private-key blocks, Google/GitHub/OpenAI tokens). Any hit → `REDACTED` + the matched fragment is masked before persistence.
   - A soft-hint scan for human-language markers (password, salary, medical, …). Hits → `SENSITIVE` with a confidence below 1.
   - A `NORMAL` verdict otherwise.

   Saving a memory whose verdict is `REDACTED` stores only the masked preview; the raw content is never written. Approving a `REDACTED` suggestion requires an explicit edit.

3. **Retention** — `MemoryRetention` enum (`PERMANENT`, `EXPIRING`, `AUTO_DECAY`) + nullable `expiresAt`. A retention sweep manager disables expired memories and hard-deletes them after a 7-day grace period; both transitions emit audit + RabbitMQ events.

4. **Audit + usage** — every CRUD action writes a `memory_audit_logs` row. Chat-service writes `memory_usages` rows after every assembled prompt so users can answer "why was this used?".

## Consequences

**Positive**:

- Enterprise pilots gain defensible isolation + audit.
- Privacy regressions blocked at write time, not retroactively cleaned up.
- Retention policy + audit row survival enables "right to be forgotten" workflows.

**Negative**:

- Schema doubles in column count. Mitigated: all new columns added as nullable + defaulted in the migration.
- Sensitivity classifier adds latency to creation. Mitigated: regex pre-filter handles obvious cases at zero ML cost; Ollama call is a follow-up enhancement.

## Related

- ADR-033 (suggestion queue)
- ADR-037 (unified retrieval bundle)
- ADR-038 (context receipt store)
