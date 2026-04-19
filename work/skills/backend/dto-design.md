---
id: dto-design
title: DTO design
category: backend
level: mandatory
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# DTO design

## Purpose

Every boundary input must be validated. Zod schemas are the wall. Missing `.max()` on strings is how DoS ships.

## Workflow

1. Create `src/modules/<domain>/dto/<name>.dto.ts`.
2. Export both the Zod schema and the inferred type: `export type X = z.infer<typeof xSchema>;`
3. Every `z.string()` gets `.max(N)` — pick N per field, never omit.
4. Every `z.array()` gets `.max(N)`.
5. Use `z.nativeEnum(…)` for enum fields, never string unions.
6. Use `z.coerce.number()` for query-string numbers.
7. Apply via `@Body(new ZodValidationPipe(schema))` or `@Query(...)`.

## Strict rules

- **MUST** bound every string and array length. **BLOCKER** if unbounded.
- **MUST** use `z.nativeEnum` for enum values.
- **MUST** export both schema and type.
- **MUST NOT** define DTO types inline in controllers.

## Anti-patterns

- `z.string()` with no `.max()` → DoS vector.
- `z.enum(['A', 'B'])` instead of nativeEnum → drifts from Prisma.
- Validation in service layer, not at controller boundary.

## Validation checklist

- [ ] Every string has `.max()`
- [ ] Every array has `.max()`
- [ ] Enum fields use `z.nativeEnum`
- [ ] Schema + type both exported
- [ ] Applied via `ZodValidationPipe`

## Quality gate

| Check                      | Blocker? | Evidence  |
| -------------------------- | -------- | --------- |
| QA 400 on oversized input  | yes      | QA script |
| QA 400 on missing required | yes      | QA script |

## Definition of done

1. Schema + type exported.
2. Bounded.
3. Applied at controller.
4. QA asserts 400 paths.

## Examples

- `apps/claw-ollama-service/src/modules/ollama/dto/discovery-source.dto.ts`

## References

- `CLAUDE.md` — DTO/Validation Rules
- `security/input-validation.md`
