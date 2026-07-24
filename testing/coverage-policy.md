# Coverage Policy

Coverage is proportional to blast radius. High enough everywhere to prove edge cases
were considered; **exhaustive** on the pure logic where a wrong branch is catastrophic.

## Targets

| Scope                                                  | statements | lines | functions |    branches     |
| ------------------------------------------------------ | :--------: | :---: | :-------: | :-------------: |
| **Global** (every service + frontend + shared package) |   ≥ 95%    | ≥ 95% |   ≥ 95%   |      ≥ 90%      |
| **Pure critical logic** (see list)                     |    100%    | 100%  |   100%    | **100% branch** |

**Pure critical logic** (no I/O, high blast radius) — must reach 100% branch:

- Zod **schemas / DTO validators**
- **Mappers** (BE↔wire, entity↔DTO, event payload builders)
- **Permission / ownership decision** functions
- **Query-key builders** (frontend TanStack Query keys)
- **Event-payload validators** (RabbitMQ consumers)

These are cheap to test exhaustively and expensive to get wrong (an untested branch here
is a data leak, a broken cache, or a swallowed event). See
[`../memory/testing-strategy.md`](../memory/testing-strategy.md).

## Enforcement

- Each `jest.config.ts` / `vitest.config.ts` sets `coverageThreshold` to the global bar.
  CI runs `npm run test -- --coverage`; a metric below threshold fails the build.
- Pure-critical modules that must hit 100% branch carry their own stricter per-path
  threshold (a scoped `coverageThreshold` entry) so a regression there fails locally.
- Coverage is **ratcheted, never lowered.** If a change drops a folder below its
  threshold, fix the test gap before merging — never edit the threshold down to land the
  change ([`../memory/testing-strategy.md`](../memory/testing-strategy.md)).

## Coverage is a proxy, not the goal

High coverage of trivial glue is not quality; it can hide untested risk. The number is a
proxy for "did you think about the edge cases?" — pair it with **risk-based design**
([testing-strategy](testing-strategy.md)) and reject the fixed-count-quota anti-pattern.
Skip only trivial getters/setters and framework boilerplate.

## Banned coverage-gaming

- Lowering a `coverageThreshold` to land a change.
- `.toBeDefined()`-only assertions to inflate line coverage without asserting behavior.
- `xit` / `.skip` to dodge a failing-but-real test.
- Excluding a real logic file from coverage collection to hide a gap.

## Reporting

Coverage is reported per touched workspace in the affected-workspace gate
([quality-gates](quality-gates.md)) and in full at `npm run release:preflight`. New code
in a change should not drop the workspace's existing coverage.

## Related

- [Quality gates](quality-gates.md) · [Unit testing](unit-testing-standard.md) ·
  ADR-063 coverage-targets · [`../memory/testing-strategy.md`](../memory/testing-strategy.md)
