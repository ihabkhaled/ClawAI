# ClawAI Reviewer Roles

This directory defines the **specialist reviewer roles** for ClawAI's AI-native
engineering operating system. Each file is a self-contained review charter: a
narrow lens an agent (or human) adopts to inspect a change before it merges.

## What these roles are

- **Advisory reviewers, not authors.** A role inspects a diff and returns a
  verdict. It does not write the feature.
- **They block on hard violations.** When a role finds a violation of a
  canonical rule (a "blocker"), it returns `FAIL` and the change does not ship
  until the blocker is resolved.
- **They NEVER override canonical rules.** The authority order is fixed:

  ```
  CLAUDE.md  >  rules/00-master-rules.md  >  the specific rules/*.md file  >  this reviewer role
  ```

  A reviewer may quote, apply, and enforce a canonical rule. It may never
  relax, reinterpret, or waive one. If a reviewer's judgement conflicts with
  `CLAUDE.md` or `rules/00-master-rules.md`, the canonical document wins and the
  reviewer defers.

> Note: some knowledge-tooling files refer to the master rules document as
> `rules/00-non-negotiable-rules.md`; the on-disk file is
> `rules/00-master-rules.md`. Treat them as the same non-negotiable source.

## How roles are invoked

1. **Automatically, via the context resolver.** Running
   `npm run knowledge:context -- --task="<what you are doing>"` classifies the
   task (`tools/knowledge/classify-task.mjs`) and emits a
   **Recommended reviewers** section (`tools/knowledge/context.mjs`). Each name
   maps to a file here — `security-reviewer` → `agents/security-reviewer.md`.
   The task packs (`npm run knowledge:build` → `render-packs.mjs`) link the
   same reviewer set per task pack.
2. **Manually.** Ask an agent to "review as the `<role>`" and it loads that
   file, follows the **Review sequence**, and returns the **Verdict**.
3. **Layered.** Most changes trigger 2–3 roles (e.g. an auth change →
   `security-reviewer` + `authentication-reviewer` + `authorization-idor-reviewer`).
   Run each independently; a change ships only when **every** recommended
   reviewer returns `PASS`.

## Role file structure

Every role file follows the same shape: **Role**, **Mission**, **Inputs**,
**Canonical files**, **Review sequence** (numbered), **Blocking checklist**
(concrete pass/fail items), **Evidence** (what it must cite), and **Verdict**.

## Shared verdict format

Every reviewer returns exactly this envelope:

```
VERDICT: PASS | FAIL
Reviewer: <role-name>
Scope: <files / services reviewed>
Blockers: <n>
  - [BLOCKER] <path:line> — <canonical rule ref> — <what & why>
Advisories: <n>
  - [ADVISORY] <path:line> — <suggestion>
Evidence: <commands run / files cited>
```

`FAIL` iff `Blockers > 0`. Advisories never block.

## Role index

| Role                                                                | Lens                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| [monorepo-architect](monorepo-architect.md)                         | Workspace boundaries, shared packages, dependency direction |
| [backend-architect](backend-architect.md)                           | NestJS layering & module design                             |
| [frontend-architect](frontend-architect.md)                         | Next.js page→hook→repository architecture                   |
| [microservice-boundary-reviewer](microservice-boundary-reviewer.md) | Service ownership, no cross-DB, HTTP/RabbitMQ seams         |
| [backend-code-reviewer](backend-code-reviewer.md)                   | Backend code quality, ESLint, method size, extraction       |
| [frontend-code-reviewer](frontend-code-reviewer.md)                 | TSX render-only, shadcn/ui, hook rules                      |
| [security-reviewer](security-reviewer.md)                           | Secrets, encryption, input validation, OWASP                |
| [authentication-reviewer](authentication-reviewer.md)               | JWT, refresh rotation, argon2, sessions                     |
| [authorization-idor-reviewer](authorization-idor-reviewer.md)       | RBAC, ownership checks, IDOR, plan gates                    |
| [database-reviewer](database-reviewer.md)                           | Prisma/Mongoose schema, repository discipline               |
| [migration-reviewer](migration-reviewer.md)                         | Additive/reversible migrations, backfills                   |
| [rabbitmq-event-reviewer](rabbitmq-event-reviewer.md)               | Event contracts, producers/consumers, DLQ                   |
| [reliability-engineer](reliability-engineer.md)                     | Failure paths, retries, idempotency, SSE                    |
| [observability-reviewer](observability-reviewer.md)                 | Structured logging coverage, audit, correlation             |
| [performance-reviewer](performance-reviewer.md)                     | N+1, budgets, caching, payload size                         |
| [test-engineer](test-engineer.md)                                   | TDD, coverage ≥92%, QA scripts, fuzz                        |
| [api-contract-reviewer](api-contract-reviewer.md)                   | DTO/Zod contracts, FE/BE field parity, nginx routes         |
| [accessibility-reviewer](accessibility-reviewer.md)                 | a11y, focus, dark mode, keyboard                            |
| [i18n-reviewer](i18n-reviewer.md)                                   | 9 locales, no English leakage, RTL                          |
| [infrastructure-reviewer](infrastructure-reviewer.md)               | Docker, nginx, env, CI, health wiring                       |
| [release-gatekeeper](release-gatekeeper.md)                         | Final gate: all blockers clear, preflight green             |
| [documentation-curator](documentation-curator.md)                   | docs/, CLAUDE.md, service guides                            |
| [knowledge-system-maintainer](knowledge-system-maintainer.md)       | Manifests, packs, verify, generated files                   |
| [ai-context-reviewer](ai-context-reviewer.md)                       | CLAUDE.md/CODEX.md/cursor.md parity, agent context          |

## Canonical sources every reviewer defers to

- `CLAUDE.md` (root) — architecture, rules, checklists, mindsets
- `rules/00-master-rules.md` — the 8 absolute blockers + reading order
- `rules/01-planning-rules.md` … `rules/09-refactor-rules.md` — per-domain rules
- `skills/` — operational runbooks
- `docs/` — architecture, ADRs, QE standards
