# Akinator Intake - the question engine

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: at the start of every prompt that can change the repository, whenever a request has two readings that lead to materially different work, and when implementation forces a product decision no document answers. Runs a thorough, grouped, ranked question battery - every question paired with a recommended default - then converts every answer into a permanent artifact so the same question is never asked twice.

An unasked question becomes an unrecorded assumption becomes a production bug.
An asked-and-unrecorded question becomes the same bug one session later.

The engine asks **many questions, every prompt, up front, in one message** - as
many as the gaps and ambiguities warrant, typically five to fifteen - and **near
zero mid-flow**. Every question carries the answer you would pick, so "go with
recommendations" is always a complete reply and a thorough battery costs the
owner one word. An agent that interrupts mid-flow for something the knowledge
layer already answers has failed just as badly as one that guesses on a genuine
void.

## When to use

- **Intake** - at the start of every prompt that can change the repository,
  before planning.
- **Ambiguity gates** - whenever two readings of the request lead to materially
  different work. Never guess on money, permissions, data deletion, security or
  public contracts.
- **Business-rule voids** - when implementation forces a product decision no doc
  answers ("what happens to quota on refund?"). Stop, ask, file the answer as
  business documentation, then code past it.
- **Drift** - when a prompt contradicts a recorded requirement, rule or
  decision. Ask whether the direction changed before building the contradiction
  ([akinator-wiki](akinator-wiki.md)).

## When NOT to use

- Routine judgment calls a careful senior colleague would make alone. Make them,
  record them as decisions ([akinator-decide](akinator-decide.md)), move on.
- Anything the knowledge layer already answers. Answer from the layer and **cite
  where** - the citation is the proof that the layer was read.
- Mid-implementation, for questions that were answerable at intake. That is an
  intake failure, not diligence; note it and improve the battery.
- Genuinely trivial work - a typo, formatting. Say so in one line and ask
  nothing.

## Procedure

### 1. Resolve before asking

