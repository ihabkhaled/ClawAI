# Rule 64 — Delegated agents use the cheapest model that is safe for the job

**Status:** NON-NEGOTIABLE. Owner order, 2026-10-31. Applies to EVERY coding agent and tool: Claude Code, Codex, Cursor,
Kimi, Gemini, DeepSeek, GLM, Mistral, Qwen, Copilot and any agent that does not exist yet. "Subagent" means any agent,
task, worker or background run you start on a separate model from your own main session.
Procedure: [skills/choose-the-subagent-model.md](../skills/choose-the-subagent-model.md).
One-page ladder: [context/subagent-model-ladder.md](../context/subagent-model-ladder.md).
Decision: [ADR-203](../docs/13-adr/adr-203-subagents-use-the-cheapest-safe-model-and-escalate-by-evidence.md).

Money and quality both matter. Reading is cheap work; writing code and proving it works are not. The model follows the work.

## Tiers (map them to what your tool offers)

| Tier | Meaning                                                   | Claude Code                             | Other tools                                                          |
| ---- | --------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| R    | Smallest, cheapest current model of the vendor            | Haiku 5.5 (`haiku`, `claude-haiku-5-5`) | The vendor's smallest fast tier (a mini, flash, lite or small model) |
| S    | The strong everyday model; the main session's own model   | Sonnet 5.5 (`sonnet`) or the main model | The vendor's standard coding model, or the model the owner selected  |
| O    | One step above S, used sparingly, at low or medium effort | Opus 5.5 (`opus`)                       | The vendor's next model up from S                                    |
| X    | The vendor's costliest flagship, and maximum effort       | Fable-class, `xhigh`, `max`             | Any pro, max or ultra flagship and its highest effort setting        |

If you cannot tell which model is R, S or O in your tool, ask the owner once (section 5) and record the answer in memory.
If your tool cannot choose a model for a delegated run at all, say so and work on the selected model; never pretend.

## 1. Tier R for read-only work

Every **read-only** delegated run: audit, read, search, gain context, map a code path, list callers, summarise docs or
logs, read a CI run, inventory files. It must not edit files, run the app or commit.

## 2. Tier S for anything that must be perfect — do NOT downgrade

Writing or changing code, migrations, tests, prompts and docs that ship; **QA by Playwright, manual and API testing, and
automation testing** (rule 60 lanes). These runs use the main session's model (or tier S/O). Never tier R for them. A
wrong "PASS" costs more than any saving.

## 3. Validating and satisfying gates: climb only on evidence

Start cheap and move up one step only when the current step has really failed on the same gate with a named error (not
on a different gate, not on a guess):

| Step | Tier and effort                                              |
| ---- | ------------------------------------------------------------ |
| 1    | R (Claude: Haiku 5.5)                                        |
| 2    | S, default effort (Claude: Sonnet 5.5)                       |
| 3    | S with higher effort (Claude: Sonnet 5.5, `high`)            |
| 4    | O at low or medium effort (Claude: Opus 5.5)                 |
| stop | Ask the owner (section 5). Never go past step 4 on your own. |

A step must try a **different** approach from the last one (rule 30): re-running the same fix on a stronger model is loop
behaviour, not progress. Say which step you are on in the brief and in the report.

## 4. Never

- Never use tier X for a delegated run. A forked or inherited run uses the main model, so when the main session is tier X
  start a fresh run with an explicit tier S or O model.
- Never go above step 4 for a gate, and never raise effort unless this rule or the owner asks for it.
- Never put a secret, credential or production password in a delegated prompt that a cheaper model does not need.

## 5. Unsure, confused, or the ladder is exhausted: ask the owner

Do not guess the model. Ask in this shape and wait:

> `<Model X> at <effort> failed on <gate or task>: <exact error>. Try <Model Y> at <effort Z>? Approve, or tell me what to do.`

Also ask when two rules point at different models, when the task mixes reading and writing, when you cannot map a tier, or
when a gate keeps failing for a reason no model change will fix.

## 6. Every delegated run states its model

The brief names the model and why; the report back names the model that ran. Small or serial work: at most two runs at once; large work may use more when each run owns separate files (rule 48 item 10).
