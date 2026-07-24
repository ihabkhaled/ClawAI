# Feature SDLC template

Every material feature or fix gets a folder `docs/features/<feature-slug>/`
containing the numbered artifacts below. **Depth scales with risk** — a
one-line config fix does not need all 27 documents filled to a page each; a new
service or a security-sensitive change does. What must never disappear is the
_decision_ each artifact represents, even if the writeup is two sentences.

This directory is the template: copy the files you need into your feature
folder and fill them in. Files are numbered so the natural reading/writing
order matches the SDLC phase order documented in `CLAUDE.md` (Phase 0 → 12).

## Artifacts

| File                            | Captures                                        |
| ------------------------------- | ----------------------------------------------- |
| `00-intake.md`                  | What is being asked for, by whom, why now       |
| `01-business-analysis.md`       | Business driver, affected users, success metric |
| `02-product-requirements.md`    | What the feature must do                        |
| `03-acceptance-criteria.md`     | Numbered, testable pass/fail statements         |
| `04-scope-and-non-goals.md`     | Explicit boundaries — what this does NOT do     |
| `06-delivery-plan.md`           | Sequencing, dependencies, milestones            |
| `08-architecture.md`            | Design: components, data flow, layering         |
| `09-impact-analysis.md`         | Every workspace/DB/event/route/env var touched  |
| `10-security-analysis.md`       | Threat model, auth/authz impact, secrets        |
| `11-data-and-migration-plan.md` | Schema changes, migration/backfill strategy     |
| `12-test-strategy.md`           | Which test layers, why                          |
| `13-coverage-plan.md`           | Coverage target for new code, gap plan if below |
| `15-implementation-notes.md`    | What was actually built, deviations from plan   |
| `16-developer-validation.md`    | Local gate evidence (typecheck/lint/test/build) |
| `17-QA-evidence.md`             | Manual QA results, DB verification, log checks  |
| `20-UAT.md`                     | Business acceptance scenarios and results       |
| `21-go-no-go.md`                | Release readiness decision                      |
| `22-release-plan.md`            | Rollout steps, feature flags, sequencing        |
| `23-rollback-plan.md`           | How to undo this if it goes wrong               |
| `25-release-evidence.md`        | Proof the release happened and is healthy       |
| `26-retrospective.md`           | What went well/poorly, follow-ups               |

Numbers are intentionally non-contiguous — they leave room for artifacts a
specific feature needs (e.g. `05-cross-functional-refinement.md`,
`07-technical-refinement.md`, `14-implementation-readiness.md`,
`18-security-review.md`, `19-performance-and-reliability-review.md`,
`24-observability-and-hypercare.md`, `27-postmortem.md`) without renumbering
the rest. See `CLAUDE.md` "Complete Software Development Lifecycle" for the
full canonical list this template is scaled down from.

## How to use

1. `mkdir docs/features/<your-feature-slug>`
2. Copy in the artifacts this feature's risk level warrants (at minimum:
   `00-intake.md`, `03-acceptance-criteria.md`, `09-impact-analysis.md`,
   `12-test-strategy.md`, `16-developer-validation.md`).
3. Fill them as you go — planning artifacts (00–13) before code, evidence
   artifacts (15+) after.
4. Link the feature folder from the relevant `docs/` category page.

See [`../../exceptions/README.md`](../../exceptions/README.md) if a decision in
one of these documents requires waiving a rule.
