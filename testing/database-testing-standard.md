# Database Testing Standard

How to test persistence in a database-per-service world (PostgreSQL + Prisma per
service; Mongo for audit/client-logs/server-logs; pgvector). Repositories are the only
place Prisma/Mongoose runs, so they are the primary unit of DB testing.

## Verify persistence, not the response

The single most important rule: **a 2xx is not proof a row landed.** After any tested
write, read the store back and assert reality — caches and transforms can lie. See
[`../memory/database-lessons.md`](../memory/database-lessons.md).

```bash
docker exec <db-container> psql -U <user> -d <db> -tAc \
  "SELECT COUNT(*) FROM <table> WHERE <condition>;"
```

Assert:

- row count changed as expected on create/delete,
- **secret columns exist encrypted in the DB even when stripped from the API**
  (`encryptedConfig`, `encryptedSecret`, `passwordHash`),
- deleted rows are actually gone (no soft-delete leak unless intended),
- status transitions are reflected (`EXECUTED` vs `FAILED`, ingestion status, etc.).

## Repository tests

- Each repository method maps to ONE DB operation — test that operation's behavior:
  correct filter, correct projection, returns data or `null` (repositories never throw).
- **Bounds:** pagination returns bounded pages; over-limit inputs are handled. An
  unbounded query is a resource-exhaustion vector — test the bound.
- **Constraints:** unique constraints, cascade deletes (`File` → `FileChunk`), and
  foreign relationships behave as declared.

## Migration tests

- Migrations are **additive and reversible by default**. Test that a migration applies
  cleanly and (where relevant) that a dual-write window keeps old and new in sync before
  the read flip — the `file_delivery_records` pattern (ADR-054).
- Never test a schema that drops a column in the same release that stops writing it.

## Boundary isolation

- No cross-service DB reads in tests — a service test touches only its own DB. Cross-
  context data is HTTP/events, tested via [contract testing](contract-testing-standard.md).
- Vector search (pgvector) tests assert ordering/top-K semantics with fixed embeddings,
  not fuzzy model output.

## Determinism

- Clean state per test: transaction rollback or truncate between tests.
- Use a dedicated test database or an ephemeral container; never a shared dev DB.
- Pin any locale-sensitive ordering (`localeCompare`) — see
  [flaky-test-policy](flaky-test-policy.md).

## Related

- [Integration testing](integration-testing-standard.md) ·
  [`../memory/database-lessons.md`](../memory/database-lessons.md) ·
  [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md)
