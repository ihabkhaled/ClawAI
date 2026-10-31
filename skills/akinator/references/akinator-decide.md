# Akinator Decide - decision superpowers

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a choice has to be made - forced by implementation, asked for by the owner, raised by a prompt that contradicts a recorded decision, or triggered by a decision's revisit condition. Sorts every decision into decide-and-record or recommend-and-ask, builds real options with their costs, makes one clear recommendation, and records the outcome so it is never argued twice.

Context is only power if it is used to decide. An agent that has read the wiki,
the ledger, the brief, the ADRs, the requirements register and the drift log
and still asks the owner about everything is wasting the owner. An agent that
decides the irreversible alone because it "had enough context" is wasting the
company. This station draws the line between the two, and makes both halves
cheap: small decisions are made and written down in one line; large ones arrive
at the owner as a short, costed, recommended choice they can answer in a word.

## When to use

- Implementation forces a choice between real alternatives.
- The owner asks "what should we do?", "what do you recommend?", or answers
  "go with your recommendation".
- A prompt contradicts a recorded requirement, rule, decision or business rule -
  a possible drift.
- A gap blocks the work and the loaded context holds enough evidence to propose
  an answer rather than only ask the question.
- A recorded decision's revisit condition fires - a threshold crossed, a failure
  recurring, a vendor change, a requirement changed.

## When NOT to use

- The decision is already recorded and no revisit condition has fired. Cite it
  and follow it. Re-opening a settled decision without new evidence is noise.
- Consequence-free choices - a local variable name, the order of two
  independent edits. No ceremony.
- Questions of intent - "what outcome do you want?" is intake
  ([akinator-intake](akinator-intake.md)), not a decision between options.
- As cover for guessing. A recommendation with no cited evidence is a guess
  with formatting.

## Procedure

### 1. Load the context, and cite it

**You own reversible decisions.** Decide, record, name the owner and the
revisit-when; do not hand them back. Find who or what already decided with
`python skills/akinator/scripts/akinator_context.py owners --paths <path> ...`.

Read, in this order, only what bears on the decision:

1. The brief - the composed picture of the repository.
2. The wiki page for the area, and the category pages it touches - product,
   business, architecture, libraries ([akinator-wiki](akinator-wiki.md)).
3. The requirements register rows and drift log entries for the area.
4. Recorded decisions and ADRs for the area, and their revisit conditions:
   `python skills/akinator/scripts/akinator_ledger.py list --type decision`.
5. Failures for the area - `python skills/akinator/scripts/akinator_ledger.py list --recurring` -
   because the option that already failed once is not a fresh option.
6. The rules that apply. A rule is not an option to weigh; it is a boundary.

Every claim the decision rests on **names its source** - the page, the
requirement id, the ADR number, the ledger id. A decision whose evidence cannot
be cited is not evidenced; the missing evidence is a gap, and a gap is a
question.

### 2. Classify - the decision matrix

Run three tests:

- **Reversibility** - can it be undone in one ordinary commit, with no data
  loss, no migration and nobody outside the repository noticing?
- **Blast radius** - does it touch money, permissions, deletion, security, a
  public contract (an API, a schema, a file format, a CLI flag or event others
  depend on), legal or compliance, or the architecture in a way that cannot be
  walked back?
- **Evidence** - does the cited context point clearly one way?

| Class                                          | Test results                                                                                                                     | Examples                                                                                                                                               | Who decides                                                                                                                                                                | What you produce                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **A - decide and record**                      | Reversible, no blast radius, evidence points one way                                                                             | Structure inside a module, an existing helper over a new one, test layout, a doc's layout, a patch-level upgrade with green checks                     | The agent                                                                                                                                                                  | The decision, made; one ledger record; carry on                                                            |
| **B - recommend, then proceed on the default** | Reversible, but visible or costly - a new dependency, a module boundary, a default users see, a performance-for-simplicity trade | The agent recommends; the owner may override                                                                                                           | Options and a recommendation in the grouped ask; proceed on the recommended default only where the owner has said to, or where undoing it later is one commit - and say so |
| **C - the owner decides**                      | Any blast-radius hit, or irreversible, or the evidence is split, or it contradicts a recorded requirement or decision            | Pricing, a permission model, deleting data or a feature, an auth or crypto choice, a breaking API change, a datastore migration, a new vendor contract | The owner                                                                                                                                                                  | 2-4 costed options, one recommendation, a question - and nothing that depends on the answer until it comes |

Two laws the matrix never bends:

- **Money, permissions, deletion, security and public contracts are always
  class C**, however strong the evidence looks. Strong evidence makes a better
  recommendation, not a licence.
- **When in doubt, go up a class.** Asking one question too many costs a
  sentence; deciding one too many can cost the company.

### 3. Build the options - classes B and C

