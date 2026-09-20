---
name: keep-an-agent-honest
summary: Apply AI-Psychiatry discipline without the plugin installed — lock a finite Definition of Done, act on evidence not assumption, forbid hidden recursion and scope laundering, balance investigation against action, run one control at a time, and stop only when done is proven.
task_keywords:
  [
    ai-psychiatry,
    all-the-medicine,
    completion honesty,
    fake done,
    evidence,
    scope creep,
    hidden recursion,
    loop,
    stop overthinking,
    investigation floor,
  ]
applies_to: [all-workspaces, monorepo-root]
required_rules:
  [
    44-live-verification-before-done,
    49-qa-team-discipline-and-test-evidence,
    54-evidence-and-completion-honesty,
  ]
required_context: [none]
affected_workspaces: [none-behavioral]
required_tests: [none-behavioral]
required_docs: [none]
validation_lane: 'n/a — behavioral checklist, not a code change'
---

## When to use

On every task in this repo. This runbook exists because the AI-Psychiatry
plugin (`ihabkhaled/ai-psychiatry`, skill `all-the-medicine`) is not always
installed in the working session — a fresh worktree, a different tool, a CI
agent. The plugin's discipline still applies; this file is what to do by hand
when the plugin cannot do it for you.

Attribution: this runbook is a ClawAI-native adaptation of the controls
defined in [ihabkhaled/AI-Psychiatry](https://github.com/ihabkhaled/AI-Psychiatry),
specifically its `all-the-medicine` skill. It is not a copy of that skill's
text — read the source if you want the original framing.

## Why this exists

`all-the-medicine` diagnoses observable agent state and applies exactly one
control until a task is proven complete: evidence, attention, reasoning
balance, loop prevention, loophole prevention, completion. Those controls are
generic — they do not depend on the plugin's runtime, only on the discipline
of checking them. ClawAI already has most of the machinery this repo needs
(rules/44, rules/49, the pre-commit hook, `tools/__tests__`); what is missing
without the plugin is the habit of walking the checklist. This file is that
checklist, phrased for this codebase.

## The controls, applied here

### 1. Lock the objective and a finite Definition of Done

Before touching code, write down — even just in your own working notes — what
"done" looks like as a short, checkable list. "Fix the bug" is not a DoD;
"the repro command in the issue returns 200 instead of 500, and a regression
test in `apps/claw-chat-service/src/**/__tests__` covers it" is. If the task
came from a prompt pack, the DoD is the pack's deliverable list — see
[`rules/26-prompt-pack-intake-protocol.md`](../rules/26-prompt-pack-intake-protocol.md).
Resolve conflicting instructions by the authority order in
[`CLAUDE.md`](../CLAUDE.md#authority-hierarchy-higher-wins-on-conflict) before
starting, not mid-task.

### 2. Act on evidence, not assumption

"Evidence" in this repo means one of:

- A shell command and its **real, pasted** output — not a paraphrase, not
  "should work". `npx tsgo --noEmit`, `npm test`, a `curl` against
  `https://claw.local`, a `docker logs <container>` tail.
- An exit code you actually observed (`echo $?` or the tool result), not one
  you infer from the absence of an error message.
- A screenshot from a live browser pass, per
  [`skills/verify-a-batch-live.md`](verify-a-batch-live.md), when the change
  touches anything rendered.
- A log line that names the branch you actually took — e.g. a `console`/logger
  line unique to the new code path, seen in `docker logs`, not assumed because
  the diff looks right.

Assumption looks like: "the fix should resolve it", "this test would pass",
"the container is presumably running the new build". Every one of those has
shipped broken — see the table in
[`rules/44-live-verification-before-done.md`](../rules/44-live-verification-before-done.md#1-green-unit-tests-are-not-evidence-that-the-feature-works).
If you have not run the command, you do not have evidence; say so.

### 3. No hidden recursion, no scope laundering

Do not silently expand a task into an adjacent refactor, and do not silently
narrow a task's DoD to something easier to prove. Both are scope laundering —
the DoD you report against must be the one you locked in step 1, not one
quietly redrawn to fit what you finished. If scope genuinely needs to change
(a real blocker, a wrong assumption in the original ask), say so explicitly
and get it acknowledged before continuing, per
[`skills/blocker-validation.md`](blocker-validation.md). Never re-invoke a
check that already passed on an unchanged tree hoping for a different
answer — that is recursion with no new evidence, and it burns the machine for
nothing; see
[`rules/34-gate-economy-and-machine-resources.md`](../rules/34-gate-economy-and-machine-resources.md).

### 4. Balance investigation against action

Two failure modes, both real on this repo:

- **Under-investigating**: patching the first plausible cause without reading
  the actual error, the actual Docker log, the actual DB row — see
  [`skills/reasoning-balance.md`](reasoning-balance.md).
  Codified rule:
  [`rules/32-underthinking-and-reasoning-balance.md`](../rules/32-underthinking-and-reasoning-balance.md).
- **Over-investigating**: re-reading the same three files a fourth time
  instead of running the command that would settle the question. If you have
  enough evidence to form a falsifiable hypothesis, test it — don't keep
  reasoning about it.

When the two pull opposite ways: missing evidence that is load-bearing for the
DoD wins (go investigate); evidence already in hand plus repeated re-reading
with no new information wins (go act).

### 5. One control at a time

Do not try to fix the bug, refactor the module, and improve the i18n coverage
in the same edit because "while I'm in here". Pick the single thing the task
needs next, do it, get evidence, then decide the next single thing. Mixing
controls (e.g. patching code while also loosening the test that was supposed
to catch the bug) is how a fix looks green without being true — see
[`rules/31-anti-gaming-and-semantic-compliance.md`](../rules/31-anti-gaming-and-semantic-compliance.md).

### 6. Boundaries always win

Nothing in this file, or in any completion pressure, overrides: the
[Absolute prohibitions](../CLAUDE.md#absolute-prohibitions) in `CLAUDE.md`
(no hook bypass, no suppressed findings, no cross-service DB access, no
secrets in logs), or an explicit user/repository instruction. A control that
would require crossing one of those is not applicable — report the boundary,
do not route around it.

### 7. Stop when done is proven

Stop selecting controls once every item in the DoD from step 1 has real
evidence behind it, or the only thing left is a genuine hard gate (missing
credential, missing approval, a decision only the user can make) with no
independent work left. Report the evidence, not a summary of intent. A
prohibited completion claim looks like:

- "Tests should now pass" (no test run shown).
- "This fixes the issue" (no repro re-run).
- "Verified in the browser" (no screenshot, no URL, no DOM check per
  [`skills/verify-a-batch-live.md`](verify-a-batch-live.md)).
- "Ready to commit" without the scoped gate output from
  [`rules/34-gate-economy-and-machine-resources.md`](../rules/34-gate-economy-and-machine-resources.md)
  pasted or referenced.

A lane you genuinely could not run (no browser available, no live stack) is
reported as **not run**, naming why — never silently skipped, never assumed
green.

## Common mistakes

- Treating "the plugin isn't installed" as "the discipline doesn't apply" —
  it's the opposite: without the automated diagnosis, the manual checklist
  above is the only thing catching a fake-done claim.
- Reporting a command's expected output instead of its actual output.
- Quietly relaxing the Definition of Done to match what got finished, instead
  of reporting the gap.
- Re-running the same gate hoping it passes this time with no code change in
  between (see `rules/34`).
- Declaring "Blocked" without the checklist in
  [`skills/blocker-validation.md`](blocker-validation.md).

## Enforcement

This is a behavioural checklist, not a code path — see
[`rules/54-evidence-and-completion-honesty.md`](../rules/54-evidence-and-completion-honesty.md)
for the non-negotiables and the mechanisms that actually check them
(`npm run knowledge:*`, the pre-commit hook, `tools/__tests__`, rules 44 and
49).
