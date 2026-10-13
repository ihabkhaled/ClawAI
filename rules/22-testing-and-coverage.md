# 22 — Testing and Coverage

## Purpose

Nothing ships untested. Unit tests are the floor; QA scripts, DB verification, and
log inspection are the ceiling. Coverage is a proxy for "did you actually think
about the edge cases?" — and it is ratcheted, never lowered.

## Applies to

Every workspace. Every workspace uses Vitest (ADR-099); backend `*.spec.ts`, frontend
(`*.test.ts`/`*.spec.ts`), E2E uses Playwright. Tests co-locate in `__tests__/`.

## Mandatory rules

1. **A test for every change** — every new function, service method, DTO, hook, and
   component gets a test. TDD preferred: failing test before implementation.
2. **Coverage is a ratchet with a dated path to 92 %.** The single home for the
   numbers is [`tools/coverage/thresholds.json`](../tools/coverage/thresholds.json):
   - **declared** — each workspace's vitest `coverage.thresholds` (the target).
     Never lowered.
   - **floor** — what CI enforces on every run: the declared value once the suite
     meets it, otherwise the coverage measured when the floor was set (minus one
     point for Linux/Windows drift). A floor only rises
     (`npm run coverage:raise-floors` after `npm run coverage:measure`).
   - **changedLines** — every line a pull request adds or changes in workspace
     source must be covered at this rate on its own, whatever the workspace
     average (currently 80 %).

   Until 2026-10-13 CI never ran `--coverage`, so the declared values were never
   enforced; on that date 17 of 27 suites measured below their own. The path
   (proposed with the gates overhaul, owner to confirm): every floor reaches its
   declared value by **2026-12-31**; `changedLines` rises to 92 by **2027-03-31**;
   every declared threshold reaches 92 on all four metrics by **2027-06-30**.
   CI fails when any declared value, floor or `changedLines` goes down.

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
- A workspace with source and no spec (`knowledge:verify` fails it; test scripts no
  longer pass `--passWithNoTests`).
- Lowering a vitest `coverage.thresholds` value, a floor or `changedLines`.
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

- **CI `test` job** — every workspace suite runs with `--coverage` and the floor
  from `tools/coverage/thresholds.mjs flags`; a sharded suite (the frontend) is
  merged in `coverage-merge`, which enforces its floor on the whole.
- **CI `changed-lines-coverage`** (pull requests) — `tools/coverage/changed-lines.mjs`.
- **CI `policy`** — `tools/coverage/thresholds.mjs check --base=<base>`: nothing
  went down.
- **Unit test config** — `vitest.config.ts` `test.coverage.thresholds` (declared).
- **Tests** — `tools/__tests__/ci-gates.test.mjs`.
- **Review checklist** — the batch's `docs/qa-evidence/` record (rules/60) carries
  the QA-script evidence.

## Related skills

- [05-qa-toolkit](../skills/05-qa-toolkit.md)
- [07-database-toolkit](../skills/07-database-toolkit.md)

## Related context

- Root `CLAUDE.md` — "Phase 9: Real QA Execution", "Test-coverage flagship mindset".

## Definition of done

- [ ] New/changed behavior tested; changed lines meet `changedLines`; no declared
      threshold or floor lowered.
- [ ] Edge/boundary/error paths + DTO fuzz covered.
- [ ] Frontend method/path/headers/body exactly match the backend DTO contract.
- [ ] `qa/test-<feature>.sh` run with 0 failures; DB + logs verified.
