# QA Labs and Regression Suites

ClawAI has two complementary QA surfaces outside ordinary unit/integration tests.

## `qa/routing-regression`

A deterministic routing regression suite with prompt corpora for:

- domains;
- judge mode;
- privacy;
- security;
- workflow behavior.

It includes a shell runner intended to catch routing regressions that are difficult to express as isolated unit tests.

## `scripts/qa-lab`

The QA lab exercises behavior across a running system:

- authorization;
- concurrency;
- cross-thread behavior;
- memory;
- paraphrasing;
- performance;
- context stress;
- smoke verification;
- transcript export.

## Quality philosophy

Unit tests are the floor. The repository also requires live API/browser evidence for user-visible or API-visible changes and uses reviewer-role checklists to force security, accessibility, reliability and product-state coverage.

See [[Testing-and-QA-Architecture]], [[Testing-Standards]], [[Quality-Gates]], [[UAT-Guide]], and [[Reviewer-Roles]].
