# Akinator

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: you need the full creed, the twelve-station loop, the knowledge taxonomy (where each kind of fact lives) or the non-negotiables in detail. The skill itself carries the summary.

The code outlives its context. Every contributor - human or AI - pays a
re-derivation tax to rediscover what someone already knew. On an AI-heavy team
that tax is paid _per session_: an agent with a fresh context window is a new
hire every morning.

Akinator removes the tax by making the knowledge layer inseparable from the
change that needs it.

## The creed

1. **A change is never the code alone.** A change is the code plus the knowledge
   that lets the next agent act on it in seconds. Half a change is no change.
2. **Ask more.** An unasked question becomes an unrecorded assumption becomes a
   production bug. Ask at intake, record every answer, and convert every answer
   into a permanent artifact so it never needs asking again.
3. **Skillify everything.** Any procedure that will happen twice gets a skill
   the first time. Creating skills is the default, not the exception.
4. **Rule everything.** Any constraint others must not break becomes a written,
   enforced rule - not a comment, not a review remark, not tribal memory.
5. **Document every single detail - but only true ones.** A stale doc is worse
   than no doc, because it is trusted. Every doc change is verified against the
   tree it describes.
6. **Contextify.** Structural facts (who owns what, what talks to what, where a
   kind of code lives) live in machine-checkable maps, regenerated, never
   hand-drifted.
7. **Memoize.** Durable facts, preferences, decisions and surprises go into
   persistent memory with their _why_, their date, and their reversal conditions.
8. **The routers stay in sync.** CLAUDE.md, CODEX.md, AGENTS.md, GEMINI.md,
   cursor rules - every AI entry-point file reflects the same truth, updated in
   the same commit, never allowed to fork.
9. **Business logic is first-class knowledge.** Pricing, quotas, entitlements,
   refunds, product semantics - written in business language, next to the
   technical contract, so "what should the product do?" never requires reading
   the implementation.
10. **Operational consequence ships with the change.** If a change alters how the
    system is operated, the procedure is written the moment the change is made.
11. **Gate once, gate late, gate narrow.** Never burn the machine proving the
    same thing twice.
12. **Evidence over claims.** "Documented" means a newcomer test passes: a fresh
    agent, given only the knowledge layer, knows where to go, what to do, how to
    fix, and what will bite - in seconds. Anything less is not done.

## The loop

Every codebase touch runs these twelve stations. Each station has a reference
inside the one Akinator skill; this reference is the router.

| #   | Station    | What happens                                                                | Station reference                             |
| --- | ---------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | ASK        | Intake questions; surface every unknown                                     | `akinator-intake`                             |
| 2   | RESOLVE    | Load context: routers, rules, skills, context, memory, `.ai`, docs          | this reference                                |
| 3   | AUDIT      | Claim vs code: done / partial / missing; present-is-not-wired               | `akinator-audit`                              |
| 4   | PLAN       | Batches, blast radius, **knowledge delta declared up front per batch**      | `akinator-plan`                               |
| 5   | IMPLEMENT  | The code                                                                    | the host repo's own domain skills             |
| 6   | DOCUMENT   | The why, the when-not-to, the business meaning, the operational consequence | `akinator-document-change`                    |
| 7   | SKILLIFY   | Any repeatable procedure becomes a skill                                    | `akinator-skillify`                           |
| 8   | RULE       | Any new constraint becomes an enforced rule                                 | `akinator-rule-forge`                         |
| 9   | CONTEXTIFY | Structural maps updated or regenerated                                      | `akinator-contextify`                         |
| 10  | MEMOIZE    | Decisions, surprises, preferences                                           | `akinator-memoize`                            |
| 11  | INDEX+SYNC | Every artifact reachable; all routers updated in the same change            | `akinator-index-sync`, `akinator-router-sync` |
| 12  | VERIFY     | Gate once, scoped; newcomer test; land                                      | `akinator-gate-economy`, `akinator-coverage`  |

### The all-in-one pass

The one Akinator skill is the master orchestrator for repository-changing work.
It is always on; do not wait for a slash command. It evaluates every
station, every applicable boardroom lens and every applicable mechanical check,
and loops until the Definition of Done is proven rather than asserted. The one explicit
entry - `/akinator:everything` on Claude Code, `$akinator` on Codex, `/akinator`
on Cursor, normally unneeded - enters this same path.

### Non-negotiables

- **Stations 6-11 are not optional and not deferrable.** They happen in the same
  batch as station 5, before the batch is called done. "I'll document in a
  follow-up" is a prohibited sentence.
- **The knowledge delta is declared at station 4.** The plan for any batch names
  the docs, skills, rules, context and memory files it will touch, so skipping
  them is visible, not silent.
- **A batch with zero knowledge delta must state why none applied** - explicitly,
  in the plan and in the commit message. Silence is a violation.
- **Deletion is a documentation event.** Removing behavior removes or updates
  every doc that described it. Stale docs describing deleted behavior are
  severity-critical.

## When to use

