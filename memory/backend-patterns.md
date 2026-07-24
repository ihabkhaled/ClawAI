# Backend Lessons

Durable backend lessons (NestJS 11, Prisma 7, Zod 4, controller→service→repository/
manager layering). See [README](README.md) for format.

---

### The layer boundaries encode where each kind of bug can live (2026-07-24)

**What happened.** Business logic in controllers, Prisma calls outside repositories,
and `throw` inside repositories repeatedly produced code that was hard to test and
where errors surfaced in the wrong place.

**The durable lesson.** The controller→service→repository/manager split isn't
ceremony — it localizes concerns so a class of bug has exactly one place it can be.
Ownership/permission bugs live in services; data-shape bugs in repositories; input
bugs at the DTO. Blur the layers and every bug can be anywhere.

**How to apply.** Controllers: 3-line methods (extract, call one service method,
return), no try/catch, no throw. Services: ownership/permission checks, event
publishing, ≤50 lines/method. Repositories: pure data access, return data or null,
never throw. Managers: complex orchestration, ≤80 lines/method.

**Related.** `CLAUDE.md` → Backend Architecture Rules;
[testing/unit-testing-standard](../testing/unit-testing-standard.md).

---

### Every Zod string/array needs an explicit bound (2026-07-24)

**What happened.** Unbounded `z.string()` / `z.array()` accepted arbitrarily large
inputs — a memory-exhaustion and abuse vector that no test caught because the happy
path used small inputs.

**The durable lesson.** Validation that omits size limits validates _shape_ but not
_safety_. An absent bound is an accepted attack.

**How to apply.** Every `z.string()` has `.max()`; every `z.array()` has `.max()`.
DTO fuzz tests cover valid + boundary + over-limit + null/empty. Export both schema
and inferred type from `src/modules/<domain>/dto/`.

**Related.** ADR-004 zod-over-class-validator;
[testing/unit-testing-standard](../testing/unit-testing-standard.md).

---

### Errors carry machine-readable codes; never swallow (2026-07-24)

**What happened.** Silent catches and stringly-typed errors made failures
unobservable and untranslatable on the frontend.

**The durable lesson.** An error without a stable code is un-actionable — the FE
can't branch on it, i18n can't localize it, and logs can't aggregate it. Swallowing
one hides a real failure until it becomes a mystery outage.

**How to apply.** Use `BusinessException` with a `code` string; `EntityNotFound`
for missing rows; `HttpStatus.FORBIDDEN` for authz. Always log then rethrow or
handle explicitly. Every public method: `debug` on entry, `error` in every catch,
`info` on side effects, `warn` on fallback.

**Related.** [observability-lessons](observability-lessons.md);
[authorization-lessons](authorization-lessons.md).

---

### Extract inline declarations — the linter guards testability, not neatness (2026-07-24)

**What happened.** Inline `type`/`interface`/`enum`/`const`/`function` in logic
files, and string-literal unions for domain values, kept reappearing.

**The durable lesson.** Extraction isn't cosmetic: an inline type can't be imported
by a test or reused; a string-literal union invites raw-string comparisons that
bypass enum safety. The rule protects the ability to test and reuse.

**How to apply.** Extract per the backend extraction table; domain values are enums
in `src/common/enums/`. Only exception: the standard NestJS `private readonly
logger = new Logger(...)`.

**Related.** ADR-012 no-inline-declarations; `CLAUDE.md` → Extraction Rules.

---

### Cross-service reads are HTTP or events — never a foreign DB (2026-07-24)

**What happened.** Features wanted data owned by another service. There is no shared
DB, so the only correct paths are a synchronous internal HTTP call or a RabbitMQ
event.

**The durable lesson.** The service boundary is a hard wall; pick the crossing
consciously per datum (sync HTTP when you need it now; event when eventual
consistency is fine).

**How to apply.** During impact analysis, list each cross-service datum and its
transport. See [architecture-decisions](architecture-decisions.md) and
[rabbitmq-lessons](rabbitmq-lessons.md).
