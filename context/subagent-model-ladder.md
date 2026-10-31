# Context — subagent model ladder

One page for EVERY agent and tool (Claude Code, Codex, Cursor, Kimi, Gemini, DeepSeek, GLM, Mistral, Qwen, Copilot, ...).
Tiers: R = smallest fast model, S = strong everyday model, O = one step above S, X = costliest flagship (never). Rule: [rules/64](../rules/64-subagent-model-selection.md). Skill: [skills/choose-the-subagent-model.md](../skills/choose-the-subagent-model.md).

- Names below are Claude Code's; in any other tool use the matching tier (R, S, O) from rule 64.
- Read, audit, search, gain context, summarise: tier R, **Haiku 5.5** (`haiku`).
- Write code, tests, migrations; QA by Playwright, manual, API, automation: **main model** (omit `model`) or `sonnet` / `opus`. Never Haiku.
- Gates: Haiku 5.5 → Sonnet 5.5 → Sonnet 5.5 high effort → Opus 5.5 low/medium effort → ask the owner.
- Never Fable-class models or `xhigh`/`max` effort as subagents. Unsure or confused: ask the owner
  (`<Model X> at <effort> failed on <gate>: <error>. Try <Model Y> at <effort Z>?`).
- Model ids: Haiku 5.5 `claude-haiku-5-5`, Sonnet 5.5 `claude-sonnet-5-5`, Opus 5.5 `claude-opus-5-5`.
