# Akinator Business Map - business logic is first-class knowledge

> **Station reference** of [the one Akinator skill](../SKILL.md). Load when: work touches money, plans, pricing, quotas, entitlements, limits, trials, refunds, proration, discounts, taxes or anything a customer is charged or granted. Writes the rule in business language next to its technical contract, so what the product should do never requires reading the implementation.

Business rules are the most expensive knowledge to lose and the most commonly
unwritten. They end up encoded as a comparison in a service class, a magic number
in a config, and a conditional nobody remembers the reason for - and then the
question "what _should_ happen when a customer downgrades mid-cycle?" can only be
answered by reading code, which tells you what happens, not what should.

**Numeric business rules living only in code are a defect.** Write them in
business language, with the numbers, next to a link to the code that implements
them.

## When to use

The work touches any of:

- Pricing, plans, tiers, packaging, add-ons.
- Quotas, limits, rate caps, seat counts, usage metering.
- Entitlements: what a plan grants, when it is granted, when it is revoked.
- Trials, grace periods, dunning, expiry.
- Refunds, credits, proration, upgrades and downgrades mid-cycle.
- Discounts, coupons, taxes, currency.
- Anything where a customer gains or loses something of value.

## When NOT to use

- For the implementation's mechanics. How the quota counter is stored is
  `context/` or `docs/`; what the quota _is_ and when it resets is here.
- For product feature intent with no money or entitlement semantics - that is
  `akinator-product-map`.

## Procedure

### 1. Find the rule before writing it

Business rules hide in: config values, constants, feature flags, conditionals in
billing and permission code, database seed data, vendor dashboard settings, and
the owner's head. Look in all of them. A rule that exists in the vendor dashboard
and nowhere in the tree is invisible to every future agent - write it down and
say where it actually lives.

### 2. Stop at a void

If implementing forces a decision no document answers - "what happens to quota on
refund?", "does a downgrade revoke seats immediately or at period end?" - **stop
and ask** (`akinator-intake`). Do not pick the convenient answer and move on.
Money and entitlement semantics are exactly where guessing is prohibited.

File the answer here before coding past it.

### 3. Write it in business language

Someone who has never seen the codebase must be able to read it and know what the
product does. Use the repo's conventions, or Akinator's business-logic
template. Each rule states:

- **The rule**, in a sentence, in business terms. No function names, no types.
- **Who decided, and when** - absolute date. Business rules are decisions, and
  their authority matters when someone wants to change one.
- **The numbers** - the actual values, in a table. Not "the standard limit" -
  the number, its unit, its currency, its period.
- **The code that implements it** - by path, ideally to the specific function or
  constant. This is the link that keeps both sides honest.
- **Edge cases decided** - the ones with an answer, each with the answer.
- **Edge cases OPEN** - explicitly listed, with the date raised and what is
  blocked. An open edge case that is written down is knowledge; one that is only
  unresolved is a future incident.

### 4. Cross-link with the code

The doc links to the code. Where the repo's conventions allow, the code links
back - a comment naming the business doc above the constant or the conditional.
That backlink is what makes the next person editing the number find the rule
first.

Where the rule must not be violated by future code, forge a rule
(`akinator-rule-forge`) with a real enforcement mechanism - typically a test
asserting the business behavior in business terms.

### 5. Keep the numbers in one place

If a number appears in the doc, in a config, and in a test, they will diverge.
Prefer: the code holds the value, the doc states it and links to it, and a test
asserts the doc's stated value. Where the repo supports it, generate the doc's
number table from the source of truth (`akinator-contextify`).

### 6. Index and sync

Reachable from the docs index and reflected in the routers.

## Failure modes and pitfalls

- **Documenting in engineering language.** "`entitlementService.check()` returns
  false when `usage >= limit`" is not a business rule. "A team on the Starter
  plan can invite 5 members; the 6th invitation is rejected with an upgrade
  prompt" is.
- **Omitting the numbers.** A rule without values cannot be checked against the
  system.
- **Guessing at a void.** Prohibited on money and entitlements.
- **Leaving open edge cases unlisted** because they feel unfinished. Unlisted is
  how they become incidents.
- **Letting the doc and the code diverge.** One source of truth, linked, ideally
  asserted by a test.
- **Ignoring rules that live outside the repo** - vendor dashboards, spreadsheets,
  a payment provider's config. Write down that they live there.

## Definition of done

- [ ] Every business rule the change touches is written in business language.
- [ ] Every rule states its numbers, its decider and an absolute decision date.
- [ ] Every rule links to the code that implements it.
- [ ] Edge cases are split into decided (with answers) and OPEN (with dates).
- [ ] No void was guessed past; voids were asked and filed.
- [ ] Rules that must not be violated have an enforcement mechanism.
- [ ] The doc is reachable from an index and reflected in the routers.
