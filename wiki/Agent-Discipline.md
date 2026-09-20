> **Canonical source:** `skills/keep-an-agent-honest.md` and
> `rules/54-evidence-and-completion-honesty.md`

# Agent Discipline (without the AI-Psychiatry plugin)

ClawAI agents are expected to follow the discipline defined by the
[AI-Psychiatry](https://github.com/ihabkhaled/AI-Psychiatry) plugin and its
`all-the-medicine` skill: lock a Definition of Done, act on evidence, avoid
hidden recursion, balance investigation against action, apply one control at a
time, respect boundaries, and stop only when completion is proven. The plugin
is not always installed in the session doing the work — a fresh worktree, a
different tool, a CI agent. This page is what a reader without the plugin does
by hand instead. It does not reproduce the plugin's text; it maps the same
controls onto mechanisms that already exist in this repository.

## Why this page exists

The plugin's value is not the runtime, it's the checklist it forces an agent
through before it is allowed to say "done". ClawAI already has most of the
enforcement machinery a coding agent needs —
[Live Verification Before Done](https://github.com/ihabkhaled/ClawAI/wiki/Live-Verification-Before-Done),
[QA Team and Test Evidence](https://github.com/ihabkhaled/ClawAI/wiki/QA-Team-and-Test-Evidence),
the pre-commit hook, `tools/__tests__`. What is missing without the plugin is
the habit of walking the checklist every time. `skills/keep-an-agent-honest.md`
is that checklist, phrased for this codebase; `rules/54` states the
non-negotiables it enforces.

## The controls, mapped to this repo

| Control                          | What it means here                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lock objective + finite DoD       | Write the Definition of Done as a short, checkable list before touching code. For a prompt pack, the DoD is its deliverable list under `rules/26-prompt-pack-intake-protocol.md`. |
| Evidence, not assumption          | A real command's pasted output, an exit code actually observed, a screenshot from a live pass, a log line naming the branch that ran — never "should work".          |
| No hidden recursion / scope laundering | Don't silently widen the task into an adjacent refactor, and don't silently narrow the reported DoD to whatever got finished. State a scope change explicitly.  |
| Investigation vs action balance   | Under-investigating means patching the first plausible cause without reading the real log. Over-investigating means re-reading the same files instead of running the command that would settle it. |
| One control at a time             | Fix the bug, or refactor the module, or improve the i18n coverage — not all three in the same edit "while I'm in here".                                               |
| Boundaries always win             | Nothing overrides the Absolute Prohibitions in `CLAUDE.md` (no hook bypass, no suppressed findings, no cross-service DB access, no logged secrets) or an explicit instruction. |
| Stop when done is proven          | Stop once every DoD item has real evidence, or the only thing left is a genuine hard gate with no independent work remaining. Report evidence, not intent.            |

## What counts as evidence on this repo

- A shell command and its real output: `npx tsgo --noEmit`, `npm test`, a
  `curl` against `https://claw.local`, a `docker logs <container>` tail.
- An exit code actually read from the tool result, not inferred from silence.
- A screenshot from a live browser pass — see
  [QA Team and Test Evidence](https://github.com/ihabkhaled/ClawAI/wiki/QA-Team-and-Test-Evidence)
  for the device matrix and what each QA hat must produce.
- A log line unique to the new code path, seen live, not assumed from the diff.

## What a prohibited claim looks like

- "Tests should now pass" — no test run shown.
- "This fixes the issue" — no repro re-run.
- "Verified in the browser" — no screenshot, no URL, no DOM check.
- "Ready to commit" — no scoped gate output referenced.
- Any lane that was skipped and not reported as skipped.

These are the same failure the rest of the QA discipline already guards
against — see
[Live Verification Before Done](https://github.com/ihabkhaled/ClawAI/wiki/Live-Verification-Before-Done)
for the table of green-tests-but-actually-broken examples that motivated it.

## Enforcement

This page describes behaviour, not a build step. The mechanisms that actually
check it are the ones `rules/54-evidence-and-completion-honesty.md` names:
the pre-commit hook, `tools/__tests__`, `npm run knowledge:coverage` /
`knowledge:build` / `knowledge:verify`, and the live-verification and
QA-team disciplines in rules 44 and 49.

## See also

- [Live Verification Before Done](https://github.com/ihabkhaled/ClawAI/wiki/Live-Verification-Before-Done)
- [QA Team and Test Evidence](https://github.com/ihabkhaled/ClawAI/wiki/QA-Team-and-Test-Evidence)
- [`skills/keep-an-agent-honest.md`](https://github.com/ihabkhaled/ClawAI/blob/main/skills/keep-an-agent-honest.md)
- [`rules/54-evidence-and-completion-honesty.md`](https://github.com/ihabkhaled/ClawAI/blob/main/rules/54-evidence-and-completion-honesty.md)
- [AI-Psychiatry (upstream plugin)](https://github.com/ihabkhaled/AI-Psychiatry)
