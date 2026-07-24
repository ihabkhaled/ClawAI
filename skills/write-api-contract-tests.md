---
name: write-api-contract-tests
summary: Assert that a service's request/response DTOs match its documented Zod schema and that producers/consumers of a shared type stay in sync.
task_keywords:
  [contract test, dto contract, schema test, api contract, zod schema test, breaking change]
applies_to: [nestjs-service, shared-packages]
required_rules: [11-dtos-and-validation, 14-shared-packages]
required_context: [declaration-ownership-map, package-boundaries]
affected_workspaces: [the service under test, packages/shared-types if shared]
required_tests: [contract]
required_docs: [none]
validation_lane: cd apps/<service> && npm test
---

## When to use

When a DTO/schema is consumed by more than one place (another service via
HTTP, the frontend, or a shared package) and you need to prove a change to it
doesn't silently break a consumer. See
[`../testing/contract-testing-standard.md`](../testing/contract-testing-standard.md).

## When NOT to use

For a DTO used only within one service and not exposed over HTTP or shared —
a unit test on the Zod schema (`write-unit-tests.md`) is enough.

## Read first

- [`../testing/contract-testing-standard.md`](../testing/contract-testing-standard.md)
- [`../rules/11-dtos-and-validation.md`](../rules/11-dtos-and-validation.md)
- `.ai/manifests/api-endpoints.json` for the current documented shape

## Tests-first plan

Write the contract test against the CURRENT schema before changing it, so a
breaking change fails the test first and the diff shows exactly what moved.

## Implementation steps

1. Import the Zod schema directly (never re-declare it in the test).
2. Assert `.parse()` succeeds for a valid fixture and `.safeParse()` fails with
   the expected issue path for each invalid boundary (missing required field,
   wrong type, over `.max()` length, over `.max()` array size).
3. For a DTO also typed on the frontend, assert field names match verbatim —
   this is the exact bug class documented in
   [`../memory/frontend-patterns.md`](../memory/frontend-patterns.md) (FE type
   field names must mirror BE DTO names).
4. For a shared event payload, assert against the `packages/shared-types`
   definition, not a local copy.

## Security considerations

Contract tests are a good place to assert a response schema does NOT include
sensitive fields (`passwordHash`, `encryptedConfig`, `refreshToken`) — treat
their absence as part of the contract.

## Failure modes

- Testing the DTO in isolation but never asserting it against the actual
  controller's declared response type, letting them drift.
- Skipping the "field renamed" case — the single most common contract break in
  this codebase (see `memory/frontend-patterns.md`).

## Validation commands

```
cd apps/<service> && npm run typecheck && npm test
```

## Documentation updates

Update `docs/12-reference/api-reference.md` if the public contract changed.

## Definition of done

Every cross-boundary DTO/schema has a test that would fail if a field were
renamed, removed, or its type/constraint changed without updating consumers.
