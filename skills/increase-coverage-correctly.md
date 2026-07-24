---
name: increase-coverage-correctly
summary: Raise a workspace's test coverage toward the repository target by testing real behaviour and branches — never by padding with meaningless assertions.
task_keywords: [coverage, increase coverage, coverage threshold, uncovered branch, test:cov]
applies_to: [all-workspaces]
required_rules: [22-testing-and-coverage]
required_context: [testing-map]
affected_workspaces: [the workspace being raised]
required_tests: [unit, integration]
required_docs: [none]
validation_lane: cd <workspace> && npm run test:cov
---

## When to use

A workspace's coverage is below the target in
[`../testing/coverage-policy.md`](../testing/coverage-policy.md), or your
change dropped it. Use this skill to close the gap correctly, not
mechanically.

## When NOT to use

Do not use this to chase 100% on generated code, `index.ts` re-export barrels,
or trivial getters — exclude them explicitly and document why, per the
coverage policy's exclusion rules, rather than writing tests that assert
nothing.

## Read first

- [`../testing/coverage-policy.md`](../testing/coverage-policy.md)
- [`../rules/22-testing-and-coverage.md`](../rules/22-testing-and-coverage.md)

## Tests-first plan

1. Run `npm run test:cov` and open the uncovered-lines report.
2. For each uncovered branch, ask: what real input/state reaches this branch?
   Write a test for THAT, not a test that merely executes the line.

## Implementation steps

1. Identify uncovered branches (not just lines) — branch coverage is the
   meaningful metric per the coverage policy.
2. Prioritize: error paths (every `catch` block), boundary conditions
   (empty/null/max-length/zero), and permission/ownership decision branches
   first — these are the highest-value, highest-risk gaps.
3. Write a behavioural assertion for each: given this input, the function
   returns/throws/publishes X — not `expect(fn).toBeDefined()`.
4. Re-run `test:cov`; confirm the specific branch is now covered.
5. Never delete a failing assertion to make coverage pass — fix the code or
   the test, whichever is wrong.

## Security considerations

Permission/ownership decision branches and sensitivity-classification branches
are exactly the kind of logic that must hit 100% branch coverage per the
coverage policy — treat gaps here as higher priority than everywhere else.

## Failure modes

- `.toBeDefined()`-only assertions that raise the percentage without proving
  behaviour — explicitly banned by
  [`../testing/coverage-policy.md`](../testing/coverage-policy.md).
- Mocking the unit under test instead of its boundaries (DB, HTTP, RabbitMQ,
  Ollama) — coverage goes up, confidence does not.
- Lowering a `coverageThreshold` to land a change instead of writing the
  missing tests — never acceptable (see `CLAUDE.md` refactor standards).

## Validation commands

```
cd <workspace> && npm run test:cov
```

## Documentation updates

None, unless the coverage policy's exclusion list changes.

## Definition of done

The workspace meets or exceeds its coverage target, every new test asserts
real behaviour, and no `coverageThreshold` was lowered to get there.
