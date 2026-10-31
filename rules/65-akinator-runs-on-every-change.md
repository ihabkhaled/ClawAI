# Rule 65 — Akinator runs on every change, without being asked

**Status:** NON-NEGOTIABLE. Owner order, 2026-10-31. Applies to EVERY coding agent and tool: Claude Code, Codex, Cursor,
Kimi, Gemini, DeepSeek, GLM, Mistral, Qwen, Copilot, a person using any of them, and any agent that does not exist yet.
Builds on [rule 55](55-akinator-station-discipline.md) (the station discipline) and turns it from "applies when cited"
into "applies always". Decision: [ADR-207](../docs/13-adr/adr-207-akinator-is-an-in-app-skill-that-runs-on-every-change.md).
Procedure and tools: [skills/akinator/SKILL.md](../skills/akinator/SKILL.md).

The owner should never have to type a command, or repeat an instruction, to get the full pass.

## The rule

Every prompt that can change the repository runs the **complete Akinator pass** before the work is called done:

ask, resolve, audit, plan, implement, document, skillify, rule, contextify, memoize, index and sync, verify.

- **No command is needed.** Not `/akinator`, not `$akinator`, not "run akinator". A normal prompt ("add a button",
  "fix this bug", "upgrade that package", "delete the old route") starts the pass.
- **Forgetting the slash command, not having the plugin installed, or working in a tool that has no skill system is never a reason to
  skip it.** The in-repo copy is the fallback and the source of truth: [`skills/akinator/`](../skills/akinator/SKILL.md). Read it
  yourself when nothing loaded it for you.
- **Every actor, every tool.** A subagent that edits files, a CI bot, a scheduled agent and a person all run it. A subagent that is
  strictly read-only is covered by its parent's pass ([rule 64](64-subagent-model-selection.md)).
- **Scoped, never skipped.** The pass is sized to the change. A typo or a formatting-only edit says so in one line and records
  `knowledge delta: none, because <reason>`. Anything else runs every station; a quiet station finds nothing and says so.
- **Same batch.** Documentation, skills, rules, context and memory land in the same commit as the code
  ([rule 63](63-docs-move-with-code.md), [rule 33](33-knowledge-compounding-and-context-velocity.md)). "I will document it in a
  follow-up" is a prohibited sentence.
- **Two obligations that are easy to forget are part of the pass.** A new flagship, core feature, big feature or product
  introduction also ships its public marketing page ([rule 66](66-every-flagship-feature-ships-a-public-marketing-page.md)). A change
  that touches money, permissions, deletion, security or a public contract stops and asks, or cites the rule that already answers it.
- **Honest reporting.** A station that was not run is reported as not run. A tool that was not run is not reported green
  ([rule 60](60-qa-evidence-is-mandatory-and-machine-checked.md)).

## Where it auto-triggers

| Where                                       | Mechanism                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any tool, any model                         | [`AGENTS.md`](../AGENTS.md) (read first) names this rule; the per-model routers (`CODEX.md`, `GEMINI.md`, ...) are generated from it                                     |
| Claude Code, contributor without the plugin | Project skill `.claude/skills/akinator/SKILL.md` (its description matches every repository-changing prompt) and a `UserPromptSubmit` reminder in `.claude/settings.json` |
| Claude Code, owner with the plugin          | The plugin's own hooks keep working; this rule adds nothing they contradict                                                                                              |
| Cursor                                      | `.cursorrules` and `cursor.md` carry the same instruction                                                                                                                |
| Every commit                                | The `Docs:` trailer and `docs:impact` checks of rule 63, the QA record check of rule 60                                                                                  |

## What the pass uses in this repository

- Context first: `npm run knowledge:context -- --task="<task>"`, then `.ai/local/current-context.md`. The vendored
  `python -I skills/akinator/scripts/akinator_context.py pack --for "<task>"` is a cheaper second look.
- Declare the knowledge delta **by path** at plan time (the `docs/`, `skills/`, `rules/`, `context/`, `memory/` and wiki files the
  batch creates or updates), or write `knowledge delta: none, because <reason>`.
- Before writing text that quotes config or logs: `python -I skills/akinator/scripts/akinator_sensitive.py guard FILE`.
- Before calling it done: `python -I skills/akinator/scripts/akinator_trace.py plan` shows which changed paths still lack a
  record. The repository's own gates (rule 23) and `npm run knowledge:coverage` remain the authority.
- The writers in the upstream plugin (`wiki`, `build_brief`, `extract_*`, the ledger) are not used: `.ai/` and `docs/wiki` are
  generated by `knowledge:build` ([rule 24](24-generated-files-and-knowledge-freshness.md)).

## Prohibited

- Skipping the pass because no command was typed, the plugin is absent, or the task "looked small" without saying so and recording
  `knowledge delta: none`.
- Running a ceremony on trivia so heavy that the discipline gets abandoned.
- Ticking a station with no artifact or exit code behind it ([rule 55](55-akinator-station-discipline.md)).
- Weakening a check, an index or a hook so the pass appears to succeed.
- Putting the Python tools into a git hook. Hooks stay fast and run the existing knowledge checks.

## Enforcement

- Hooks: `docs:impact` and the `Docs:` trailer (rule 63) reject a code change that ships no knowledge delta; the QA record check
  (rule 60) rejects `DONE` over an open lane.
- `npm run knowledge:coverage` fails when a rule or skill is not reachable from its index, or a rule names no real mechanism.
- Review checklist: a reviewer rejects a change whose plan names no knowledge delta, or whose delta paths do not exist.
- Follow-up (not built yet): a CI check that a feat or fix commit's message or change note states its knowledge delta. Owner: the
  tooling owner of `tools/`.
- The auto-trigger itself (the project skill and the `UserPromptSubmit` reminder) is a convenience for Claude Code. It is not the
  enforcement; the obligation does not depend on it.

## Definition of done

- [ ] The pass ran without anyone asking for it; the reply names the knowledge delta by path or says `none` and why.
- [ ] Every path in the delta exists, is reachable from its index, and `npm run knowledge:coverage` was run with its real output.
- [ ] A new flagship or core feature has its marketing page ([rule 66](66-every-flagship-feature-ships-a-public-marketing-page.md)).
- [ ] Nothing on money, permissions, deletion, security or a public contract was guessed.
