# Akinator Rule Forge - station 8

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: a change establishes a constraint others must not break - an invariant, a forbidden pattern, a required call path, a boundary. Turns it into a numbered rule that carries a real enforcement mechanism, never prose alone.

A constraint that lives in a code comment, a review remark or someone's memory is
not a constraint. It is a hope. Within three months a well-meaning contributor
will break it, and the review that would have caught it will be done by someone
who was not in the original conversation.

**A rule without a live enforcement mechanism is not a rule.** That is the single
law of this station, and `akinator-coverage` fails any rule that violates it.

## Failure-to-rule path

Every failure encountered during work is recorded in the failure/lesson ledger
with symptom, root cause, fix and verification. Then ask: **would a reusable
constraint prevent this class of failure from recurring?** If yes, this station
is mandatory: forge that constraint into an enforced rule and link the failure
record. If no, keep the failure record and state why a permanent rule would be
incorrect. Never turn a transient outage or one-off external failure into a fake
invariant.

## When to use

The change or a failure established something that must hold from now on:

- An invariant ("quota may only be mutated through `applyQuota`").
- A forbidden pattern ("no direct `process.env` reads outside `config/`").
- A required path ("all outbound HTTP goes through the retrying client").
- A boundary ("the billing module may not import from the UI module").
- A required-with-something pairing ("every migration ships with a rollback").

## When NOT to use

- A preference with no cost when violated. That is `memory/`, not a rule.
- A procedure. That is a skill.
- A one-off decision that does not constrain future work. That is an ADR.
- A constraint the platform already enforces. If the type system, the linter or
  the compiler makes it impossible, the rule is redundant - though a one-line
  note pointing at the mechanism may still help.

## Procedure

### 1. State the constraint as a testable proposition

Write it so that a machine could, in principle, decide whether the tree obeys it.

```
Bad:  "Be careful with quota mutations."
Good: "Quota fields are written only inside src/quota/apply.ts.
       No other file assigns to them."
```

Akinator ships a rule template with a fully worked example.

If you cannot state it testably, you do not yet understand the constraint well
enough to enforce it - and an unenforceable rule will be ignored.

### 2. Find or build the enforcement mechanism

Choose the cheapest mechanism that actually catches the violation:

| Mechanism                             | Use when                               | Cost                            |
| ------------------------------------- | -------------------------------------- | ------------------------------- |
| Type system / compiler                | The constraint is structural           | Free, catches at authoring time |
| Existing linter rule                  | A rule already exists for this pattern | Near free                       |
| Custom lint rule / AST check          | A pattern must be forbidden repo-wide  | Moderate, very reliable         |
| Unit test asserting the invariant     | The constraint is behavioral           | Cheap, runs with the suite      |
| Architecture test (import boundaries) | The constraint is a module boundary    | Cheap                           |
| A script run in CI                    | Nothing above fits                     | Moderate                        |
| Code review checklist                 | **Last resort only**                   | Unreliable - decays             |

**The mechanism must exist in the tree before the rule is written.** Naming a
script that does not exist is exactly the fake compliance this station is
designed to prevent.

### 3. Never put it in a git hook

Knowledge and constraint checks do not go into pre-commit or pre-push hooks. Git
hooks gate code and must stay fast; loading them with checks produces slow
commits, bypassed hooks and timeout flakiness that reads as real failure.
Enforcement lives in the type system, the test suite, CI, and session behavior.
This is a hard design rule, and it has no exceptions.

### 4. Write the rule

Use the repo's existing rule format if it has one; otherwise
Akinator's rule template. Numbered, one file per rule, containing:

- **Purpose** - what breaks if this is violated, concretely.
- **Applies to** - the paths, modules or situations in scope, and what is
  explicitly out of scope.
- **Mandatory rules** - the testable propositions.
- **Prohibited patterns** - real code showing what is wrong.
- **Correct pattern** - real code showing what is right.
- **Enforcement** - the exact mechanism, by path: the test file, the lint rule,
  the CI step. This section is verified by `akinator-coverage`.
- **Exceptions** - when the rule does not apply, and how an exception is
  recorded. A rule with no legitimate exception path gets violated silently.
- **Related** - skills, context maps and docs.

### 5. Index it and sync the routers

Add it to the rules index and reflect it in every AI router file in the same
change (`akinator-index-sync`, `akinator-router-sync`).

## Failure modes and pitfalls

- **The prose rule.** Written, indexed, unenforced, violated within the quarter.
  The most common failure and the one this station exists to prevent.
- **Naming a mechanism that does not exist.** The coverage check catches it, but
  the real cost is the false confidence in between.
- **Weakening the check to make it pass.** Never. A red check is information -
  fix the tree or change the rule deliberately, with an ADR.
- **A rule so broad it is always violated.** It gets suppressed everywhere and
  becomes noise. Scope it to where it actually matters.
- **A rule with no exception path.** Reality produces exceptions; without a
  recorded path for them, people take unrecorded ones.
- **Putting the enforcement in a git hook.** Prohibited.

## Definition of done

- [ ] The constraint is stated as a testable proposition.
- [ ] An enforcement mechanism exists **in the tree** and is named by path in the
      rule.
- [ ] The mechanism is not a git hook.
- [ ] The rule shows both a prohibited and a correct pattern, in real code.
- [ ] The rule names its exception path.
- [ ] The rule is numbered, indexed and reflected in every router.
- [ ] The mechanism was run once and observed to pass on the current tree.
