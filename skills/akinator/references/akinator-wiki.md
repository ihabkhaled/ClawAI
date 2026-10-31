# Akinator Wiki - the living wiki: every prompt, every change, documented

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: after every prompt that changes or decides anything - code, scope, a requirement, a business rule, a library, a priority, a plan - and at onboarding, when the repository has no wiki yet. Updates every affected home in the same batch, so any agent that reads the repository knows the product, the business, the requirements, the drift, the stack and the decisions without asking anyone.

The repository is its own Confluence. Everything a new engineer, a new agent, a
product manager or an auditor would otherwise have to ask a person lives in the
tree, next to the code it explains, and changes in the same commit as that code.
From the needle to the rocket: the one-line pitfall in a date library, and the
market the product is sold into.

Two things make that possible, and both are mandatory:

1. **Every prompt fans out.** A prompt that changed or decided anything updates
   every home it affected - not the one that felt closest - in the same batch.
2. **Unknowns are written as unknowns.** A fact nobody knows is recorded as the
   exact gap marker line `_Unknown - ask the owner and record the answer._` -
   never as a plausible guess. A gap is a question the next prompt asks; a guess
   is a lie the next agent trusts.

The payoff is cost as much as quality: an agent that can read the answer spends
seconds and a few thousand tokens; one that has to re-derive it from the code,
or ask, spends minutes, tokens and the owner's attention.

## When to use

- **After every prompt that changes the repository** - a feature, a fix, a
  refactor, an upgrade, a deletion, a migration.
- **After every prompt that decides something, even with no code change** - a
  requirement added or dropped, a scope cut, a priority change, a new market, a
  business rule settled in conversation. Decisions without diffs are the ones
  that vanish.
- **When a question is answered** - the answer goes into its home immediately,
  and the gap marker it replaces is deleted in the same edit.
- **When a dependency is added, removed, upgraded, or bites.**
- **At onboarding**, to find or found the wiki.
- **Before a release, handover or audit** - run the check and the gap list.

## When NOT to use

- Pure conversation with no decision and no change. Answer from the wiki and
  cite the page; that citation is the wiki working.
- To restate what the code plainly says. Every page faces the
  delete-the-derivable test ([akinator-anti-gaming](akinator-anti-gaming.md)).
- To build a second wiki beside one that exists. Adopt the repository's docs
  home, its handbook, its specs folder; the categories below map onto it.
- To fill a page with text that sounds right. Unknown is the gap marker.
- Genuinely trivial work - a typo, formatting. Record
  `knowledge delta: none, because ...` in one line and stop.

## Procedure

### 1. Find the wiki, or found it - adopt, never impose

Look for what already holds this knowledge: a docs home, a handbook, a specs
or requirements folder, an ADR folder, a changelog, a product brief, a mirrored
wiki. Map each category below onto the existing home and record the mapping
([akinator-onboard](akinator-onboard.md)). Only then create what is missing:

```bash
python <upstream>/scripts/akinator_wiki.py init     # create missing category pages; never overwrite one
python <upstream>/scripts/akinator_wiki.py index    # regenerate the wiki index inside its generated markers
python <upstream>/scripts/akinator_wiki.py gaps     # every gap marker, by page - the questions to ask
python <upstream>/scripts/akinator_wiki.py check    # the wiki is whole and current; non-zero exit is a red
```

Run any of them with `--help` for the exact flags. Generated sections live
between `<!-- akinator:generated:begin -->` and `<!-- akinator:generated:end -->`;
tools rewrite only what is inside the markers, and everything outside them is
preserved byte for byte. Never hand-edit inside the markers - the next run
replaces it - and never let a tool write outside them.

### 2. The categories - what each holds, and the question it answers

