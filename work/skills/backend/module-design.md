---
id: module-design
title: Module design
category: backend
level: mandatory
depends_on:
  - foundations/architecture-awareness
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Module design

## Purpose

A NestJS module is a unit of feature cohesion. Wrong module design leads to circular deps, broken DI, and god modules.

## Workflow

1. Scope the module to a single feature domain (e.g. `AgentModule` for desktop agent, `DiscoveryModule` for model discovery).
2. Co-locate: controllers, services, managers, repositories, DTOs, types.
3. Export only what other modules need (keep internals private).
4. Register providers explicitly in `@Module` — no dynamic provider magic.
5. Add module to `AppModule`.

## Strict rules

- **MUST** co-locate feature files under one module folder.
- **MUST** register every new provider in the module's `providers` array.
- **MUST** export only intentional public surfaces.
- **MUST NOT** create a "UtilityModule" or "SharedModule" dumping ground.

## Anti-patterns

- One giant `CoreModule` with everything.
- Circular module imports.
- Unregistered providers (DI fails at runtime).

## Validation checklist

- [ ] Single feature domain
- [ ] All files co-located
- [ ] All providers registered
- [ ] No circular imports

## Quality gate

| Check                        | Blocker? | Evidence       |
| ---------------------------- | -------- | -------------- |
| Module compiles & tests pass | yes      | `npm run test` |
| DI resolves                  | yes      | Service starts |

## Definition of done

1. Module registered in `AppModule`.
2. All providers listed.
3. Tests pass.

## Examples

- `apps/claw-ollama-service/src/modules/ollama/ollama.module.ts`
