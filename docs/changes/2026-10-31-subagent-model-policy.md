# Change - Subagent model policy

Date: 2026-10-31. Decision: [ADR-203](../13-adr/adr-203-subagents-use-the-cheapest-safe-model-and-escalate-by-evidence.md).

## Why

Owner order: cheaper models for reading, full strength for code and QA, an escalation ladder for gates, and never the
costliest models as subagents.

## What changed

- Before: subagents inherited the main model. Now: [rule 64](../../rules/64-subagent-model-selection.md) picks the model by the kind of work.
- New skill `skills/choose-the-subagent-model.md` and context page `context/subagent-model-ladder.md`.
- Tool-agnostic: tiers R, S, O, X map to each vendor's models; AGENTS.md, the generated routers (CODEX, GEMINI, KIMI, DEEPSEEK, GLM, MISTRAL, QWEN), cursor.md and both .cursorrules carry the pointer.
- CLAUDE.md, AGENTS.md, rules/README.md, rules/48 item 10 and the skills index point at the rule.
