# Testing Lessons

Durable lessons about how we test. The prescriptive standards live in
[`../testing/`](../testing/README.md); these are the _why_. See [README](README.md).

---

### Reject fixed test-count quotas — design tests from risk, not from a number (2026-07-24)

**What happened.** Earlier guidance asked for "20–25 API variations per endpoint."
In practice this produced padding: near-duplicate happy-path calls to hit a count,
while a genuinely dangerous branch (an ownership check, a `.strict()` rejection) went
untested because it was "just one more case" past the quota.

**The durable lesson.** A test count is a proxy that rewards volume over coverage of
risk. The right question is never "how many tests?" but "which behaviors, if wrong,
would hurt — and is each one pinned?"

**How to apply.** Enumerate the risk surface of the unit (happy path, each boundary,
each error branch, each authz decision, null/empty/overflow inputs) and write exactly
one clear test per behavior. Let coverage thresholds and branch analysis, not a
headcount, tell you when you're done.

**Related.** [testing/testing-strategy](../testing/testing-strategy.md);
[testing/coverage-policy](../testing/coverage-policy.md).

---

### Keep the runners we have — churn is not rigor (2026-07-24)

**What happened.** Proposals to unify on a single test runner surfaced. Backend is
Jest (ts-jest), frontend is Vitest, E2E is Playwright. Each fits its layer; a forced
migration would burn weeks and risk regressions for no behavioral gain.

**The durable lesson.** Tooling uniformity is not a quality metric. Migrating a
working, well-understood runner has real cost and near-zero payoff. Rigor comes from
what the tests assert, not which harness runs them.

**How to apply.** Backend → Jest, frontend → Vitest, E2E → Playwright. Retained. Put
effort into assertions, fixtures, and coverage of risk, not runner consolidation.

**Related.** ADR-062 testing-runner-retention;
[testing/unit-testing-standard](../testing/unit-testing-standard.md).

---

### Green unit gates prove nothing the type system can't see — layer the tests (2026-07-24)

**What happened.** Multiple defects (raw i18n keys rendering, FE/BE field-name drift)
passed typecheck, lint, and unit tests, and were only caught in a browser or by an
audit script. See [known-pitfalls](known-pitfalls.md).

**The durable lesson.** Each test layer sees a different class of bug. Unit tests miss
contract drift; contract tests miss render-time defects; nothing but a real render or
an explicit assertion catches a stringly-typed lookup. Defense in depth is not
optional — it's the only thing that catches the bugs that slip a green gate.

**How to apply.** For a boundary feature, budget unit + contract + a thin E2E/render
check. For anything stringly-typed at runtime, add an explicit runtime assertion or a
visual check. Don't let "all gates green" stand in for "actually verified."

**Related.** [testing/integration-testing-standard](../testing/integration-testing-standard.md);
[testing/frontend-e2e-standard](../testing/frontend-e2e-standard.md).

---

### 100% branch coverage belongs on pure critical logic, not on everything (2026-07-24)

**What happened.** Blanket high-coverage targets waste effort on glue while under-
testing the code where a wrong branch is catastrophic: permission/ownership decisions,
schema validators, mappers, query-key builders, event-payload validators.

**The durable lesson.** Coverage should be proportional to blast radius. Pure decision
logic with no I/O is cheap to test exhaustively and expensive to get wrong — that's
exactly where 100% branch coverage earns its keep.

**How to apply.** Global bar: ≥95% statements/lines/functions, ≥90% branches. On the
named pure-critical modules: 100% branch. Don't chase the last few percent on
I/O-bound orchestration where a mock proves little.

**Related.** [testing/coverage-policy](../testing/coverage-policy.md);
ADR-063 coverage-targets.
