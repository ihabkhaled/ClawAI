> **Canonical source:** `memory/README.md`

# ClawAI Engineering Memory

Durable, dated, abstracted lessons learned building and operating the ClawAI
monorepo (17 NestJS services + Next.js frontend + 6 shared packages).

## Memory vs. Rules vs. Skills

| Layer      | Location  | Nature                                                         | Answers                                   |
| ---------- | --------- | -------------------------------------------------------------- | ----------------------------------------- |
| **Rules**  | `rules/`  | Non-negotiable, enforced, present-tense mandates               | "What MUST I do?"                         |
| **Skills** | `skills/` | Operational runbooks / how-to procedures                       | "How do I do X?"                          |
| **Memory** | `memory/` | Post-mortem lessons — why a rule exists, what pain produced it | "Why is it this way? What bit us before?" |

A **rule** says _"SSE routes MUST set `@SkipLogging()` and nginx `proxy_buffering off`."_
The corresponding **memory** entry explains _what crashed, on what date, and the
underlying principle so the lesson transfers to the next long-lived-connection
feature even if the specific rule is forgotten._

Memory is where a rule comes to be justified. If you are tempted to relax a rule,
read its memory entry first — it usually records the exact production incident the
rule prevents.

## Entry format

Every memory entry uses this shape:

```
### <short lesson title> (YYYY-MM-DD)

**What happened.** The concrete incident or observation, abstracted enough to
transfer. No secrets, no PII, no customer names.

**The durable lesson.** The generalizable principle.

**How to apply.** The action to take next time you're in the same situation.

**Related.** Links to the enforcing rule / skill / ADR / doc.
```

Dates are the date the lesson was captured or the incident occurred. When a known
earlier dated incident is referenced (e.g. the `WebhookDelivery` field-mirroring
bug of 2026-05-10), keep that original date.

## Freshness & supersede policy

- Memory is **append-mostly**. Prefer adding a new dated entry over editing an old
  one, so the timeline of what we learned stays legible.
- When a newer lesson **supersedes** an older one, do not delete the old entry.
  Add a `> Superseded YYYY-MM-DD by <link>` note at the top of the stale entry and
  write the replacement below it. History is evidence.
- An entry older than ~12 months should be **re-validated** the next time you touch
  its area: is it still true against the current toolchain (tsgo, Prisma 7, NestJS
  11, Next 16)? If yes, leave it. If no, supersede it.
- If a memory entry contradicts a current rule, that is a bug in one of them — open
  an issue and reconcile; do not silently ignore either.

## Index

- [Known Pitfalls](https://github.com/ihabkhaled/ClawAI/blob/main/memory/known-pitfalls.md) — the recurring traps (SSE, polling-on-error,
  authed SSE, i18n, FE/BE type mirroring, `localeCompare`).
- [Architecture Decisions](https://github.com/ihabkhaled/ClawAI/blob/main/memory/architecture-decisions.md)
- [Testing Strategy](https://github.com/ihabkhaled/ClawAI/blob/main/memory/testing-strategy.md)
- [Frontend Patterns](https://github.com/ihabkhaled/ClawAI/blob/main/memory/frontend-patterns.md)
- [Backend Patterns](https://github.com/ihabkhaled/ClawAI/blob/main/memory/backend-patterns.md)
- [Authentication Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/authentication-lessons.md)
- [Authorization Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/authorization-lessons.md)
- [RabbitMQ Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/rabbitmq-lessons.md)
- [Database Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/database-lessons.md)
- [Deployment Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/deployment-lessons.md)
- [Observability Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/observability-lessons.md)
- [Documentation Lessons](https://github.com/ihabkhaled/ClawAI/blob/main/memory/documentation-lessons.md)

## Related

- Testing standards: [`../testing/README.md`](https://github.com/ihabkhaled/ClawAI/blob/main/testing/README.md)
- SDLC artifact template: [`../docs/features/_template/README.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/features/_template/README.md)
- Exceptions register: [`../docs/exceptions/EXCEPTIONS.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/exceptions/EXCEPTIONS.md)

