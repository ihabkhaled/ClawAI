# Akinator Document Change - station 6

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: in the same batch as any code change, before the batch is called done. Routes the change's why, its when-not-to, its business meaning and its operational consequence to their canonical homes in the knowledge taxonomy, and verifies each doc against the tree it describes.

Station 6 is where most documentation mandates die, because the code works now
and the docs feel like paperwork. They are not paperwork. They are the difference
between the next agent spending four seconds and four hours.

The rule that makes this station cheap: **document what the code cannot say
about itself.**

## When to use

In the same batch as station 5, every time, before the batch is called done. Also
when deleting behavior - deletion is a documentation event. A prompt that
decides something with no code change - a requirement dropped, a scope cut - is
documented too, through [akinator-wiki](akinator-wiki.md).

## When NOT to use

- To restate what the code plainly says. A doc that paraphrases an
  implementation is a liability: it costs bytes, earns trust, and rots on the
  next refactor.
- To create a new home for a fact that already has one. Link instead.

## Procedure

### 1. Write the change provenance

Every meaningful change must leave a durable change record in the repository's
existing history/changelog convention. If none exists, use the change-record
template (its current layout) and establish one during onboarding.
**Every changed path is traced**: it is named in a change record or ledger
record of the same diff, or the batch says `knowledge delta: none, because
<reason, 10+ characters>`.

```bash
python skills/akinator/scripts/akinator_trace.py plan [--base REF]    # what still lacks a record
python skills/akinator/scripts/akinator_trace.py record --title "..." # write the record
python skills/akinator/scripts/akinator_trace.py check                # exit 1 = unaccounted paths
python skills/akinator/scripts/akinator_version.py next --base HEAD   # shipped change? which bump
python skills/akinator/scripts/akinator_version.py bump <level> --date YYYY-MM-DD
python skills/akinator/scripts/akinator_version.py check --base HEAD  # exit 1 = not bumped, no changelog heading
```

A release or version bump is a history event (`docs/wiki`, regenerated
by `extract_history.py --write`). A business decision and a gap-fill answer each
get their own record too - no diff does not mean no record.

Record, when applicable:

- **When** — date/time or the best available durable timestamp.
- **Actor / agent** — human owner, agent/tool, or `unknown`; never invent identity.
- **Request / source** — issue, prompt, incident, requirement or decision.
- **Affected code/components** — paths and surfaces.
- **Before** — the behavior/state before the change.
- **Change** — what was changed.
- **Now** — the resulting behavior/state.
- **Why** — the reason and problem being solved.
- **Business intent** and **product intent**.
- **Technical reasoning**, alternatives and trade-offs.
- **Compatibility, migration and rollback** consequences.
- **Rules, skills, failures, ADRs, docs, context and memory** created or changed.
- **Verification evidence**.
- **Future implications / follow-ups**, clearly labeled as future rather than done.
- **Stale when** — what event would make the record's current-state claims stale.

A field nobody knows is written as the exact gap marker line
`_Unknown - ask the owner and record the answer._`, never guessed - the wiki's
gap list turns it into the next intake question.

History is not the same as current truth: keep the change record immutable enough
to explain the past, while current product/business/architecture docs describe
the resulting present.

### 2. Ask the four questions the code cannot answer

For the change you just made:

1. **Why is it this way?** What forced this shape - a constraint, a bug, a
   business rule, a platform limit, a rejected alternative?
2. **When should someone NOT do this?** The conditions under which this pattern
   is wrong. This is the highest-value sentence in most documents, and it is
   almost never written.
3. **What does it mean to the business?** In business language. What breaks for
   whom, and what is it worth?
4. **What is the operational consequence?** Does this change how the system is
   deployed, migrated, restarted, recovered or rolled back?

If all four answers are genuinely "nothing beyond what the code says" - a typo
fix, a rename with no semantic change - say so explicitly in the batch. That is a
justified empty delta, not a skipped station.

### 3. Route each answer to its canonical home

