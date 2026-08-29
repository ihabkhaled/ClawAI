# ADR-082: Where PAYG classification lives, and at what grain

**Status**: Accepted
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

Before any credit can be reserved, one predicate has to be answered: **is this
request going to cost the platform money?**

The predicate has three inputs — the provider, the connector configuration, and
whether the model has a usable price — and it is evaluated on the hot path of
every paid request, from six different services. That combination makes "where
does it live" a decision with a five-year blast radius rather than a placement
detail.

The tempting home is `packages/shared-entitlements`, which every service already
imports and which already holds the plan-flag predicates (`allowCompareMode` and
friends). Putting `isPayg()` there would make it a pure function with no network
call at all.

Two facts rule that out:

1. **A shared package is compiled into six `node_modules` copies.** Changing a
   predicate there means publishing the package and rebuilding six containers.
   [ADR-078](adr-078-payg-connector-credit.md) D1 promises a **per-connector
   admin toggle** — an operator switching metering on for one provider from the
   admin UI. A toggle whose effect requires a six-container rebuild is not a
   toggle.
2. **Two of the three inputs are owned elsewhere.** `Connector.isPayAsYouGo`
   belongs to connector-service; the price belongs to routing-service
   ([ADR-079](adr-079-auth-model-price-cache.md)). A shared package cannot read
   either without becoming a client, at which point it is no longer a pure
   predicate.

The second question is **grain**. The natural instinct is `{provider, model}` —
metering is ultimately about a model's price. But `connectors` has
`@@index([provider])` and **no unique constraint on provider**, so one provider
can hold several connector rows (a personal key and a shared key, say). A
`{provider, model}` key cannot address any single one of them.

## Decision

**The predicate is evaluated server-side, in auth-service, once per request, at
PROVIDER grain — rolled up from the per-connector `isPayAsYouGo` flag.**

```
isPayg(provider, model) =
      provider ∉ { OLLAMA, LLAMACPP }                    -- PAYG_EXEMPT_PROVIDERS
  AND connectorPolicy(provider) is PAYG                  -- connector-service, cached 60 s
  AND modelCost(provider, model) has a usable rate       -- routing-service, cached 300 s
```

- **connector-service owns the flag.** `Connector.isPayAsYouGo` is the runtime
  authority. `PAYG_DEFAULT_PROVIDERS` in `@claw/shared-constants` is only the
  default the migration backfills and `paygDefaultForProvider()` applies to a
  newly created connector.
- **The rollup is `ANY enabled connector is PAYG ⇒ the provider is PAYG`**
  (`connectors/utilities/payg-policy.utility.ts`). The asymmetry is the
  conservative direction: treating a provider as free because one of its several
  connectors is unclassified would hand out uncapped spend. A **disabled**
  connector cannot serve traffic, so it cannot make a provider cost money — but
  it still contributes its provider key to the map, so a provider whose only PAYG
  connector is switched off returns an explicit `false` rather than vanishing
  into an absent key the caller has to guess about.
- **`PaygMeter` in `shared-entitlements` is a thin client and nothing more.** It
  calls auth, it returns the answer. No classification, no pricing, no
  thresholds. It fails **closed** for metered providers and **open** for exempt
  ones.
- **The rate check is deliberately not folded into the classification.** An
  unpriced model on a metered provider is refused with `PAYG_MODEL_UNPRICED`,
  which is a different outcome from "this provider is free" and produces
  different UI. Merging them would turn a launch-blocking pricing gap into a
  silent giveaway.

### The local-compute zero-rate fallback is the trap

`ModelCostService.unpricedSnapshot` (routing-service,
`modules/router-models/services/model-cost.service.ts:83-91`) answers a **local**
provider with `isPriced: true` at a rate of **0**, when
`LOCAL_COMPUTE_OWNERSHIP=USER_OWNED` (the default) and the provider is in
`LOCAL_COST_PROVIDERS` (`['OLLAMA', 'LLAMACPP']`). That is correct for its own
purpose: a model on the user's own GPU genuinely costs the platform nothing.

If a **PAYG** provider ever resolved through that path it would come back
**priced, at zero**, and every request to it would be free — an unbounded
liability that looks exactly like a healthy lookup in the logs.

