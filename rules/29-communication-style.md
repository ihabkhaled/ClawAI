# 29 — Communication style (MANDATORY)

Applies to every agent, every reply, every project. Non-negotiable.

## The rule

**Short. Plain. Concrete.**

- A few lines max. Never a wall of text.
- Blocked? One line: `Blocked: <the actual thing>`. Nothing else unless asked.
- Working? One line: `Working — <what>` or `Working in background, no streaming`.
- Progress? Give a number: `~70/100`. Not a paragraph.
- Name the **concrete** cause: file, symbol, number, exact error text.
- Easy words beat complex words. Dummy-level phrasing is preferred, not a failure.

## Banned

- Explaining a failure in ten lines. Two lines, then stop.
- Circling the problem without naming it ("issues with the integration layer").
- Re-listing work the reader already saw.
- Restating the question before answering it.
- Padding: "Great question", "Let me explain", "As you can see".

## Why

Long answers do not get read. Vague answers hide the defect. The user's words:
"you always walk, run around the centroid of the problem but don't really
provide a concrete word I can know the issue from".

## How to apply

Write the reply. Cut it in half. Then make sure the concrete thing is named.

### Examples

Bad:

> The push did not complete successfully. There appear to be several interacting
> factors, including hook behaviour around stashing, a concurrent release on the
> same branch, and some generated artifacts that may have drifted out of sync…

Good:

> Blocked: push rejected, remote moved (v1.16.0). Rebasing.

Bad:

> The feature is progressing well across a number of dimensions…

Good:

> ~70/100. Email works E2E. Left: 4 defects, tests, browser check.

## Stay in the foreground — keep streaming

Do not go silent. Silence reads as "stopped" or "blocked" even when work is happening.

- Prefer **foreground** commands so output streams as it happens.
- Use background only when a command truly runs long (build, push, docker). Even then,
  say one line first: `Running <thing> (~2 min).`
- Never end a turn with nothing visible happening. Post a one-liner instead.
- Between steps, emit short progress lines: `Patched X. Now Y.`

Point: the user must always be able to see it is alive without asking.

## Show every step

The user wants to see movement constantly — even 0.1%.

- Report every file changed, every patch applied, every trial, every test run.
- One short line each: `Patched page.tsx (removed boundary import).`
- Report failures too, immediately: `Patch 2 failed: hunk did not match. Retrying smaller.`
- Do not batch ten actions and report once at the end. Report as you go.
- A step with no visible line is a step the user thinks did not happen.

### Granularity — what "every step" means

Report ALL of these, one short line each, as they happen:

- every file created, changed or deleted (name it)
- every patch/edit applied, and every one that FAILED
- every command run and its result (`typecheck: 0 errors`)
- every test run, pass and fail counts
- every trial/retry, including the ones that did not work
- every mini-task or operation, even tiny ones (`read config`, `restarted container`)
- every wait (`polling agent, no change yet`)

0.1% of movement is still movement — say it. Silence is the only forbidden state.

## Enforcement

- **Review checklist** — behavioral, with no automatable check. Enforced by the
  reader: a reply that buries the answer, hedges, or narrates instead of
  reporting is a violation regardless of whether the code was correct.

## Definition of done

- [ ] The answer leads with the answer.
- [ ] Blocked states name the concrete cause: file, symbol, exact error.
- [ ] Nothing was claimed done that was not verified.
