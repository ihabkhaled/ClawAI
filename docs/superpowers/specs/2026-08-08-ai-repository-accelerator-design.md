# AI Repository Accelerator Design

## Goal

Make the existing ClawAI knowledge tooling faster and more useful to coding agents by compiling minimum-sufficient task context, reusing stable repository intelligence, enforcing safe search scope, summarizing validation output, diagnosing drift, and reporting measured performance.

## Existing seam

Extend `tools/knowledge`, `tools/affected`, and their generated `.ai` artifacts. Do not create a parallel AI framework. The existing classifier, manifests, compact bootstrap, generated workspace routers, and affected-workspace runner remain authoritative.

## Components

1. **Task context compiler** — add FAST, NORMAL, DEEP, and AUDIT modes; include compact rule constraints, relevant architecture facts, likely tracked source files and tests, dependency impact, validation, source references, cache status, and an efficiency report.
2. **Deterministic cache** — hash stable inputs and reuse compiled repository intelligence and identical task contexts. Cache files remain local runtime artifacts under `.ai/local/` and never become policy.
3. **Tracked-source search policy** — add repository search exclusions and make knowledge discovery operate on tracked source rather than unbounded filesystem recursion.
4. **Context doctor** — detect stale generated intelligence, broken references, oversized bootstrap/context output, large ignored directories, and cache problems with concise remediation.
5. **AI validation wrapper** — retain full command logs outside model-facing output while printing a short success summary or focused failure excerpt.
6. **Benchmark** — run representative task shapes and report duration, output bytes/tokens, selected files, cache behavior, and measured cold/warm changes without inventing a historical baseline.

## Data flow

`task -> classifier -> mode/risk -> cached manifests -> governance/file ranking -> compact context bundle -> targeted source inspection -> affected validation`.

Authoritative rules remain in `rules/`; generated repository facts remain in `.ai/manifests/`; heuristics are labeled in the context output; caches remain in `.ai/local/`.

## Safety and correctness

- Cache keys include every source that affects output.
- Output ordering and content are deterministic.
- Missing mappings are surfaced rather than guessed.
- Search candidates come from tracked files and explicit exclusions.
- Existing generated-artifact freshness and affected-workspace gates remain mandatory.
- Existing user changes in `apps/claw-coding-agent` and the password-reset notes file remain untouched.

## Verification

Use test-first changes in `tools/__tests__/`, targeted Node tests during development, then `npm run knowledge:test`, `npm run knowledge:build`, `npm run audit`, `npm run knowledge:verify`, and `npm run audit:check`. Run the benchmark twice to capture cold and warm results.

## Deviations from the supplied pack

- Improve the existing knowledge system instead of creating a second system.
- Do not move runtime directories without measured evidence that a safe move is needed.
- Report only measured improvements; percentage targets are goals, not promised outcomes.
- Preserve repository-required hooks and validation despite the request to bypass them.
