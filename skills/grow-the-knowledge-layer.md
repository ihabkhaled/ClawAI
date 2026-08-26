# Skill: Grow the Knowledge Layer

The runbook for [rule 33](../rules/33-knowledge-compounding-and-context-velocity.md).
Use it on **every** change — feature, flagship, fix, refactor, migration,
deletion — to work out exactly which knowledge files must move with the code,
and to leave the repo cheaper to work on than you found it.

## When to use

- Before you commit anything. This is the last step of the work, not a follow-up.
- When you learn something that cost you time — a trap, an ordering rule, a
  platform quirk. Write it down while you still understand it.
- When you catch yourself re-deriving something you already worked out once.

## Step 1 — let the tooling tell you what governs the change

```bash
npm run knowledge:context -- --task="<what you are doing>"
```

Read `.ai/local/current-context.md`. The files it lists as governing your task
are, by definition, the files that must be updated if your change alters what
they say. That list is your starting checklist — not a suggestion.

## Step 2 — decide what kind of knowledge you created

| What the change produced                               | Where it belongs                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| A procedure someone will repeat                        | a `skills/*.md` runbook — extend one, or create one                    |
| A constraint others must not break                     | a numbered `rules/*.md`, with an enforcement mechanism                 |
| A behavior of one service                              | that service's `CLAUDE.md` + `docs/04-backend/service-guide-<name>.md` |
| A cross-cutting decision with alternatives             | an ADR in `docs/13-adr/`                                               |
| A product or business rule (price, quota, entitlement) | `docs/` in business language, beside the technical contract            |
| A structural fact (who owns what, what talks to what)  | the matching `context/*.md` map                                        |
| A trap that cost you debugging time                    | the pitfalls section of the nearest rule or skill                      |
| A durable preference or project fact                   | `memory/`                                                              |

If the answer is "none of these," say so explicitly in the PR rather than
silently shipping a knowledge-free change.

## Step 3 — write the _why_, not just the _what_

The code already states what it does. Knowledge earns its place by recording
what the code cannot:

- **Why this way** — and which alternatives were rejected.
- **When not to** — the conditions under which this becomes the wrong choice.
- **What breaks next door** — the non-obvious blast radius.
- **What it costs** — the operational consequence (a rebuild, a migration, a
  cache flush, a reseed).

A fact without its reason cannot be safely changed by the next person, so it
will either be preserved by superstition or broken by accident.

## Step 4 — make it reachable

A file nobody can find does not exist. New rules go into
[`rules/00-master-rules.md`](../rules/00-master-rules.md); new skills go into
[`skills/00-index.md`](00-index.md). `npm run knowledge:verify` fails on an
unindexed file, so this is enforced rather than remembered.

## Step 5 — regenerate the machine layer

```bash
npm run knowledge:build     # .ai/** + workspace AGENTS.md
npm run audit               # inventory snapshot
npm run knowledge:verify    # must print OK
```

Never hand-edit anything under `.ai/**` or the inventory snapshot — they are
derived from the tree, and an edit is overwritten and turns CI red for everyone.

## Step 6 — check it from a cold start

Ask the question a newcomer would ask, and see whether the tree answers it in
seconds:

> "I need to change X. Where do I go, what must I not break, and what do I run
> afterwards?"

If answering still requires reading the implementation, the knowledge delta is
not finished.

## Definition of done

- [ ] The knowledge delta is in the **same commit** as the code.
- [ ] Repeatable procedure → skill. New constraint → rule with enforcement.
- [ ] Every new rule/skill is reachable from its index.
- [ ] The why, the rejected alternatives and the reversal conditions are written.
- [ ] Operational consequences (rebuild vs restart, ordering) are written.
- [ ] `knowledge:build`, `audit` and `knowledge:verify` all pass.