| Category          | Holds                                                                                           | Answers                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **product**       | Goals, personas, features, roadmap, success metrics, non-goals                                  | What is this for, and for whom?                               |
| **business**      | Business rules, pricing, plans, money and entitlement semantics, business impact, cost          | What does the business need this to do, and what is it worth? |
| **market**        | Segments, competitors, positioning, pricing benchmarks, go-to-market and marketing notes        | Why would anyone choose this over the alternative?            |
| **requirements**  | The register: every requirement, current, changed, missing or dropped, with its source          | What must be true, who asked, and since when?                 |
| **drift**         | The log of every change of direction: before, after, why, who                                   | What used to be true, and why is it not any more?             |
| **architecture**  | Components, boundaries, data flow, integration points, links to ADRs                            | How does it fit together, and why this shape?                 |
| **libraries**     | One page per load-bearing dependency: generated facts plus the curated why                      | Why this library, how do we use it, what bit us?              |
| **stack**         | Languages, runtimes, frameworks, versions - generated                                           | What does it run on?                                          |
| **infra**         | Environments, deployment, CI/CD, observability, secret _handling_ (never secrets), running cost | Where does it run and how does it ship?                       |
| **testing**       | Test strategy, what each suite proves, UAT scripts and sign-off state                           | How do we know it works, and who accepted it?                 |
| **ux**            | Flows, design system, accessibility, copy and tone, design decisions                            | What does the user see and why does it look like that?        |
| **roadmap**       | What is planned, in what order, and what is deferred                                            | What is next, and what are we not doing yet?                  |
| **history**       | Versions, releases and the timeline of the repository (generated)                               | What happened, and in which version?                          |
| **data**          | Stores, schemas, retention, data flow; PII fields by name                                       | Where does data live, and for how long?                       |
| **services**      | Deployable services, their owners and dependencies                                              | What runs, and who owns it?                                   |
| **observability** | Logs, metrics, alerts, dashboards, on-call                                                      | How do we know it is healthy?                                 |
| **standards**     | Coding, naming, review and release conventions                                                  | What is the house style, and who enforces it?                 |
| **security**      | Threat model, auth, and the register of what is sensitive - by name and location, never value   | What must never leak, and where does it live?                 |
| **integrations**  | Third-party providers and APIs: purpose, owner, failure behavior                                | What do we depend on outside, and what if it is down?         |
| **risks**         | Open risks with likelihood, impact, owner and mitigation                                        | What could hurt us, and who watches it?                       |
| **project**       | Status, milestones, owners, risks, blockers, what is next                                       | Where are we, and what is in the way?                         |
| **decisions**     | The index of ADRs and recorded decisions                                                        | What was chosen, over what, and when to revisit?              |
| **changes**       | One change record per meaningful change                                                         | What changed, when, why, and by whom?                         |
| **glossary**      | Every domain term, defined once                                                                 | What does this word mean _here_?                              |
| **onboarding**    | Reading order, setup, first tasks, who to ask                                                   | Where does a newcomer - human or agent - start?               |

That is 25 categories. Tools own the generated pages: `extract_platform.py`
writes data, services, observability, standards, security and integrations;
`extract_history.py` writes history; `extract_operations.py` writes
`infra/{tools-and-commands,environment-variables,repositories,installation}.md`;
`akinator_sensitive.py register` writes the sensitive-data page in the wiki's security home. Each takes
`--write` or `--check` and rewrites only inside its markers.

**Everything that changes is documented - including the 0.01%-impact fact**: a
flag default, a timeout, a one-line pitfall. Cheap to write now, expensive to
rediscover. The delete-the-derivable test still applies; what the code cannot
say is what goes in.

**Security: document what is sensitive by name and location, never value** - the
variable, the column, the vault path, who rotates it. Pre-check text first with
`python skills/akinator/scripts/akinator_sensitive.py guard FILE`; find leaks with
`akinator_sensitive.py scan`.

One home per fact. When the repository already has a home for a category - a
business folder, an ADR folder - the wiki page for that category is an **index
into it**, not a copy of it. The second copy of a fact is a link.

### 3. After every prompt - the fan-out

Walk this table for every prompt that changed or decided anything. For each
row, either update the home in this batch or say in one line why it is
unaffected. "Unaffected" is a judgment you state; silence is a skipped row.