So `isUsablePaygRate` (`modules/credit/utilities/payg-classification.utility.ts`)
treats a rate carrying `isLocalComputeFallback` as **unpriced and therefore
blocked**, never as free. This is asserted in auth-service rather than trusted of
routing-service, because the two deploy independently and the day someone adds a
provider to `LOCAL_COST_PROVIDERS` is not the day anyone re-reads the credit
module. It has its own test.

## Consequences

**Gained:**

- The admin toggle works. Flipping `isPayAsYouGo` on a connector changes metering
  within the 60 s policy cache TTL, with no deploy and no rebuild.
- One evaluation site. Six services ask; none decides.
- The zero-rate giveaway is closed by an assertion with a test, not by a
  convention two services would have to keep independently.

**Accepted — auth-service now depends on connector-service on the hot path**, in
addition to routing-service. Same shape as [ADR-079](adr-079-auth-model-price-cache.md):
cached 60 s under `claw:payg:policy:`, fail-closed for metered providers.

**Accepted — there is no `connector.payg_policy_changed` event, deliberately.**
The policy is cached for 60 s and a toggle is a rare, operator-initiated action;
an event would add a producer, a consumer and a delivery guarantee for an
improvement measured in under a minute. Do not invent one.

**Accepted — provider grain cannot express "this model is metered and that one is
not on the same provider".** If that is ever needed, the connector table is the
wrong shape for it and the change is a real schema decision, not a key change.

### The Ollama Cloud residual, with its mechanism

`OLLAMA_CLOUD` is a **routing-only provider name**. connector-service has no
`ConnectorProvider` member for it, so it never appears in the policy map, resolves
unclassified, and is therefore **free**. That is the default
[ADR-078](adr-078-payg-connector-credit.md) A3 chose, and it is a real,
paid-for-by-the-operator path left unmetered on purpose rather than by oversight.

The mechanism that makes it safe rather than silently free is the assertion above:
Ollama Cloud is unmetered because it is **unclassified**, not because it resolved
through the zero-rate fallback. A provider that _is_ classified as PAYG can never
take that route. The lever, when an operator wants Ollama Cloud metered, is the
per-connector toggle — which requires connector-service to carry the provider
first.

## Alternatives considered

**`isPayg()` as a pure predicate in `shared-entitlements`.** Fastest — no network
call at all — and rejected because the admin toggle becomes a six-container
rebuild, and because two of its three inputs are owned by other services.

**Model grain (`{provider, model}`).** Matches the intuition that metering is
about a model's price, and is unimplementable against the current schema:
`connectors` has no unique constraint on provider, so a per-model key cannot
address a single connector row. It would also multiply the classification cache
by the size of the model catalogue for a distinction nobody has asked for.

**Classification in each calling service.** Every service already knows its
provider and model. Rejected: six implementations of one money predicate is six
chances to disagree, and a bug in the cheapest surface is indistinguishable from a
pricing decision.

**Derive it from the price alone — "if it has a non-zero rate, it is metered".**
Superficially elegant and quietly wrong: the local zero-rate fallback returns
`isPriced: true` at 0, so "has a price" and "costs money" are not the same
predicate, which is the exact trap this ADR exists to close.

## Validation

`payg-classification.utility.spec.ts` covers case-insensitive exempt matching, an
absent provider falling back to the default, and — the load-bearing case — a PAYG
provider answering with `isLocalComputeFallback` being treated as unpriced.
`payg-policy.utility.spec.ts` covers the ANY-enabled rollup, a disabled-only
provider returning an explicit `false`, and multiple connectors on one provider.

## Rollback

Set every connector's `isPayAsYouGo` to `false`
(`UPDATE connectors SET is_pay_as_you_go = false;`). Nothing is classified as
metered, so nothing reserves. Faster than an image rollback and it is the second
step of the kill-switch ladder in
[`runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md).

## Related

- [ADR-078](adr-078-payg-connector-credit.md) — D1 and A3
- [ADR-079](adr-079-auth-model-price-cache.md) — the rate half of the predicate
- [`docs/04-backend/service-guide-connector.md`](../04-backend/service-guide-connector.md)
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md)