Two to four **real** options. The status quo counts when it is genuinely
viable. A strawman included to make the favourite look good is gaming
([akinator-anti-gaming](akinator-anti-gaming.md)).

Score each option on the same six axes:

| Axis                | Say                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Cost**            | To build, to run, in licences, and in AI and token spend if it changes how agents work here |
| **Risk**            | What fails, how badly, how likely - and what the ledger says already failed                 |
| **Business impact** | Which requirement it satisfies, who gains, who loses, what revenue or exposure moves        |
| **Effort**          | Rough size, and what it displaces                                                           |
| **Reversibility**   | One commit, a migration, or never                                                           |
| **Evidence**        | The cited pages, requirements, ADRs and ledger ids that support it                          |

### 4. Recommend - one, clearly

State the recommended option, why in one or two sentences, what would change
your mind, and the default you will proceed with if the answer is "go with
recommendations". "It depends" is not a recommendation; name what it depends on
and pick the branch the evidence favours.

```text
Decision needed (class C - public contract): how exports reach enterprise buyers.

  A. Signed download link, 7-day expiry   cost low  | risk low  | reversible: one commit
  B. Push to the customer's bucket        cost med  | risk med  | reversible: needs a migration
  C. Keep support-run exports             cost high | risk low  | loses deals (requirement 14)

Recommendation: A - meets requirement 14 today, cheapest to reverse, and B can be
added later without breaking it. Would change my mind: a customer contract that
forbids links. If you say "go with recommendations", I proceed with A.
Evidence: product page for bulk export; requirement 14; ledger decision 0007.
```

### 5. Ask - once, in the grouped battery

A class C decision goes into the intake battery
([akinator-intake](akinator-intake.md)), ranked first, with its recommended
default. Class B decisions go in the same message, lower down. Keep working on
everything that does not depend on the answer; say explicitly what is waiting.

### 6. Record - every class, every time

- **Class A** - a ledger decision record, the same batch:

  ```bash
  python skills/akinator/scripts/akinator_ledger.py add decision --title "..." \
    --field what="..." --field alternatives="..." --field why="..."
  ```

- **Classes B and C** - an ADR ([akinator-adr](akinator-adr.md)) with the options
  as presented, the recommendation, **what was chosen, by whom and when** - the
  owner by name, or "the owner, via go-with-recommendations" with the date -
  whether the choice matched the recommendation, the consequences and the
  revisit condition.
  An override of the recommendation is information: record the reason given.
- If the decision changed direction, a drift log entry, and every requirement
  and page it made untrue is corrected ([akinator-wiki](akinator-wiki.md)).
- If it creates a constraint others must not break, a rule
  ([akinator-rule-forge](akinator-rule-forge.md)).
- If an agent must know it to act, every router, together
  ([akinator-router-sync](akinator-router-sync.md)).

### 7. Revisit - supersede, never edit

Every recorded decision carries its revisit condition. When one fires - a
recurring failure in the ledger, a requirement changed, a threshold crossed, a
vendor or price change - run this procedure again from step 1. The old record is
marked superseded and linked forward, never rewritten; the chain is how the next
agent learns why the current answer is shaped the way it is.

## Failure modes and pitfalls

- **Asking what the layer already decided.** Tells the owner their decisions
  are not read. Cite and follow.
- **Deciding class C alone** because the evidence "was obvious". The owner owns
  money, permissions, deletion, security and public contracts - always.
- **Strawman options.** One real option and two decoys is a decision already
  made, presented as a choice.
- **Options with no cost or reversibility.** The owner cannot choose between
  options they cannot compare.
- **No recommendation, or "it depends".** Pushes the analysis back onto the
  person who asked you to do it.
- **Evidence by assertion.** "The docs say" with no page named. Uncited
  evidence cannot be checked, so it cannot be trusted.
- **The unrecorded "go with recommendations".** The owner's one-word answer is a
  decision like any other; not writing it down means the question returns.
- **Re-litigating** a recorded decision without new evidence or a fired revisit
  condition.
- **Recording the choice without the rejected options.** The rejected options
  are the only durable part.

## Definition of done

- [ ] The context was loaded and every claim cites its source by page, id or
      number.
- [ ] The decision was classified A, B or C by the three tests; money,
      permissions, deletion, security and public contracts were class C.
- [ ] Class A: decided and recorded in the ledger in the same batch.
- [ ] Classes B and C: two to four real options, each scored on cost, risk,
      business impact, effort, reversibility and evidence; one clear
      recommendation with its default.
- [ ] Class C was asked in the grouped battery and nothing dependent proceeded
      before the answer.
- [ ] The outcome is recorded - ADR or ledger - with who decided, whether it
      matched the recommendation, and when to revisit.
- [ ] Any drift, requirement change, rule or router consequence was written in
      the same batch.
