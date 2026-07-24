# Architecture Lessons

Durable lessons about system shape. These complement the formal ADRs in
[`../docs/13-adr/`](../docs/13-adr/) — the ADRs record the decision, these entries
record what we _learned_ living with it. See [README](README.md) for format.

---

### Database-per-service is a wall, not a fence — plan the crossing up front (2026-07-24)

**What happened.** Each of the 17 services owns its own database (PostgreSQL+Prisma;
audit/client-logs/server-logs on Mongo). Features that "just need one more field
from another service" repeatedly discovered there is no join across the boundary.

**The durable lesson.** With database-per-service, cross-context data is a _protocol_
problem, not a query problem. The boundary is the point — it buys failure isolation
and independent deploys, but every read across it costs an HTTP call or a RabbitMQ
event you have to design.

**How to apply.** When impact-mapping a feature, list every cross-service datum it
needs and decide _per datum_: synchronous HTTP (need it now, tolerate the coupling)
or async event (can be eventually consistent). Never reach into another service's DB.

**Related.** ADR-002 database-per-service; [rabbitmq-lessons](rabbitmq-lessons.md);
[backend-patterns](backend-patterns.md).

---

### Extend the existing layer before building a parallel one (2026-07-24, from 2026-05-30 rule)

**What happened.** New capabilities (local-runtime rich-progress, the desktop-agent
capability framework) were tempted toward new services / new tables that would
re-implement 80% of an existing layer (the SSE stream channel, the `AccessPolicy`
engine). Each time, extending the existing seam won.

**The durable lesson.** When the codebase already solves the _problem class_
(streaming, RBAC, event bus, ret[ry] http-client, repositories), a second system is
mostly duplicated surface area plus a new divergence risk. One wider contract beats N
narrow parallel ones.

**How to apply.** Before writing "a new service that does X but for Y," find the seam
in the existing X-doer that lets it also do Y. Acceptable reasons to go parallel:
existing system is deprecating, genuinely incompatible constraints, or accommodating
Y would double the existing surface — all three get challenged in review.

**Related.** `CLAUDE.md` → mindset 26 "Extend-don't-parallelize";
ADR-058 compact-ai-routers.

---

### A canonical authority must have exactly one source of truth (2026-07-24)

**What happened.** Guidance for AI agents lived in three large mirrored files
(`CLAUDE.md`, `CODEX.md`, `cursor.md`) sharing ~170 identical headings. They drifted:
one recommended a bypass another forbade, sizes diverged (153 KB vs 119 KB vs 19 KB).

**The durable lesson.** Mirrored documents are guaranteed to diverge; the cost is
paid later as contradictory guidance. Authority should be single-sourced, with thin
routers pointing back to it rather than copies.

**How to apply.** Keep one canonical body of rules/knowledge. Per-tool entrypoints
should be _compact routers_ that reference the canonical source, not full mirrors.
Generate derived artifacts; never hand-maintain parallel copies.

**Related.** ADR-055 canonical-ai-authority-hierarchy; ADR-056 generated-ai-knowledge-layer;
ADR-058 compact-ai-routers.

---

### Deterministic beats "ask the model" for anything on the critical path (2026-07-24)

**What happened.** Context/knowledge resolution for agents was considered as an
LLM-driven step. An LLM call there adds latency, cost, non-determinism, and an
external dependency to a path that runs on every task.

**The durable lesson.** If a step must be fast, reproducible, and testable, it must be
deterministic code, not a model call. Reserve model calls for genuinely fuzzy
judgment, and make even those replaceable by a heuristic fallback.

**How to apply.** Build the context resolver as pure, deterministic code with 100%
branch coverage on its decision logic. No network, no model, in the resolution path.
Where a model _is_ used (routing AUTO mode), always ship a heuristic fallback so the
system degrades instead of failing when the model is unavailable.

**Related.** ADR-057 deterministic-context-resolver; [testing-strategy](testing-strategy.md).
