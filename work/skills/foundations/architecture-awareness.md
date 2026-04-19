---
id: architecture-awareness
title: Architecture awareness
category: foundations
level: mandatory
depends_on:
  - foundations/repo-understanding
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Architecture awareness

## Purpose

Layer boundaries in a NestJS service are not guidelines — they are contracts. Breaking them is how god-controllers are born and how tests rot. Every agent must know the layers cold.

## When to use

- Any backend code change.
- Any new file added under `apps/claw-*-service/src/`.
- Any code review.

## Inputs required

- `CLAUDE.md` — Backend Architecture Rules
- Target service's `CLAUDE.md`

## Workflow

1. Identify the layer of every file you touch or create:
   - `*.controller.ts` — HTTP only, 3-line methods
   - `*.service.ts` — business logic, max 30 lines/method
   - `*.manager.ts` — complex orchestration, max 80 lines/method
   - `*.repository.ts` — data access, no business logic, no throw
2. Keep each layer's rules in mind:
   - Controllers NEVER try/catch (`GlobalExceptionFilter` handles)
   - Services validate ownership/permissions
   - Repositories return data or `null` — services decide what to do
3. When unsure, split: extract a private method, or move to a Manager.

## Strict rules

- **MUST** respect Controller → Service → Repository / Manager boundaries. **BLOCKER** if violated.
- **MUST NOT** put business logic in controllers.
- **MUST NOT** throw from repositories.
- **MUST NOT** do try/catch in controllers (use `GlobalExceptionFilter`).
- **MUST** use `BusinessException` with a machine-readable `code` for all domain errors.
- **MUST NOT** cross database boundaries — services own their DBs, use HTTP/RabbitMQ.
- **MUST** keep every service method ≤30 lines; if longer, extract to a manager.
- **MUST** keep every manager method ≤80 lines and complexity ≤15.

## Anti-patterns

- Controller with a 40-line method computing things.
- Service that calls another service's Prisma directly.
- Repository that throws `BusinessException` instead of returning `null`.
- Manager that reaches into another service's repository.

## Validation checklist

- [ ] No business logic in any controller
- [ ] No try/catch in controllers
- [ ] Every repository method returns data or null, never throws
- [ ] No service method exceeds 30 lines
- [ ] No manager method exceeds 80 lines or complexity 15
- [ ] No cross-service DB access

## Quality gate

| Check                                                   | Blocker? | Evidence  |
| ------------------------------------------------------- | -------- | --------- |
| `npm run lint` shows no `max-lines-per-function` errors | yes      | CI output |
| Reviewer confirms layer boundaries respected            | yes      | PR review |

## Test requirements

See `testing/unit-testing.md` — each layer has its own test discipline.

## Definition of done

1. Every file follows its layer rules.
2. Lint reports zero layer-boundary errors.
3. PR reviewer explicitly approves layer boundaries.

## Examples

- `apps/claw-ollama-service/src/modules/ollama/services/discovery-job.service.ts` — service orchestrates, delegates to manager.
- `apps/claw-ollama-service/src/modules/ollama/managers/discovery.manager.ts` — manager handles the multi-step pipeline.
- `apps/claw-ollama-service/src/modules/ollama/repositories/discovery-candidate.repository.ts` — pure Prisma, no throw.

## References

- `CLAUDE.md` — Backend Architecture Rules, Extraction Rules
