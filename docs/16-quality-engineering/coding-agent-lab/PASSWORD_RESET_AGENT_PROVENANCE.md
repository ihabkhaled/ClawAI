# Password Reset Agent Provenance

Maps every feature-scope file to the ClawAI Coding Agent run that produced it.

Certification requires **`Mentor direct edit? = NO` on every row**. A feature
path that cannot be linked to an agent run is not certified, however correct the
code is. Pack §2 is explicit: a benchmark completed through direct mentor
feature edits is a failed benchmark.

| Feature path | Agent run | Prompt | Extension version | Commit | Mentor direct edit? | Notes                                                  |
| ------------ | --------- | ------ | ----------------- | ------ | ------------------- | ------------------------------------------------------ |
| _(none)_     | —         | —      | —                 | —      | —                   | Password Reset has not started. Zero agent runs exist. |

## Feature scope — what belongs in this table

From pack §2. If a change is in this list, it must come from an agent run:

- forgot-password application business logic
- reset token persistence and business rules
- password reset request API
- password reset confirmation API
- the feature database migration
- reset email template and content
- feature-specific frontend screens, forms, routes
- feature-specific validation
- feature-specific security logic
- feature-specific integration tests
- feature-specific browser E2E
- feature-specific docs

## Out of feature scope — mentor may edit directly

The coding-agent product and the lab harness. Changes made so far under that
heading are recorded in
[`CODING_AGENT_RELEASE_LEDGER.md`](CODING_AGENT_RELEASE_LEDGER.md), not here.
`0.53.0` touched only `apps/claw-coding-agent/**` and one Playwright fixture
script; it contains nothing in the feature-scope list above.

## Recording rule

One row per feature file, per agent run that changed it. When a mentor review
sends findings back and the agent repairs its own code, add a new row for the
follow-up run rather than editing the original — the correction history is part
of the proof.
