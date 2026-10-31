# ADR-203: Subagents use the cheapest safe model and escalate by evidence

**Status:** Accepted
**Date:** 2026-10-31

## Context

Every subagent inherited the main model, including read-only audits and CI reads. Cost grew with the number of agents
while the quality that matters (code, QA evidence) did not need the extra spend on reading work.

## Decision

Applies to every coding agent and tool (Claude Code, Codex, Cursor, Kimi, Gemini, DeepSeek, GLM, Mistral, Qwen, Copilot): rule 64 defines tiers R, S, O and X and maps them per tool; AGENTS.md, the generated per-model routers, cursor.md and the Cursor rules carry the pointer.

[Rule 64](../../rules/64-subagent-model-selection.md): Haiku 5.5 for read-only audit and context work; the main model
(or Sonnet/Opus set explicitly) for writing code and for Playwright, manual, API and automation QA; a gate ladder
Haiku 5.5, Sonnet 5.5, Sonnet 5.5 at higher effort, Opus 5.5 at low or medium effort, then ask the owner. Fable-class
models and `xhigh`/`max` effort are never used for subagents. When unsure, ask the owner with a fixed question.

## Consequences

- Reading work costs a fraction; code and QA keep full strength.
- A failed gate climbs a fixed, visible ladder instead of jumping to the dearest model or looping on one.
- The owner stays in the loop at the one point a guess would be expensive.
