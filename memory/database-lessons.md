# Database Lessons

Durable lessons about persistence (PostgreSQL + Prisma per service; Mongo for
audit/client-logs/server-logs; pgvector; migrations). See [README](README.md).

---

### Verify persistence with a read, not with a 2xx (2026-07-24)

**What happened.** A write endpoint returned success while the row was wrong or
absent; the response body (built from in-memory state or a cache) lied about what
actually landed in the DB.

**The durable lesson.** An API's success response is not proof of persistence — caches
and transforms can lie. The only truth is a subsequent read of the store itself.

**How to apply.** After any tested CREATE/UPDATE/DELETE, verify with a direct query
(`docker exec … psql -tAc "SELECT …"`) or a follow-up GET: row count changed as
expected, secret columns exist encrypted even when stripped from the API, deleted rows
actually gone, status transitions reflected.

**Related.** [testing/database-testing-standard](../testing/database-testing-standard.md);
`CLAUDE.md` → QE mindset 3.

---

### Migrations are additive and reversible by default (2026-07-24)

**What happened.** Destructive schema changes (drop/rename in place) risk data loss
and make rollback impossible. Field renames also break FE types silently (see
[known-pitfalls](known-pitfalls.md)).

**The durable lesson.** A migration you can't roll back is a one-way door on
production data. Additive changes (add column, backfill, dual-write, then flip reads,
then drop later) keep the door open.

**How to apply.** Prefer additive migrations. For a field move, use a dual-write
window (write both old and new, read old until drift is zero, then flip reads, drop
old in a follow-up) — exactly the `file_delivery_records` pattern (ADR-054). Never
drop a column in the same release that stops writing it.

**Related.** ADR-054 file-delivery-records; `../docs/features/_template/11-data-and-migration-plan.md`.

---

### Each service owns its schema — no foreign reads, no shared tables (2026-07-24)

**What happened.** The temptation to read another service's table directly recurs
whenever a feature needs cross-context data.

**The durable lesson.** Shared tables reintroduce exactly the coupling database-per-
service was chosen to prevent. One service's migration would then break another's
reads — the failure isolation is gone.

**How to apply.** Cross-context data is HTTP or events only (see
[rabbitmq-lessons](rabbitmq-lessons.md)). Prisma/Mongoose calls live only in
repositories; no raw SQL.

**Related.** ADR-002 database-per-service; [backend-patterns](backend-patterns.md).

---

### Guard unbounded reads and writes (2026-07-24)

**What happened.** Missing pagination limits and unbounded array inputs allowed large
result sets and payloads that pressure memory.

**The durable lesson.** An unbounded query or input is a resource-exhaustion vector
that the happy path never reveals.

**How to apply.** Repositories return bounded pages (default pagination from
`shared-constants`); DTO arrays/strings carry `.max()`. Sweeps and retention jobs
batch (e.g. file retention deletes in batches of 100). Test with over-limit inputs.

**Related.** [backend-patterns](backend-patterns.md);
[testing/database-testing-standard](../testing/database-testing-standard.md).
