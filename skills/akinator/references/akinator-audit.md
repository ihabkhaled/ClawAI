# Akinator Audit - claim versus code

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: before planning work on anything claimed to already exist, when a doc or ticket says a feature is done, when inheriting unfamiliar code, or when a request assumes a capability is wired up. Compares claim against code and returns done, partial or missing per item, catching the present-is-not-wired failure.

The most expensive lie in a codebase is "that's already done". Code that exists
is not code that runs. A function that is defined, exported, tested in isolation
and never called from any live path is **present but not wired** - and every plan
built on it is wrong from the first line.

Audit before you plan. Always cheaper than replanning.

## When to use

- Before planning any work on a component someone says already exists.
- When a doc, README, ticket or previous session claims something is complete.
- When inheriting code you did not write in this session.
- When the request assumes a capability ("just hook it up to the existing
  billing flow") - verify the existing thing before hooking.
- During onboarding, to rank knowledge gaps by severity.

## When NOT to use

- Greenfield work where nothing is claimed to exist yet.
- When you already audited this exact area in this session and nothing has
  changed since. Re-auditing unchanged state is waste, not rigor.

## Procedure

### 1. Enumerate the claims

Write the list of claims before looking at code, so the audit tests the claim
rather than rationalizing whatever you find. Sources of claims: the request
itself, routers, docs, tickets, tests, commit messages, prior session summaries.

### 2. Classify each claim

For each claim, find the evidence and assign exactly one status:

| Status                | Means                                                            | Evidence required                                                               |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **DONE**              | Implemented, reachable from a live entry point, covered          | The call path from an entry point to the implementation, and a test or a run    |
| **PARTIAL**           | Implemented for some inputs, paths, tenants or environments only | The specific condition under which it works and the one under which it does not |
| **PRESENT-NOT-WIRED** | The code exists but nothing live calls it                        | The absence of any caller from a live entry point - state how you searched      |
| **MISSING**           | No implementation                                                | The search that found nothing - name the terms and paths                        |
| **STALE-DOC**         | A doc describes behavior the code no longer has                  | The doc location and the code that contradicts it                               |

**PRESENT-NOT-WIRED is not DONE.** It is closer to MISSING, because the system
behaves as if the code were absent. Treat it that way in the plan.

### 3. Trace, do not assume

For anything you want to mark DONE, walk the path from a real entry point - a
route, a CLI command, an event handler, a cron, a UI action - to the code. If you
cannot name that path, it is not DONE.

For anything you want to mark MISSING, say how you searched. A missing feature
found later by a different search term is an audit failure, and it makes every
other verdict suspect.

### 4. Report with severity

Rank findings by what they cost the next agent, not by what is easiest to fix:

- **Critical** - a doc or router asserts something false. Anyone trusting it acts
  wrongly. Stale docs describing deleted behavior belong here.
- **High** - business or operational knowledge that exists nowhere, so it must be
  re-derived under time pressure.
- **Medium** - knowledge that exists but is unreachable from any index, or a
  PRESENT-NOT-WIRED component that a plan might build on.
- **Low** - knowledge that is present, true and reachable, but thin.

### 5. Feed the plan

Audit output is an input to `akinator-plan`. Every STALE-DOC and every CRITICAL
finding becomes a knowledge-delta item in a batch. A finding that is reported and
not planned is a finding that was not made.

## Failure modes and pitfalls

- **Accepting a test as proof of wiring.** A unit test calls the code directly.
  It proves the code works; it proves nothing about whether the system uses it.
- **Grading on effort.** Half-built with a lot of code in it is PARTIAL, not
  nearly-done.
- **Auditing only the code.** The docs are part of the tree. A correct
  implementation with a doc that describes the old behavior is a critical
  finding, not a pass.
- **Stopping at the first contradiction.** Finish the enumeration. A partial
  audit that reports one problem hides the other four.
- **Silently downgrading severity** to make the report look better. A red finding
  is information. See `akinator-anti-gaming`.

## Definition of done

- [ ] Every claim enumerated before code was read.
- [ ] Every claim carries exactly one status and the evidence for it.
- [ ] Anything marked DONE names its live call path.
- [ ] Anything marked MISSING names the search that failed.
- [ ] Findings are ranked by severity, and each critical and high finding is
      carried into a planned batch.