Read the layer first (routers, rules, skills, context, memory, the brief and
generated manifests, the wiki, the requirements register, the drift log, docs,
and the ledger's answered questions). Every question the layer answers is struck
from the battery, and its answer is cited in your intake summary. A battery that
stops repeating itself is the product working; a battery that shrinks because
nobody looked for gaps is not.

### 2. Gather the candidates

Three sources, all of them, every prompt:

```bash
python <upstream>/scripts/akinator_wiki.py gaps          # every recorded unknown, by page
python skills/akinator/scripts/akinator_scope.py questions    # the ranked ask for what this change touches
```

The third source is you: every ambiguity in the prompt, every requirement it
implies that the register does not hold, every place it contradicts what is
recorded, and every group below that the work touches. Keep the wiki gaps that
bear on this prompt's area; the rest wait for the prompt that touches them.

### 3. Rank, default, group - then ask once

**Rank** by what a wrong assumption would cost:

1. Money, permissions, deletion, security, public contracts - first, always.
2. Anything that contradicts a recorded requirement or decision (drift).
3. Questions that change the shape of the work - scope, users, done.
4. Questions that change its details.
5. Knowledge gaps the work does not depend on but the wiki is missing.

**Default** every question: the answer you would choose, and the one-line why.
A question with no default forces the owner to do your analysis; a question with
one lets them answer "yes" or "go with recommendations".

**Group** into one message, highest-ranked first. The scope tool's interrupt
budget caps how many go in one message - it keeps fifteen questions one message
rather than fifteen interruptions; a repository may lower it. Anything below the
cut is not dropped: it is already a gap marker, or you write it as one.

```text
Before I start - 9 questions. Reply "go with recommendations" to accept every default.

Money and permissions
  1. Should a refunded export restore quota?        Recommended: yes, proportionally (business page, quotas)
  2. Can a non-admin see the export button?         Recommended: no, hide it (matches the permission map)
Scope
  3. Is per-member export in scope?                 Recommended: no, not yet (non-goal on the product page)
...
```

### 4. The battery - the groups to draw from

Ask what the work touches and the layer does not answer. The groups are a
checklist for finding questions, not a script to recite.

**Goal and scope**

- What outcome are we buying? What changes for a user when this ships?
- What is explicitly a non-goal for this piece of work?
- What is the appetite - a fix, a feature, or a rebuild?

**Requirements and drift**

- Which requirement does this satisfy? Is it new, a change, or one that was
  missing?
- Does it contradict anything recorded? If so, has the direction changed, and
  who decided?

**Value and priority**

- Who pays for this, directly or indirectly? What is it worth?
- What gets cut first if this conflicts with something else in flight?

**Users and blast radius**

- Which users or tenants are affected? Which are explicitly not?
- What existing behavior must not change?

**Rules and edges the owner cares about**

- What must never break, even at the cost of shipping late?
- Which edge cases have a business answer already, and which are undecided?
- Anything touching money, permissions, deletion, security or a public contract?

**Definition of done, in their words**

- How will you know this worked? What would you check first?
- What would make you say "that shipped but it is wrong"?
- Who accepts it, and against which UAT script?

**UX and design**

- Which flow does this change? Is there a design, a pattern it must follow, an
  accessibility requirement?

**Stack and libraries**

- Does this add, remove or upgrade a dependency? Is one already approved, or
  already rejected?

**Operational consequence**

- Does this change how the system is deployed, migrated, restarted, or recovered?
- Is there an ordering constraint - what must rebuild, in what order, what can
  run in parallel?
- Does it change running cost?

**Business and product**

- What does the business do, for whom, and how does it earn? Which product
  rules are settled?

**Tools, environment, integrations, repositories, providers**

- Which tools and commands, environment variables, third-party integrations,
  repositories and providers does this use, and who owns each?

**Sensitive data classification**

- Which fields, files or variables are secret or personal, how are they
  classified, who rotates them? Names and locations only, never values.

**Install manual**

- How is this installed and set up from zero, on which platforms?

**Project and market**

- Which milestone does this serve? What does it unblock, and what is now at risk?
- Does it change how the product is positioned or sold?

### 5. Route every answer to a permanent home - immediately

This is the station that makes the engine pay for itself. Each answer goes to
its home **in this batch**, not later, and the gap marker it answers is replaced
in the same edit:

| Answer type                                                                              | Home                        | Reference                                                              |
| ---------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| A business rule, a number, a money or entitlement semantic                               | `docs/business/`            | [akinator-business-map](akinator-business-map.md)                      |
| Feature intent, acceptance criteria, an edge-case decision                               | `docs/02-business-product/` | [akinator-product-map](akinator-product-map.md)                        |
| A requirement - new, changed, found missing, or dropped                                  | the requirements register   | [akinator-wiki](akinator-wiki.md)                                      |
| A change of direction                                                                    | the drift log               | [akinator-wiki](akinator-wiki.md)                                      |
| Anything a wiki category holds - market, UX, testing, project, glossary, a library's why | the wiki page               | [akinator-wiki](akinator-wiki.md)                                      |
| A hard constraint others must not break                                                  | `rules/`                    | [akinator-rule-forge](akinator-rule-forge.md)                          |
| A repeatable procedure the owner described                                               | the repository's own skills | [akinator-skillify](akinator-skillify.md)                              |
| An operational consequence or ordering constraint                                        | `docs/11-runbooks/`         | [akinator-ops-map](akinator-ops-map.md)                                |
| A decision between real alternatives                                                     | `docs/13-adr/`              | [akinator-decide](akinator-decide.md), [akinator-adr](akinator-adr.md) |
| A durable preference or surprise                                                         | `memory/`                   | [akinator-memoize](akinator-memoize.md)                                |
| A structural fact                                                                        | `context/`                  | [akinator-contextify](akinator-contextify.md)                          |

Then record the question and its answer in the ledger, so no future session asks
it again:

```bash
python skills/akinator/scripts/akinator_ledger.py add question --title "..." \
  --field asked="..." --field answer="..." --field answered_by="..."
```

"Go with recommendations" is an answer: every default it accepted is filed as
if the owner had typed it, with the owner named as the one who accepted it.

### 6. Record the unanswered

Questions the owner deferred are not dropped. Each stays - or becomes - the
exact gap marker line `_Unknown - ask the owner and record the answer._` in its
home, and goes under an explicit **Open questions** heading with the date and
what it blocks. An open question that is written down is knowledge; one that is
only remembered is a bug waiting for a deadline.

## Failure modes and pitfalls

- **Asking what the layer answers.** Every such question tells the owner the
  documentation is not being read. Resolve first, always.
- **Asking too little.** Three polite questions on a prompt that touches money,
  scope and a public contract leaves the rest to guesswork. The count follows
  the gaps, not a sense of politeness.
- **Asking with no shape.** An unranked wall with no defaults gets a three-word
  answer. Group, rank, lead with what changes the work most, and pair every
  question with the answer you would pick.
- **A question without a default.** Pushes your analysis onto the owner and
  makes "go with recommendations" impossible.
- **Blocking on questions you could proceed past.** Do everything that does not
  depend on the answer first. Reserve a hard stop for cases where proceeding
  under any assumption would be unsafe or would make the work useless if wrong -
  money, permissions, deletion, security, public contracts.
- **The drip.** Questions spread across five messages. Ask once, grouped.
- **Answering your own question and not writing it down.** If you decided, that
  is a decision: it goes to the ledger or an ADR with its why.
- **Filing the answer later.** The answer lives in chat until the session ends,
  then nowhere. File it in this batch.
- **The same question in two sessions.** This is a defect. Find where the first
  answer should have been filed, and file it now.

## Definition of done

- [ ] The layer was read; questions it answered were struck and cited.
- [ ] Candidates came from the wiki gaps, the scope tool and the prompt itself.
- [ ] The battery was ranked - money, permissions, deletion, security and public
      contracts first - and every question carried a recommended default.
- [ ] Surviving questions were asked in one grouped message.
- [ ] Every answer, including "go with recommendations", is written into its
      home in this batch, and its gap marker was replaced.
- [ ] Every answered question is in the ledger.
- [ ] Deferred questions are gap markers under Open questions, with a date and
      what they block.
- [ ] Assumptions made in the absence of an answer are stated explicitly in the
      plan.
