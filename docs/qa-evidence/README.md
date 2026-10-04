# QA evidence records

One file per batch: `<date>-<slug>.md`, created with `npm run qa:evidence:new -- <slug>`, validated with
`npm run qa:evidence:check -- <file>`. The rule is [rules/60](../../rules/60-qa-evidence-is-mandatory-and-machine-checked.md),
the plain-language walkthrough is [QA-WORKFLOW.md](../../QA-WORKFLOW.md), the per-lane how-to is
[skills/run-the-qa-team.md](../../skills/run-the-qa-team.md).

A record is the proof a change was tested by hand, not only by unit tests. PARTIAL records are normal and
honest; they list their open gaps. CI checks every `feat`/`fix`/`perf` push for a valid record.

| Record                                                                          | Verdict |
| ------------------------------------------------------------------------------- | ------- |
| [2026-10-03-chat-surface-parity](2026-10-03-chat-surface-parity.md)             | PARTIAL |
| [2026-10-04-provider-management-fixes](2026-10-04-provider-management-fixes.md) | PARTIAL |
| [2026-10-04-virtualised-model-picker](2026-10-04-virtualised-model-picker.md)   | PARTIAL |
