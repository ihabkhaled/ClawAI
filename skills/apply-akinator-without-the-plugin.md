# Apply Akinator Without the Plugin

> Ported from the Akinator method (https://github.com/ihabkhaled/akinator-ai,
> `skills/everything/SKILL.md` and its `references/*.md`). ClawAI-native
> runbook — no plugin install required.

Akinator's method is: a change is the code **plus** the knowledge that lets the
next agent act on it in seconds. Half a change is no change. This runbook gives
an agent working in ClawAI the same twelve-station discipline, mapped onto
ClawAI's own conventions, with no `akinator` skill installed.

## When to use

- Any task with the shape "feature, fix, refactor, upgrade, deletion, migration,
  docs, onboarding, audit, release" — i.e. anything the akinator plugin would
  normally intercept.
- Whenever this repo's own [`rules/55-akinator-station-discipline.md`](../rules/55-akinator-station-discipline.md)
  is cited as governing a task.

## When NOT to use

- Pure conversation with no repository change.
- A genuinely trivial edit (typo, formatting only) — say so in one line and skip
  straight to IMPLEMENT.

## The 12 stations

Each row: what the station asks, what it produces, where the artifact lands in
**this** repo.

| # | Station | Asks | Produces | Lands in |
|---|---|---|---|---|
| 1 | ASK | What's ambiguous? What would a wrong guess cost? | A ranked, grouped question battery, each with a recommended default | The reply to the user; answers get cited in the plan, not filed separately |
| 2 | RESOLVE | What does the knowledge layer already say? | The set of rules/skills/context/memory already answering part of the request | Read `CLAUDE.md` → `rules/00-non-negotiable-rules.md` → `context/*` → `rules/*` → `skills/*`; run `npm run knowledge:context -- --task="…"` first |
| 3 | AUDIT | Is the claimed capability actually done, partial, present-but-not-wired, or missing? | A per-claim verdict with the call path traced from a real entry point | Inline in the plan/report — no separate file unless the audit itself is large, then `docs/14-risk-debt/` |
| 4 | PLAN | What batches, what blast radius, what knowledge delta **by path**? | A batch table: files touched, callers affected, knowledge delta per batch | Inline in the response before implementing; for a flagship task, `docs/superpowers/plans/<date>-<slug>.md` per this repo's existing convention |
| 5 | IMPLEMENT | — | The code change | The repository's own conventions (`rules/02`–`rules/14`) |
| 6 | DOCUMENT | What changed, why, what's now true? | Updated `docs/` pages, service guides | `docs/04-backend/service-guide-<name>.md`, `docs/03-architecture/*`, or the nearest existing doc; never a new doc tree without cause |
| 7 | SKILLIFY | Is this a repeatable procedure? | A runbook | `skills/*.md`, registered in `skills/00-index.md` |
| 8 | RULE | Is this a new non-negotiable constraint? | A numbered rule with an Enforcement section naming a real mechanism | `rules/<next-number>-<slug>.md`, registered in `rules/00-master-rules.md` (and `rules/README.md` if it lists rules) |
| 9 | CONTEXTIFY | Did a structural map change (architecture, ownership, ports, permissions)? | An updated structural map | `context/*.md` |
| 10 | MEMOIZE | Is there a lesson a future session needs, that isn't a rule or a doc? | A memory entry | `memory/*.md` (this repo's per-topic memory files, indexed from `MEMORY.md`) |
| 11 | INDEX+SYNC | Is every new artifact reachable from its index, and do the routers agree? | Updated index rows, no dead links, routers (`CLAUDE.md`, `CODEX.md`, `cursor.md`, etc.) in sync | Surgical single-row edits to `skills/00-index.md`, `rules/00-master-rules.md`, `context/*` indexes, `wiki/Documentation-Index.md` |
| 12 | VERIFY | Do the gates and the knowledge checks actually pass? | A gate run + `npm run knowledge:coverage` output | Reported verbatim in the response — real exit codes, not assumed ones |
| every | WIKI | Where does this land in the published wiki? | A `wiki/*.md` update | `wiki/*.md`, surgically added to `wiki/Documentation-Index.md` |

Debt found but not fixed this batch — record it, don't silently drop it:
`docs/14-risk-debt/`. Architecture-level decisions: `docs/13-adr/adr-<nnn>-<slug>.md`.

## Standing rules (carried from the source method)

- Stations 6–11 happen in the **same batch** as the code. "Document later" is a
  prohibited sentence — this mirrors `CLAUDE.md`'s own "no knowledge delta"
  prohibition.
- Declare the knowledge delta **by path** at PLAN time, or write
  `knowledge delta: none — <reason>`.
- Ask once, grouped, ranked, every question defaulted — see station 1.
- Honest gaps: `_Unknown — ask the owner and record the answer._`, never an
  invented fact.
- Never guess on money, permissions, deletion, security or public contracts.
  ClawAI already enforces the money half of this in `CLAUDE.md`
  ("Prices are never environment variables", "Money is integer minor units").
- Gate once, late, scoped — this repo already states this in `CLAUDE.md`
  ("Validation and landing a change") and `rules/34-gate-economy-and-machine-resources.md`.
- A meaningful change records its provenance: before, change, now, why, who or
  which agent, alternatives considered, how it was verified, what would make it
  stale.

## Procedure — condensed

1. **Ground yourself.** `npm run knowledge:context -- --task="<what you are doing>"`,
   read `.ai/local/current-context.md`, then the rules/skills/context it names.
2. **ASK** once, grouped, ranked, defaulted (station 1). Skip only for a
   genuinely trivial change.
3. **AUDIT** any claim of existing capability before planning on top of it
   (station 3) — trace the call path or mark it PRESENT-NOT-WIRED / MISSING.
4. **PLAN** batches on real seams (independently verifiable outcome, blast
   radius boundary, ordering constraint) — never "one commit per file". Declare
   the knowledge delta by path for every batch (station 4).
5. **BUILD** batch by batch: implement (5), then DOCUMENT (6), SKILLIFY (7),
   RULE (8), CONTEXTIFY (9), MEMOIZE (10), INDEX+SYNC (11), WIKI — all in the
   same batch as the code, before moving to the next batch.
6. **VERIFY** (12): run the scoped gates once at the end
   (`npx tsgo --noEmit && npm run lint && npm test && npm run build` in the
   touched workspace only, per `CLAUDE.md`), then `npm run knowledge:coverage`.
   Report the exact command and exact output.
7. **Commit and push per `rules/07-commit-rules.md` and `rules/23-...`** — one
   commit, one push, only when asked.

## Failure modes to avoid

- Ceremony on a one-line fix — say "knowledge delta: none" and move on.
- Marking a batch done with no artifact behind the tick.
- Skipping station 11 (index/router sync) on a "small" change — an unreachable
  rule or skill is functionally nonexistent per `npm run knowledge:coverage`.
- Re-running gates repeatedly instead of once at the end
  (`rules/34-gate-economy-and-machine-resources.md`).
- Fabricating a gate or coverage result instead of pasting the real output.

## Definition of done

- [ ] The knowledge layer was read and cited before planning.
- [ ] Every open question was asked (grouped, defaulted) or the assumption is
      written down.
- [ ] The batch declared its knowledge delta by path and delivered every item.
- [ ] Every new artifact is reachable from its index (`skills/00-index.md`,
      `rules/00-master-rules.md`, `context/*`, `wiki/Documentation-Index.md`)
      and `npm run knowledge:coverage` passes.
- [ ] Gates ran once, scoped, with the real exit code reported.
- [ ] Nothing was guessed on money, permissions, deletion, security, or a
      public contract.
