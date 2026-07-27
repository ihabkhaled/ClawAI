# 22 — Testing and Coverage

## Purpose

Nothing ships untested. Unit tests are the floor; QA scripts, DB verification, and
log inspection are the ceiling. Coverage is a proxy for "did you actually think
about the edge cases?" — and it is ratcheted, never lowered.

## Applies to

Every workspace. Backend uses Jest (`*.spec.ts`), frontend uses Vitest
(`*.test.ts`/`*.spec.ts`), E2E uses Playwright. Tests co-locate in `__tests__/`.

## Mandatory rules

1. **A test for every change** — every new function, service method, DTO, hook, and
   component gets a test. TDD preferred: failing test before implementation.
2. **≥ 92 % coverage** on statements/branches/functions/lines per service and the
   frontend, enforced via `coverageThreshold` and `npm run test -- --coverage`.
   Do not lower a threshold to land a change.
3. **Cover the edges, not just the happy path** — boundary, null, empty, overflow,
   duplicate, concurrent, malformed inputs. Every manager `catch` branch is tested.
4. **DTO fuzz tests** for every Zod schema (valid + boundary + invalid + null/empty/overflow).
5. **Mock at boundaries only** — DB, HTTP, RabbitMQ, ClamAV, Ollama. Never mock the
   unit under test. No `.toBeDefined()`-only assertions; no `xit`/`xdescribe`/`.skip()`.
6. **A QA script per feature** — `qa/test-<feature>.sh` (gitignored) covering auth,
   every endpoint (happy + 400/401/403/404/409/422), DTO validation, DB verification
   via `psql`/mongo, and a Docker-log check for `UnhandledPromiseRejection`/`FATAL`.
   0 failures required.
7. **Verify persistence and logs, not just the response** — GET after write, query
   the DB, scan container logs. UI truth ≠ DB truth ≠ fetch truth.
8. **Assert exact request contracts across frontend and backend.** For every
   frontend mutation, test the serialized method, path, headers, and JSON body.
   Pair it with backend DTO/controller tests for the same field names, optionality,
   null behavior, and validation limits. A UI test that only asserts "fetch was
   called" does not prove the two workspaces agree.

## Prohibited patterns

- Shipping code with no accompanying test.
- Lowering `coverageThreshold` to pass CI.
- `expect(x).toBeDefined()` as the only assertion.
- `xit`/`.skip()` / mocking the unit under test.
- Declaring a feature done without running its `qa/` script.
- Testing a frontend mutation and backend endpoint independently without an exact
  request-body contract assertion at their boundary.

## Correct pattern

```
apps/claw-memory-service/src/modules/memory/__tests__/memory.service.spec.ts
apps/claw-memory-service/src/modules/memory/dto/__tests__/create-memory.dto.spec.ts   # fuzz
qa/test-memory-service.sh   # auth → endpoints → psql verify → log scan → PASS/FAIL summary
```

## Enforcement

- **CI job** — `test` job runs per-workspace with `--coverage`; threshold gate.
- **Unit test config** — `jest.config.ts` / `vitest.config.ts` `coverageThreshold`.
- **Review checklist** — QA script existence + 0-failure evidence in
  `.claude/Integrations/<feature>__QA_output.md`.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md)
- [07-database-toolkit](../skills/07-database-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Phase 9: Real QA Execution", "Test-coverage flagship mindset".

## Definition of done

- [ ] New/changed behavior tested; coverage ≥ 92 %, not lowered.
- [ ] Edge/boundary/error paths + DTO fuzz covered.
- [ ] Frontend method/path/headers/body exactly match the backend DTO contract.
- [ ] `qa/test-<feature>.sh` run with 0 failures; DB + logs verified.