| Answer                                                                                                                  | Home                                                                                                                                                | Skill                                   |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Why this shape, with alternatives rejected                                                                              | `docs/13-adr/`                                                                                                                                      | `akinator-adr`, after `akinator-decide` |
| Why this shape, no real alternatives                                                                                    | inline in the relevant `docs/` page                                                                                                                 | this station                            |
| When not to do this                                                                                                     | the rule, if it is a constraint; otherwise the doc                                                                                                  | `akinator-rule-forge`                   |
| Business meaning, numbers, money semantics                                                                              | `docs/business/`                                                                                                                                    | `akinator-business-map`                 |
| Feature intent, acceptance criteria, edge cases                                                                         | `docs/02-business-product/`                                                                                                                         | `akinator-product-map`                  |
| Deployment, migration, restart, recovery, rollback                                                                      | `docs/11-runbooks/`                                                                                                                                 | `akinator-ops-map`                      |
| A structural fact that changed                                                                                          | `context/`                                                                                                                                          | `akinator-contextify`                   |
| A surprise, a preference, a decision worth remembering                                                                  | `memory/`                                                                                                                                           | `akinator-memoize`                      |
| A requirement added, reworded, found missing or dropped                                                                 | the requirements register                                                                                                                           | `akinator-wiki`                         |
| A change of direction - business, product, scope, architecture                                                          | the drift log, and every page it made untrue                                                                                                        | `akinator-wiki`                         |
| A dependency added, removed, upgraded, or one that bit                                                                  | its library page: regenerated facts, curated why                                                                                                    | `akinator-wiki`                         |
| Anything a wiki category holds - architecture, infra, testing and UAT, UX, project status, market, glossary, onboarding | the wiki category page, or the home it indexes                                                                                                      | `akinator-wiki`                         |
| A command, prerequisite, setup step or user-visible feature                                                             | the README and every install page                                                                                                                   | this station                            |
| Anything an agent must know to act here                                                                                 | every router together - `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `GEMINI.md`, every other agent entry file, the Cursor rules, the Copilot instructions | `akinator-router-sync`                  |

Never write the same fact into two homes. The second one is a link.

This table covers the code change. The full per-prompt fan-out - every home a
prompt can move, including decisions made with no diff at all - is
[akinator-wiki](akinator-wiki.md). Walk it too: a change that is documented in
its code docs and nowhere in the wiki, the README or the routers is half
documented.

### 4. Write it so it earns its bytes

Each doc change states:

- **The fact**, in the fewest words that are still true.
- **The why**, including what was rejected and on what grounds.
- **The when-not-to.**
- **What would make this stale** - "regenerate when the route table changes",
  "review when a second payment provider is added". Every doc carries this line;
  it is what makes staleness detectable instead of discovered.
- **Links to the code** it describes, by path.

### 5. Handle deletion

When behavior is removed:

1. Find every doc that described it - grep the removed symbols, routes, flags and
   feature names across `docs/`, `rules/`, `context/`, `memory/`, the wiki, the
   README and install docs, and every router.
2. Delete or correct each one **in this batch**.
3. Mark every requirement it satisfied as **dropped**, with why and who decided,
   and add a drift log entry if the product changed direction
   ([akinator-wiki](akinator-wiki.md)). Deleting the requirement instead invites
   someone to rebuild it.
4. If the behavior was removed for a reason worth knowing, that reason is an ADR
   or a memory entry - the knowledge outlives the code.

A doc describing deleted behavior is a **critical** finding in
`akinator-coverage`. Leaving one behind is worse than never having written it.

### 6. Verify against the tree

Before the batch is done, for each doc you touched:

- Every file path named in it exists.
- Every symbol, route, flag, command and env var named in it exists.
- Every code snippet reflects current code, not the version you started from.

This verification is what separates documentation from fiction.

## Failure modes and pitfalls

- **The what-restating doc.** "The `applyQuota` function applies the quota."
  Delete it; write why quota is applied there and nowhere else.
- **Documenting the plan instead of the change.** Docs describe what is true now,
  not what you intended.
- **Writing the doc from the diff.** The diff shows the change; the doc needs the
  resulting state. Read the final file.
- **Deferring to a follow-up.** Prohibited. The batch is not done.
- **New home creation.** Before creating a doc, check whether the fact already
  has a home. Two homes means two versions means one of them is wrong.
- **Missing the staleness line.** A doc without it cannot be audited and will rot
  silently.

## Definition of done

- [ ] A change-provenance record exists for every meaningful change, or a mechanical-only `knowledge delta: none — <reason>` is recorded.
- [ ] `akinator_trace.py check` exits 0: every changed path is accounted for.
- [ ] A shipped change bumped the version everywhere and `akinator_version.py check --base HEAD` exits 0.
- [ ] The four questions were asked for this change, and answered or explicitly
      dismissed.
- [ ] Every answer is written into exactly one canonical home.
- [ ] The wiki fan-out was walked: requirements register, drift log, library
      pages and wiki categories are current where the change affected them, or
      stated unaffected.
- [ ] The README, the install docs and every agent router say the same thing
      as the change.
- [ ] Every doc touched states what would make it stale.
- [ ] Every path, symbol and command named in a touched doc exists in the tree.
- [ ] If behavior was deleted, every doc describing it was found and corrected in
      this batch.
- [ ] Every new doc is reachable from an index (`akinator-index-sync`).