| Home                                                                                                                                  | Update when                                                                                                         | How                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Code docs - docstrings, module READMEs                                                                                                | An interface, behavior or invariant changed                                                                         | In the code, beside it                                                      |
| Wiki categories                                                                                                                       | Anything in the table above moved                                                                                   | The category page, or the home it indexes                                   |
| README and install docs                                                                                                               | A command, prerequisite, setup step, supported platform or user-visible feature changed                             | The README the user reads first, and every install page                     |
| Routers - `CLAUDE.md`, `AGENTS.md`, `CODEX.md`, `GEMINI.md`, every other agent entry file, the Cursor rules, the Copilot instructions | A rule, command, home or convention an agent must know changed                                                      | All of them together - [akinator-router-sync](akinator-router-sync.md)      |
| Rules                                                                                                                                 | A new constraint others must not break                                                                              | [akinator-rule-forge](akinator-rule-forge.md)                               |
| Skills - the repository's own                                                                                                         | A procedure that will happen twice                                                                                  | [akinator-skillify](akinator-skillify.md)                                   |
| Context maps                                                                                                                          | A structural fact changed                                                                                           | [akinator-contextify](akinator-contextify.md)                               |
| Memory                                                                                                                                | A durable preference, surprise or dead end                                                                          | [akinator-memoize](akinator-memoize.md)                                     |
| The ledger                                                                                                                            | A failure, an answered question, a decision, a surprise; requirement and drift events where the ledger records them | `python skills/akinator/scripts/akinator_ledger.py add ...`                 |
| Requirements register                                                                                                                 | A requirement was added, reworded, found missing, or dropped                                                        | Section 5 below                                                             |
| Drift log                                                                                                                             | Business, product, scope, architecture or market changed direction                                                  | Section 6 below                                                             |
| Library pages                                                                                                                         | A dependency was added, removed, upgraded, or caused a failure                                                      | Section 7 below                                                             |
| Decisions                                                                                                                             | A choice between real alternatives                                                                                  | [akinator-decide](akinator-decide.md), then [akinator-adr](akinator-adr.md) |
| Change record                                                                                                                         | Every meaningful change                                                                                             | Section 4 below                                                             |
| The brief                                                                                                                             | At the end of the batch, always                                                                                     | `python <upstream>/scripts/build_brief.py --write`                          |

The routing detail for code changes - the four questions the code cannot
answer, deletion, truth-checking - is
[akinator-document-change](akinator-document-change.md). This station widens it
from "the code changed" to "anything changed".

### 4. The change record - one per meaningful change

Use the repository's changelog or history convention; otherwise Akinator's
change-record template. Every record carries:

- **What** changed, and **why** - the problem, the evidence.
- **Who / which agent**, and **when**. Never invent an identity or a date; an
  unknown one is the gap marker.
- **Before**, **change**, **now**, and **next** - follow-ups labeled as future,
  never presented as done.
- **Business and product intent** - what this is worth, to whom.
- **Technical reasoning**, the **alternatives** considered and why they lost.
- **Consequences** - compatibility, migration, rollback, cost, risk.
- **Verification** - what was actually run and observed.
- **Stale when** - the event that would make its current-state claims untrue.

History is not current truth. The record explains the past; the category pages
describe the present. Update both.

### 5. The requirements register

Every requirement the product has, in one register, each entry with an id that
is never reused, a testable statement, a status, a priority, its **source**
(who asked, where, when - the prompt counts), acceptance criteria, an
append-only change history and links to what it touches. Akinator's requirement
template has the shape.

| Status      | Means                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **current** | In force as written                                                                                                                                                                      |
| **changed** | In force, reworded or reprioritized since first recorded; the history says from what, and the drift log says why                                                                         |
| **missing** | Needed, but nobody has specified it - found by you, in code, in an incident, in a gap. Its statement is a proposal until the owner confirms it, and it is a question in the next battery |
| **dropped** | No longer wanted. Kept, with why and who decided, so it is not re-proposed                                                                                                               |

Never delete an entry and never rewrite history in place. Every prompt that
asks for something is a requirement source. A requirement you inferred rather
than were told is marked as inferred and confirmed at the next intake.

### 6. The drift log

Drift is an **intended** change of direction - the business, the product, the
scope, the architecture, the market or the UX used to be one thing and now is
another. Unrecorded drift is how documents come to lie: every page written
before it is now wrong, and nothing says so.

Each entry: the area, **before**, **after**, **why**, who decided, the date, the
impact (users, revenue, cost, schedule, risk), and the requirements and docs it
affected - each updated in the same batch. Akinator's business-drift template
has the shape. Append-only: a reversal is a new entry that references the old
one.

**Detect it at intake.** When a prompt contradicts a recorded requirement, rule,
decision or business rule, stop and ask: "the register says X; you are now
asking for Y - is this a change of direction?" Then record the drift, change the
requirement, and supersede the decision ([akinator-decide](akinator-decide.md)).
Never silently implement the contradiction.

### 7. Libraries - generated facts, curated why

```bash
python skills/akinator/scripts/extract_libraries.py --write   # the generated facts, inside the markers
python skills/akinator/scripts/extract_stack.py --write       # the stack and module map
```

The extractor writes what the manifests and lockfiles can tell you. The
curated half - outside the markers - is what they cannot:

- **Why this library**, and what was rejected (an ADR when the choice was real).
- **How we use it** - the wrapper or module that owns it, the convention
  ("always through the client wrapper, never directly"), the call sites that
  matter.
