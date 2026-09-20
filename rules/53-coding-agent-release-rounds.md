# 53 — Every coding-agent release is proven by live rounds

**Status:** active · **Owner:** coding-agent · **Added:** 2026-09-20

## The rule

A ClawAI Coding Agent release is not done when its gates are green. It is done
when the released artifact has been installed and driven against a live
`claw.local`, across every tool-capable connector model, and every failure the
rounds surfaced has been fixed or recorded.

Deterministic gates prove the code is correct. They cannot prove the product
works, because the product is a model choosing tools — and that is the part
that fails intermittently, differs per model, and cannot be unit tested.

## What must run after every release

1. Install the released VSIX into a real VS Code and sign in to `claw.local`.
2. `node scripts/live-rounds.mjs` against the Ollama **connector** models
   (non-local), covering at minimum: reading the workspace, writing exact
   content, editing an existing file without destroying its neighbours, running
   a command and acting on its output, a real `git` commit, delivering a
   feature end to end with a passing test, applying a plan written as markdown,
   repairing a failing test, building several files that work together, and
   staying inside the workspace.
3. Repeat rounds — a single pass proves nothing about reliability. The first
   sweep found a scenario that failed once and passed three times on retry.
4. Every failure is triaged into: a product defect (fix it), a model
   limitation (record which model, keep the round), or a harness defect (fix
   the harness, never the assertion).

## The one thing that makes a round trustworthy

**An assertion reads the workspace, never the run's own report.** A run that
ends `run.completed`, returns receipts for four tool calls and leaves an empty
directory must fail. Grading a run by its own output is how a coding agent
comes to look finished while delivering nothing.

## Prohibited

- Weakening a round's assertion to make it pass.
- Reporting a sweep as green when a model was skipped — a model not run is
  reported as not run.
- Treating an intermittent failure as a pass because the retry succeeded. The
  intermittency is the finding; record the rate.

## Mechanism

`apps/claw-coding-agent/scripts/live-rounds.mjs`, with scenarios in
`live-rounds.scenarios.mjs` and the shared run driver in
`live-agent-session.mjs` (also used by `npm run check:live`).

Runbook: [`skills/run-coding-agent-release-rounds.md`](../skills/run-coding-agent-release-rounds.md)
