---
name: create-dto
summary: Write a Zod DTO schema with mandatory .max() bounds, exporting both schema and inferred type.
task_keywords:
  [
    dto,
    zod schema,
    validation,
    input validation,
    z.string max,
    z.array max,
    inferred type,
    request body validation,
    boundary validation,
  ]
applies_to: [backend, apps/claw-<service>-service/src/modules/<domain>/dto]
required_rules: [02-backend-rules, 08-security-rules, 04-testing-rules]
required_context: [ai-context-pack]
affected_workspaces: [apps/claw-<service>-service]
required_tests: [dto fuzz spec (valid + boundary + invalid + null/empty/overflow)]
required_docs: [docs/04-backend/service-guide-<service>.md]
validation_lane: cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Create a DTO

DTOs are Zod schemas that validate every input at the HTTP and RabbitMQ boundaries. Each schema lives in `src/modules/<domain>/dto/<name>.dto.ts` and exports BOTH the schema and its inferred type.

## When to use

- Adding or changing a request body, query, or event payload shape.
- Any new input that crosses a system boundary and must be validated.

## When NOT to use

- Internal-only value objects with no external input → put them in `types/`.
- class-validator is never used in this codebase — always Zod.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/02-backend-rules.md`](../rules/02-backend-rules.md) — DTO / Validation Rules.
- [`../docs/04-backend/dto-validation-patterns.md`](../docs/04-backend/dto-validation-patterns.md) if present, else a sibling `dto/`.

## Repository discovery steps

1. Read a sibling `*.dto.ts` for the export convention (`export const XSchema = z.object({...})` + `export type X = z.infer<typeof XSchema>`).
2. Confirm which enum values are valid — reference enums from `src/common/enums/`, never string-literal unions.
3. Check the shared Zod validation pipe the controllers use.

## Tests-first plan

- Fuzz test per schema: a valid object; a boundary object at each `.max()`; over-length/over-size (must reject); null/empty/missing-required; wrong enum value.
- Assert the inferred type compiles against a valid fixture.

## Implementation steps

1. Create `dto/<name>.dto.ts`.
2. Define `z.object({...})`. Every `z.string()` gets `.max(N)`; every `z.array(...)` gets `.max(N)`.
3. Use enum-backed fields: `z.nativeEnum(MyEnum)` — no `'a' | 'b'` unions.
4. Export the schema AND `export type <Name> = z.infer<typeof <Name>Schema>`.
5. Do not define types/enums inline in a logic file — the DTO file is the home for the schema + inferred type only.
6. Wire the schema into the controller via the shared Zod validation pipe.

## Security considerations

- `.max()` on strings/arrays prevents oversized-payload DoS (security-rules Input Validation).
- Validate RabbitMQ event payloads with a DTO too — never trust event data (see [`./add-event-consumer.md`](./add-event-consumer.md)).
- Reject unknown fields where the schema should be strict; if `.strict()`, keep the FE filter type an exact intersection.

## Failure modes

- Missing `.max()` → ESLint/security-review blocker and unbounded input.
- String-literal union instead of enum → banned pattern.
- Exporting only the type or only the schema → consumers can't validate or type consistently.

## Validation commands

```bash
cd apps/claw-<service>-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- If the DTO changes an endpoint contract, update `docs/04-backend/service-guide-<service>.md` and any FE type in `apps/claw-frontend/src/types/`.

## Definition of done

- Every string/array bounded, enum-backed fields, schema + type exported, fuzz tests green, FE types synced if the contract changed.
