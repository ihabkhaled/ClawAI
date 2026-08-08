# AI Repository Accelerator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend ClawAI's existing knowledge tooling with cached, mode-aware compiled context, safe tracked-file discovery, concise validation, diagnostics, and reproducible performance benchmarks.

**Architecture:** Keep `tools/knowledge` as the single context compiler and reuse the existing deterministic manifests. Add focused modules for cache/search/ranking/reporting, expose thin CLI entry points, and keep all runtime state under gitignored `.ai/local/`.

**Tech Stack:** Node.js ESM, built-in Node test runner, npm scripts, generated Markdown/JSON manifests.

## Global Constraints

- Repository policy overrides the external prompt pack.
- No hook bypass, broad monorepo validation, hand-edited generated artifact, unmeasured performance claim, or unrelated workspace edit.
- New behavior follows test-first development.
- Generated output must be deterministic when its inputs are unchanged.

---

### Task 1: Mode-aware compiled task context

**Files:**

- Modify: `tools/knowledge/context.mjs`
- Modify: `tools/knowledge/classify-task.mjs`
- Create: `tools/knowledge/context-cache.mjs`
- Create: `tools/knowledge/source-neighborhood.mjs`
- Test: `tools/__tests__/knowledge.test.mjs`

**Interfaces:**

- Produces: `resolveContext(args)` with mode, risk, compiled constraints, likely files/tests, dependency impact, cache metadata, and cost metrics.
- Consumes: existing deterministic manifests and task-pack classification.

- [ ] Write failing tests for automatic modes, explicit mode override, compiled context sections, tracked-file neighborhoods, deterministic cache hits, and truthful efficiency reporting.
- [ ] Run `node --test tools/__tests__/knowledge.test.mjs` and confirm the new assertions fail because fields/modules are absent.
- [ ] Implement the smallest deterministic compiler, cache, and source-neighborhood logic that satisfies the tests.
- [ ] Re-run the targeted tests and refactor only while green.

### Task 2: Search policy and context doctor

**Files:**

- Create: `.aiignore`
- Create: `tools/knowledge/doctor.mjs`
- Modify: `package.json`
- Test: `tools/__tests__/knowledge.test.mjs`

**Interfaces:**

- Produces: `runDoctor()` findings and `npm run ai:doctor`.
- Consumes: generated hashes, bootstrap/context sizes, tracked and ignored directory metadata, and cache state.

- [ ] Write failing tests for mandatory exclusions and concise doctor findings.
- [ ] Run the targeted test and verify the failure is caused by missing behavior.
- [ ] Implement `.aiignore`, doctor checks, and `ai:context`/`ai:doctor` aliases.
- [ ] Re-run the targeted tests until green.

### Task 3: AI-friendly command output

**Files:**

- Create: `tools/ai/run.mjs`
- Modify: `package.json`
- Test: `tools/__tests__/ai-native-workflow.test.mjs`

**Interfaces:**

- Produces: a command runner that writes full logs under `.ai/local/logs/` and prints a bounded PASS/FAIL summary.
- Consumes: a command and arguments after `--`.

- [ ] Write failing tests for concise success output, focused failure output, preserved exit status, and full-log persistence.
- [ ] Run the targeted test and verify it fails because the runner is absent.
- [ ] Implement the runner and `ai:check` alias without shell-string execution.
- [ ] Re-run the targeted tests until green.

### Task 4: Reproducible benchmark

**Files:**

- Create: `tools/knowledge/benchmark.mjs`
- Modify: `package.json`
- Test: `tools/__tests__/knowledge.test.mjs`

**Interfaces:**

- Produces: `npm run ai:benchmark` with JSON/Markdown cold/warm measurements for seven representative task classes.
- Consumes: the public context compiler and cache controls.

- [ ] Write failing tests for representative tasks, measured fields, and absence of fabricated historical reductions.
- [ ] Run the targeted test and verify the benchmark API is missing.
- [ ] Implement deterministic benchmark scenarios and local reports.
- [ ] Re-run targeted tests and execute cold/warm benchmarks.

### Task 5: Generated artifacts, documentation, and landing

**Files:**

- Modify through generators: `.ai/**`, workspace `AGENTS.md`
- Modify through audit: `docs/features/ai-native-engineering-os/inventory.snapshot.json`
- Modify: relevant knowledge-system documentation identified by generated checks

**Interfaces:**

- Consumes all preceding tasks.
- Produces a fresh, verified repository state and pushed commits.

- [ ] Run Prettier on touched source and documentation.
- [ ] Run `npm run knowledge:test`.
- [ ] Run `npm run knowledge:build` and `npm run audit` after formatting.
- [ ] Run `npm run knowledge:verify` and `npm run audit:check`.
- [ ] Run `npm run affected:list` and only its required scoped validation.
- [ ] Commit through hooks and push immediately, preserving unrelated user changes.