- **Pitfalls and incidents** - the symptom that misled, linked to the ledger.
- **Upgrade and security notes** - pinning policy, breaking changes to watch,
  how advisories are tracked and who acts.

Curate load-bearing libraries first: anything on the request path, in money,
auth or data handling, or that has already caused a failure. Where the why is
not known, write the gap marker - an honest gap on every page beats a confident
paragraph on one. Akinator's library-page template has the shape.

### 8. Honest gaps become questions

`python <upstream>/scripts/akinator_wiki.py gaps` lists every gap marker, by page.
`interview [--limit N]` turns them into a grouped battery (ids `Q<n>`, each with
a recommended default); `answer --page P --line L --text T [--source S]`
replaces one marker and records a ledger `question` - the interview -> answer
loop that turns gaps into recorded answers. Those are the questions the next intake battery asks
([akinator-intake](akinator-intake.md)). When an answer arrives:

1. Replace the marker with the answer **and its source** (who, when) in the same
   edit.
2. Record the question and answer in the ledger so it is never asked twice.
3. If the answer changed something already written, that is drift - section 6.

Never delete a marker without an answer. Never write "TBD", "N/A", "see the
code", or anything that makes an unknown look known - those hide the gap from
the tool that counts it.

### 9. Knowledge at company scale

An organisation adopting this reads the repository for more than code. On every
prompt, ask whether it moved any of these, and update the page or write the gap:

- **Business impact** - who gains, who loses, what revenue or risk moves.
- **Cost** - infrastructure, licences, and AI and token cost of running the
  product and of working on it.
- **Testing and UAT** - what proves it, which acceptance script covers it, who
  signed off and when.
- **UX and design** - which flow changed, the design decision behind it,
  accessibility consequences.
- **Project status** - what milestone this serves, what it unblocks, what is now
  at risk.
- **Market** - whether positioning, a competitor comparison or the pitch changed.

### 10. Verify and close

```bash
python <upstream>/scripts/akinator_wiki.py index
python <upstream>/scripts/akinator_wiki.py check
python skills/akinator/scripts/akinator_coverage.py . --strict
python <upstream>/scripts/build_brief.py --write
```

Then the newcomer test, asked honestly: could a fresh agent, given only the
repository, answer "what is this product for, what changed this week and why,
which requirements are missing, why this library, and what is the owner still
deciding?" Any answer that needs a person is a gap - write it as one.

## Failure modes and pitfalls

- **The parallel wiki.** A new folder of category pages beside a docs home that
  already held half of it. Two homes, two versions, one of them wrong.
- **Filler.** A page that reads well and says nothing checkable, or states an
  invented fact. Worse than a gap: it is trusted.
- **The partial fan-out.** The code doc updated, the README and three routers
  not. The agent reading the stale router acts on the old truth.
- **Decisions without diffs.** A scope cut or a dropped requirement agreed in
  conversation and written nowhere, because no code changed.
- **Rewriting history.** Editing a requirement's wording in place, or deleting a
  drift entry that was reversed. The history is the part that explains today.
- **Hand edits inside generated markers** - silently undone on the next run.
- **An answer given in chat and never filed.** The same question returns next
  session, and the owner learns the wiki is not read.
- **A boilerplate page per trivial dependency.** Generated facts cover breadth;
  prose goes where a decision or a failure is.
- **Secrets in infra pages.** Document where a secret lives and who rotates it,
  never the value.
- **Ceremony on a typo.** The fastest way to get the discipline abandoned.

## Definition of done

Per prompt, before the batch is called done:

- [ ] Every row of the fan-out table was updated in this batch, or stated
      unaffected with a reason.
- [ ] A change record exists for every meaningful change, with who, when,
      before, change, now, next, why, alternatives, verification and stale-when.
- [ ] Every requirement this prompt added, changed, surfaced or dropped is in
      the register with its source and history.
- [ ] Every change of direction is in the drift log, and every page it made
      untrue was corrected.
- [ ] Every dependency added, removed or upgraded has its library page
      regenerated and its curated sections current.
- [ ] Every router, the README and the install docs say the same thing.
- [ ] Every unknown is the exact gap marker line; no filler, no invented facts.
- [ ] Every answer received this prompt replaced its gap marker and is in the
      ledger.
- [ ] Nothing was written inside generated markers by hand, or outside them by
      a tool.
- [ ] The wiki check and the coverage check exited zero, observed; the brief
      was regenerated.
