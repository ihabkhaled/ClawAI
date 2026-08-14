# 32 — Underthinking and Reasoning Balance

## Purpose

[Rules 30](30-agent-self-regulation-and-loop-prevention.md) and
[31](31-anti-gaming-and-semantic-compliance.md) bound excessive reasoning and
close the loopholes for gaming those bounds. Taken alone, they create a
symmetric risk: an agent so eager to avoid nesting, retries, or verification
that it acts before it understands the requirement, skips architecture
context, patches a symptom instead of a cause, or declares completion on the
happy path alone. This rule is the counterweight. It defines the floor
beneath which reasoning must not be cut, so "delivery-first"
([rules/27](27-engineering-mindsets.md) mindset #1) never becomes
"guess-first." The target is neither the minimum reasoning nor the maximum —
it is **sufficient reasoning**: enough to understand, decide, implement,
verify, and deliver correctly, then stop.

## Applies to

Every agent (human or AI) on every task in this repository, alongside
[rules/30](30-agent-self-regulation-and-loop-prevention.md) and
[rules/31](31-anti-gaming-and-semantic-compliance.md).

## Mandatory rules

1. **Sufficient-context rule.** Load the smallest context sufficient for
   reliable execution, not the smallest possible context. Before the first
   edit in an unfamiliar area, be able to answer: what exists here already,
   what must change, why, what could break, and how the change will be
   proven to work. This states
   [rules/27](27-engineering-mindsets.md) #4 (audit-first) as a floor rather
   than a ceiling.
2. **Architecture-understanding floor.** Before changing code that spans a
   component boundary, understand its responsibility, dependency direction,
   data ownership (`context/database-ownership-map.md`,
   `context/service-dependency-map.md`), public interface, and existing
   callers/tests. Do not redesign unprompted
   ([rules/27](27-engineering-mindsets.md) #26), but do not modify it blindly
   either.
3. **Root-cause / hypothesis floor.** A debugging change states, even
   briefly, the hypothesis for why the failure occurs, the evidence
   supporting it, and the expected result if the hypothesis is correct —
   except for trivial, self-evident syntax fixes. Patching a symptom (e.g.
   changing an assertion's expected value to match the actual failing
   output) without determining whether the change is expected behavior or a
   regression is prohibited. This makes
   [rules/27](27-engineering-mindsets.md) #17 (root-cause mindset) concrete.
4. **False-confidence conversion.** Statements like "this should work,"
   "probably fine," or "looks correct" are not evidence. When a claim lacks
   required verification, state it as `Unverified: <condition>. Required
proof: <test/check>.` instead of asserting confidence.
5. **Evidence floor by requirement type.** A code requirement needs
   implementation evidence; a behavior requirement needs a passing test or
   direct runtime observation; an integration requirement needs an actual
   integration/API/browser check, not an inference from reading the code; a
   security requirement needs security-relevant validation
   ([rules/08](08-security-rules.md), [rules/21](21-security-and-secrets.md));
   a migration requirement needs schema/migration verification. No mandatory
   requirement is complete without its matching evidence.
6. **Happy-path floor.** For every feature, check whether the requirement
   implies invalid input, missing data, unauthorized access, a
   failure/timeout/retry path, an empty state, a dependency failure, or a
   concurrency/persistence failure, and cover the ones actually implied. Do
   not invent edge cases the requirement doesn't imply — that is overthinking
   ([rule 30](30-agent-self-regulation-and-loop-prevention.md)); do not skip
   the ones it does
   ([rules/27](27-engineering-mindsets.md) #2's boundary/error/malformed-input
   coverage).
7. **Security and data-safety floor.** Authentication, authorization, tokens,
   passwords, payments, permissions, secrets, encryption, and
   destructive/migration operations get the full depth
   [rules/08-security-rules.md](08-security-rules.md),
   [rules/21-security-and-secrets.md](21-security-and-secrets.md), and
   [rules/05-infra-rules.md](05-infra-rules.md) already require.
   [Rule 30](30-agent-self-regulation-and-loop-prevention.md)'s budgets never
   shorten investigation on these paths — a security- or data-loss-relevant
   finding is never deferred as `OPTIONAL` just to stay within a nesting or
   retry limit.
8. **Retry floor (complements rule 30 rule 2).** Do not count syntax
   variations of the same command, or a failure clearly unrelated to the
   hypothesis under test, against the retry budget
   ([rules/31](31-anti-gaming-and-semantic-compliance.md) rule 2 already
   defines strategy identity by hypothesis, not command text). Conversely, if
   each attempt produced genuinely new evidence and the search space is
   converging, a further attempt is a new hypothesis, not the prohibited 4th
   attempt at the old one — proceed under the executive override protocol
   ([rules/31](31-anti-gaming-and-semantic-compliance.md) rule 10), stated
   explicitly.
9. **Premature strategy-reset guard.** One failed implementation detail is
   not proof the strategy failed. Before abandoning an approach, distinguish
   "the strategy is wrong" from "this step of the strategy needs a fix," and
   prefer the smaller correction.
10. **Critic-suppression guard (complements rule 30 rule 5).** A critic
    finding that is correctness, security, data-loss, an explicit requirement
    violation, or a breaking regression is never discarded merely because the
    round cap was reached. The round cap bounds style and optional churn, not
    the acceptance of a real defect.
11. **Verification floor (complements rule 30 rule 3).** The first, required
    verification of a mandatory Definition-of-Done condition is never
    optional and is never skipped for being slow, expensive, or inconvenient.
    Rule 30 rule 3 caps _redundant_ re-verification of an already-proven
    claim; it never licenses skipping the initial proof.
12. **Decision-readiness gate.** Before a decision with real cost to reverse
    (an architectural choice, a strategy change, declaring a blocker,
    declaring completion), state: the decision, the minimum evidence
    required, the evidence actually available, and the critical unknowns
    remaining. If a critical unknown remains, investigate only that
    unknown — not the whole area — then decide. Runbook:
    [skills/reasoning-balance.md](../skills/reasoning-balance.md).
13. **The balance invariant.** Never stop investigating because a rule 30
    budget expired while a mandatory Definition-of-Done condition still
    lacks its required evidence (rule 5 above). Never keep investigating once
    sufficient evidence exists and further investigation is unlikely to
    change the decision (rule 30 remains in force once evidence is
    sufficient). Neither this rule nor rule 30 may silently override the
    other — an apparent conflict between "stop, budget exhausted" and
    "continue, evidence missing" is resolved through the executive override
    protocol ([rules/31](31-anti-gaming-and-semantic-compliance.md) rule 10),
    stated explicitly, never by picking whichever side is easier.

## Prohibited patterns

- Editing architecture-spanning code after reading a single file.
- Skipping integration/API/UI validation because unit tests pass, for a
  feature whose requirement is integration-shaped.
- Fixing a failing assertion by updating its expected value without checking
  whether the underlying behavior change was intended.
- Declaring `DONE` on the happy path alone when the requirement implies a
  failure or negative path.
- Treating "tests are slow" or "this gate is expensive" as sufficient reason
  to skip a mandatory gate
  ([rules/00-master-rules.md](00-master-rules.md)'s 8 absolute blockers).
- Shortening investigation on an authentication, payment, secrets, or
  migration change to stay under a nesting or retry budget.
- Asserting "this should work" as the completion evidence for a mandatory
  requirement.

## Correct pattern

```text
Decision: mark the Redis-cache discovery OPTIONAL and continue password reset
(rule 30 rule 4).
Minimum evidence required: does password reset fail without touching Redis?
Evidence available: no — password reset uses the existing token store, not
the cache layer.
Critical unknowns: none.
Ready: YES → classification stands; discovery recorded as a follow-up.
```

## Enforcement

- **Review checklist** — self-enforced; same model as
  [rules/30](30-agent-self-regulation-and-loop-prevention.md) and
  [rules/31](31-anti-gaming-and-semantic-compliance.md). No gate can measure
  "was reasoning sufficient" directly.
- Downstream automated gates catch the concrete symptoms when this floor is
  skipped: a missing negative-path test
  ([rules/04](04-testing-rules.md)/[22](22-testing-and-coverage.md)), an
  unaddressed security finding
  ([rules/08](08-security-rules.md)/[21](21-security-and-secrets.md)), a
  coverage drop.
- Worked scenarios and expected outcomes:
  [context/agent-self-regulation-scenarios.md](../context/agent-self-regulation-scenarios.md).

## Related skills

- [reasoning-balance](../skills/reasoning-balance.md)
- [blocker-validation](../skills/blocker-validation.md)
- [deadlock-recovery](../skills/deadlock-recovery.md)

## Related context

- [rules/30-agent-self-regulation-and-loop-prevention.md](30-agent-self-regulation-and-loop-prevention.md) —
  the anti-overthinking budgets this rule counterbalances.
- [rules/31-anti-gaming-and-semantic-compliance.md](31-anti-gaming-and-semantic-compliance.md) —
  the executive override protocol this rule's rule 8/13 invoke.
- [rules/08-security-rules.md](08-security-rules.md),
  [rules/21-security-and-secrets.md](21-security-and-secrets.md),
  [rules/22-testing-and-coverage.md](22-testing-and-coverage.md) — the
  substantive floors this rule points investigation toward.
- [context/agent-self-regulation-scenarios.md](../context/agent-self-regulation-scenarios.md) —
  worked underthinking scenarios and expected detection.

## Definition of done

- [ ] No architecture-spanning edit was made without understanding
      ownership, interface, and callers.
- [ ] Every debugging fix states its hypothesis and evidence, or is a trivial
      syntax fix.
- [ ] No mandatory requirement was marked complete on inference alone —
      each has evidence of its matching type.
- [ ] Requirement-implied negative/failure paths were covered, not only the
      happy path.
- [ ] No security/data-safety investigation was shortened to fit a budget.
- [ ] No critic finding involving correctness, security, or data loss was
      discarded for exceeding the round cap.
- [ ] Every non-trivial decision passed the decision-readiness gate before
      being acted on.
