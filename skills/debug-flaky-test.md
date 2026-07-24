---
name: debug-flaky-test
summary: Diagnose and fix a test that passes and fails nondeterministically, rather than retrying it into silence.
task_keywords:
  [flaky, flaky test, intermittent failure, nondeterministic, race condition test, retry test]
applies_to: [all-workspaces]
required_rules: [22-testing-and-coverage]
required_context: [testing-map]
affected_workspaces: [the workspace with the flaky test]
required_tests: [the fixed test itself, deterministic]
required_docs: [none]
validation_lane: cd <workspace> && npm test -- --runInBand (or vitest run --no-file-parallelism)
---

## When to use

A test fails intermittently in CI or locally without a code change. Per
[`../testing/flaky-test-policy.md`](../testing/flaky-test-policy.md), the
default response is root-cause and fix — not retry, not `.skip()`, not
`test.retry()`.

## When NOT to use

If the test fails consistently, this isn't flakiness — it's a real bug or a
real test defect. Use `systematic-debugging` (superpowers skill) instead.

## Read first

- [`../testing/flaky-test-policy.md`](../testing/flaky-test-policy.md)
- [`../memory/known-pitfalls.md`](../memory/known-pitfalls.md) — several
  documented ClawAI flakiness sources (locale-sensitive sorting, unseeded
  randomness, shared DB state) are prior art

## Repository discovery steps

1. Run the test in isolation, repeatedly: `npm test -- -t "<test name>"` in a
   loop. If it never fails in isolation, suspect shared/ordering state.
2. Check for: unseeded `Math.random()`/`Date.now()`, unmocked system clock,
   shared mutable fixtures across tests, unresolved promises (missing
   `await`), real network/timing dependence, locale-sensitive string sorting
   (`localeCompare` — a real bug class caught in this codebase's own tooling).
3. Check for test-order dependence: run the suite with a different seed/order
   if the runner supports it.

## Tests-first plan

Reproduce the flake deterministically first (e.g. force the race with a
delay) — only then is your fix verifiable.

## Implementation steps

1. Root-cause one of: (a) shared state between tests, (b) real time/randomness
   leaking in unmocked, (c) a genuine race condition in the code under test,
   (d) environment-dependent sort order/locale/timezone.
2. Fix at the source: mock the clock, seed randomness, isolate fixtures per
   test, await all promises, use a stable comparator instead of
   locale-dependent sorting.
3. Never paper over with `test.retry()`, `jest.retryTimes()`, or `.skip()` —
   these are explicitly banned in CI per
   [`../testing/flaky-test-policy.md`](../testing/flaky-test-policy.md).
4. Re-run the previously-reproducing loop to confirm it's gone.

## Security considerations

None typically, unless the flake masked a real race condition with
security implications (e.g. a TOCTOU in an authorization check) — if so,
treat it as a security bug, not just a test bug.

## Failure modes

- "Fixing" it by adding a `sleep`/timeout bump — usually hides the race rather
  than resolving it; document why if this is truly the only option.
- Quarantining the test without a tracked follow-up — quarantine requires a
  linked issue and an expiry per the flaky-test policy.

## Validation commands

```
cd <workspace> && npm test -- -t "<test name>"   # loop this locally
cd <workspace> && npm test                        # full suite, order-shuffled if supported
```

## Documentation updates

None, unless the root cause reveals a durable lesson — then add it to
[`../memory/known-pitfalls.md`](../memory/known-pitfalls.md).

## Definition of done

The test passes deterministically across repeated runs with no retry/skip
mechanism, and the root cause is understood and documented if non-obvious.
