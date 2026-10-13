# Coverage Policy

Coverage is proportional to blast radius. High enough everywhere to prove edge cases
were considered; **exhaustive** on the pure logic where a wrong branch is catastrophic.

## Targets

The enforced numbers — declared thresholds, the floors CI enforces, the
changed-lines target and the dated path to 92 % — live in one place:
[rules/22](../rules/22-testing-and-coverage.md) rule 2, backed by
[`tools/coverage/thresholds.json`](../tools/coverage/thresholds.json). This page
does not restate them.

| Scope                              | statements | lines | functions |    branches     |
| ---------------------------------- | :--------: | :---: | :-------: | :-------------: |
| **Pure critical logic** (see list) |    100%    | 100%  |   100%    | **100% branch** |

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

- CI runs every workspace suite with `--coverage` and the workspace's floor
  (rules/22 rule 2); a metric below it fails the build, and the lines a pull
  request changes must meet `changedLines` on their own.
- Pure-critical modules that must hit 100% branch carry their own stricter per-path
  entry under vitest `coverage.thresholds` (a glob key) so a regression there fails.
- Coverage is **ratcheted, never lowered.** If a change drops a folder below its
  threshold, fix the test gap before merging — never edit the threshold down to land the
  change ([`../memory/testing-strategy.md`](../memory/testing-strategy.md)).

## Coverage is a proxy, not the goal

High coverage of trivial glue is not quality; it can hide untested risk. The number is a
proxy for "did you think about the edge cases?" — pair it with **risk-based design**
([testing-strategy](testing-strategy.md)) and reject the fixed-count-quota anti-pattern.
Skip only trivial getters/setters and framework boilerplate.

## Banned coverage-gaming

- Lowering a vitest `coverage.thresholds` value, a floor or `changedLines` to land a change.
- `.toBeDefined()`-only assertions to inflate line coverage without asserting behavior.
- `xit` / `.skip` to dodge a failing-but-real test.
- Excluding a real logic file from coverage collection to hide a gap.

## Reporting

Coverage is reported per workspace by the CI `test` job (and `coverage-merge` for a sharded
suite); `npm run coverage:measure` reports it locally ([quality-gates](quality-gates.md)). New code
in a change should not drop the workspace's existing coverage.

## Related

- [Quality gates](quality-gates.md) · [Unit testing](unit-testing-standard.md) ·
  ADR-063 coverage-targets · [`../memory/testing-strategy.md`](../memory/testing-strategy.md)