Load on any intent that touches a codebase: add, fix, refactor, upgrade, remove,
investigate, review, plan, document, "why does X", onboard. It is the default
operating mode, not a special path.

## When NOT to use

- Pure conversation with no repository consequence ("what does this error mean in
  general?", "explain how OAuth works").
- Read-only questions the knowledge layer already answers - answer from the layer
  and cite where, which is itself proof the layer works.
- Inside a subagent dispatched to execute one narrow step: the dispatching
  session owns the loop; the subagent does its step.

## Procedure

### Station 2 first: RESOLVE before anything

Read in this order, stopping when the question is answered:

1. **Routers** - `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, and any per-module router
   in the directory you are about to touch. These are indexes: follow their links.
2. **Rules** - `rules/` (or the repo's equivalent). These are constraints you may
   not break. Read the ones that apply to the area you are touching.
3. **Skills** - the repo's own `skills/`. If a runbook exists for what you are
   about to do, follow it instead of improvising.
4. **Context maps** - `context/` for structural facts: ownership, ports, routes,
   events, permissions.
5. **Memory** - `memory/` for durable decisions, preferences and surprises.
6. **Generated manifests** - `.ai/` for machine-readable derived facts.
7. **Docs** - `docs/` for narrative: architecture, business, product, ops, ADRs.

If the repo has none of these, you are on a greenfield target: run the onboarding
behavior through the master orchestrator. Do not require or invent another command.

### Then run the stations

Route each station to its station reference. Do not skip forward past station 4 without a
written knowledge delta, and do not declare a batch done before station 11.

### Adopt, never impose

If the target repo already has a knowledge system - its own `rules/` numbering,
its own docs conventions, a generated `.ai` layer - map Akinator's taxonomy onto
what exists and extend it. Never create a parallel competing structure. Detection
first, convention-matching always.

## The knowledge taxonomy

One canonical home per kind of knowledge. Route every fact to its home.

| Kind of knowledge                                              | Canonical home                                                | Never lives in             |
| -------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| Hard constraints (must / never)                                | `rules/NN-*.md`, numbered, each with an enforcement mechanism | comments, PR remarks, chat |
| Repeatable procedures                                          | `skills/*/SKILL.md` with when-to-use, steps, DoD              | one-off shell history      |
| Structural facts                                               | `context/*.md` maps, regenerated where possible               | prose docs that drift      |
| Architecture and deep dives                                    | `docs/`                                                       | README sprawl              |
| Business logic (pricing, plans, quotas, refunds, entitlements) | `docs/business/`                                              | the implementation         |
| Product logic (intent, acceptance criteria, edge cases)        | `docs/02-business-product/` per feature                       | ticket systems that rot    |
| Operational procedure                                          | `docs/11-runbooks/` runbooks plus the relevant skill          | on-call memory             |
| Decisions with alternatives                                    | ADRs in `docs/13-adr/`                                        | commit messages alone      |
| Durable facts and surprises                                    | `memory/` with date, why, reversal conditions                 | session context            |
| Machine-readable derived facts                                 | `.ai/` manifests, generated only                              | hand-edited JSON           |
| Agent entry points                                             | routers - thin indexes that link, never mirror                | 2,000-line monoliths       |
| Per-module constraints                                         | `<module>/CLAUDE.md` plus generated `<module>/AGENTS.md`      | the root router            |

Taxonomy laws:

1. **One home per fact.** Duplicated prose forks; the second copy is a link.
2. **Every artifact reachable from an index.** Unindexed means nonexistent.
3. **Generated beats written** wherever a fact can be extracted from the tree.
4. **Every doc states what would make it stale.**

## Failure modes and pitfalls

- **Documenting the what instead of the why.** Restating what the code plainly
  does adds bytes and no knowledge. Write the why, the when-not-to, the
  consequence, the rejected alternative.
- **Deferring stations 6-11 to a follow-up.** The follow-up never happens. The
  batch is not done.
- **Creating a parallel structure** in a repo that already had conventions.
- **Fake compliance** - vacuous docs, copy-pasted skills, rules with no
  enforcement mechanism, ticked checklists. Worse than absence, because they are
  trusted. See `akinator-anti-gaming`.
- **Gate storms** - running lint, typecheck, test and build after every edit. See
  `akinator-gate-economy`.
- **Asking questions the layer already answers.** Many questions early, near zero
  questions late. Interrupting mid-flow for something `context/` states is a
  failure of station 2, not diligence.
- **Adding knowledge checks to git hooks.** Prohibited, always. Hooks gate
  code and must stay fast; knowledge enforcement lives in CI, in tests and in
  session behavior.

## Definition of done

- [ ] Station 2 was actually run: the layer was read, and answers found there
      were cited rather than re-derived.
- [ ] The plan declared a knowledge delta per batch, or stated why none applied.
- [ ] Every declared artifact exists, is true against the tree, and is reachable
      from an index.
- [ ] All AI router files reflect the same truth, updated in this change.
- [ ] Gates ran once, scoped to what was touched, and are green.
- [ ] A fresh agent given only the knowledge layer could act on this area in
      seconds.
