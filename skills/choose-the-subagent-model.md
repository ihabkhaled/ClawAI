# Skill — choose the subagent model

Runbook before every delegated agent, task or background run, in ANY coding agent (Claude Code, Codex, Cursor, Kimi,
Gemini, DeepSeek, GLM, Mistral, Qwen, Copilot, ...). Canonical rule: [`rules/64`](../rules/64-subagent-model-selection.md).
Tiers: R = the vendor's smallest fast model (Claude: Haiku 5.5), S = the strong everyday model (Sonnet 5.5), O = one step
above (Opus 5.5), X = costliest flagship (never).

## Pick in 10 seconds

| The agent will…                                                          | Model                                         |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| only read: audit, search, gain context, map code, summarise docs/logs/CI | `haiku` (Haiku 5.5)                           |
| write or change code, migrations, tests, shipped docs                    | main model (omit `model`), or `sonnet`/`opus` |
| run QA: Playwright, manual, API, automation testing                      | main model (omit `model`), or `sonnet`/`opus` |
| validate or satisfy a gate                                               | ladder below, start at `haiku`                |
| you are unsure which of the above                                        | ASK the owner (template below)                |

Never `fable`, never `xhigh`/`max`. A `fork` inherits the main model; under a Fable-class main model use a fresh
agent with an explicit `model`.

## Gate ladder (move up only after a real failure with a named error)

1. `haiku` → 2. `sonnet` → 3. `sonnet` with `effort: "high"` → 4. `opus` with `effort: "low"` or `"medium"` → **stop and ask**.
   Each step tries a different approach (rule 30). Write the step number in the brief and the report.

## Ask the owner

Use exactly: `<Model X> at <effort> failed on <gate>: <exact error>. Try <Model Y> at <effort Z>? Approve, or tell me what to do.`

## Brief checklist

Name the model and the reason, the scope, what is read-only, "no git commands" when others edit the tree, and the
report length. Small work: at most two agents at once. Large work: as many as there are independent parts, each with
explicit file ownership (rule 48 item 10), and the lead integrates.
