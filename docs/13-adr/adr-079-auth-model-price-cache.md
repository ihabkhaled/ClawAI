# ADR-079: auth-service learns model prices from routing-service over a cached internal call

**Status**: Accepted
**Date**: 2026-08-29
**Deciders**: ClawAI core team
**Slice**: Pay-as-you-go connector credit (PAYG flagship)

## Context

The PAYG reservation gate lives in auth-service ([ADR-078](adr-078-payg-connector-credit.md)).
To clamp `maxOutputTokens` to what a balance can afford, and to hold the right
number of micro-USD, it must know two rates for the model about to be called: the
input rate and the output rate, per million tokens.

auth-service does not own those rates and must not. **routing-service owns model
identity, cost class and cost rates** — `ModelCostVersion`, `ModelCostService`,
and an admin repricing surface. `apps/claw-payment-service/CLAUDE.md` already
records the same boundary for the same reason:

| Concern                                | Owner           | How we reach it |
| -------------------------------------- | --------------- | --------------- |
| Model identity, cost class, cost rates | routing-service | internal HTTP   |

Duplicating a price table into auth-service would put the same number in two
databases with no mechanism keeping them equal, which is exactly the failure the
service boundary exists to prevent.

The rate is needed on the **hot path**: once per PAYG request, before the provider
call, while the user waits.

## Decision

**auth-service reads the rate from routing-service over signed internal HTTP and
caches it in Redis for `PAYG_RATE_CACHE_TTL_SECONDS` (300 s). The cache is busted
by the `routing.model_cost.published` event.**

- `ModelRateClient` (`modules/credit/clients/model-rate.client.ts`) is the only
  place auth reads a price. It calls
  `GET {ROUTING_SERVICE_URL}/internal/router-models/cost/:provider/:model` with
  `buildInterServiceAuthHeader`, validates the response with a bounded Zod schema,
  and caches under `claw:payg:rate:`.
- `ModelCostService.publish()` emits `routing.model_cost.published` carrying
  `{ provider, modelKey, version }` and **never a rate** — a topic exchange is
  readable by any consumer that binds the pattern, and a rate is a margin input.
  auth's `model-cost-published.consumer.ts` drops that one cache key, so an
  administrator's repricing lands on the next request rather than up to five
  minutes later.
- **The client fails closed.** `null` means "we do not know what this costs", and
  the caller refuses with `PAYG_PRICING_UNAVAILABLE`. Proceeding unpriced would
  turn a routing-service outage into unbounded provider spend.

## Consequences

**Accepted — this creates a new auth→routing dependency on a hot path.** It is
the one genuinely new coupling in this flagship and deserves to be named rather
than discovered later.

Three things make it tolerable:

1. **The reverse edge already exists.** routing-service imports
   `EntitlementsModule.forRoot({ authServiceUrl })` in its
   `app/app.module.ts:79`, so routing already calls auth synchronously. This does
   not introduce a cycle between two previously independent services; it
   completes one that was already half-drawn.
2. **The 300 s cache collapses the traffic.** A busy install calls routing once
   per model per five minutes, not once per request.
3. **The failure mode is a refusal, not a spend.** Fail-closed for metered
   providers, fail-open for exempt ones: an auth or routing outage refuses PAYG
   requests and lets local ones through. That is D4 exactly — an outage must not
   hand out unbounded provider spend, and must not take the product down either.

**Accepted — a repriced model can be up to 300 s stale if the broker is down.**
The event is fire-and-forget and `@Optional()`, because the price is authoritative
in Postgres the moment the transaction commits. A dead broker degrades to a TTL
window, not a failed repricing.

**Accepted — a cold cache adds one internal round-trip to the first request per
model per five minutes.** Measured against the provider call it wraps, this is
noise.

## Alternatives considered

**Caller-supplied price.** The service about to call the provider already knows
which model it picked, and routing already told it the cost class; let it pass the
rate to `reserve` and skip the lookup entirely. **Rejected on principle, not on
performance.** The checkout flow in payment-service already refuses to let a
client name its own price — `PlanPriceVersion` is resolved server-side precisely
so a browser cannot choose what it pays. A reservation is a charge. Accepting a
rate over the wire would let a compromised or buggy caller hold $0.000001 against
a $0.30 request, and the clamp — the mechanism that makes overspend impossible by
construction — would be computed from a number the spender supplied.

**A scoped active-rate projection maintained off the event.** The real contender.
auth subscribes to `routing.model_cost.published`, and the event carries the rate,
so auth maintains a small local table of active rates and never makes a
synchronous call at all. No hot-path coupling, no cache TTL, no cold-start
round-trip.

Rejected for three reasons, in order of weight:

- **It requires the rate on the wire.** A topic exchange is readable by anything
  that binds the pattern; audit-service already binds nearly every lifecycle
  pattern. Publishing per-model provider rates makes the platform's margin inputs
  a broadcast, which is the exact disclosure
  `docs/03-architecture/billing-threat-model.md:108` exists to prevent.
- **A missed message is a wrong charge, silently.** RabbitMQ delivery here is not
  guaranteed to a subscriber that was down: `packages/shared-rabbitmq/src/rabbitmq.service.ts:114`
  publishes without `mandatory` onto a topic exchange, and queues are asserted by
  the consumer at boot. A projection that missed one message would keep charging
  the old rate forever, with nothing to detect the drift. A cache that misses a
  bust is wrong for at most 300 s and then self-corrects.
- **It is a second copy of an owned table.** The projection has to be seeded,
  reconciled and backfilled, and the "who owns model prices" answer becomes
  "routing, and also auth, mostly".

Worth revisiting if the synchronous call ever becomes a measured latency problem,
and if the rate can be fetched rather than broadcast — a projection populated by
_pulling_ on the event rather than reading it out of the payload keeps the
privacy property and is a strictly smaller change than this ADR was.

**No cache at all — call routing on every reservation.** Simplest and correct, but
puts routing-service directly in the latency and availability path of every paid
request, for a value that changes a few times a year.

## Validation

Client tests cover a cache hit, a cache miss followed by a write, a malformed
response rejected by the Zod schema, a routing timeout yielding `null`, and the
consumer invalidating exactly one key. A reservation test asserts that
`findRate` returning `null` produces `PAYG_PRICING_UNAVAILABLE` and no hold.

## Rollback

Disable metering (`SystemSetting` `payg.credit.enabled` → `false`). The client is
called only from the reservation path, so nothing reads a price when metering is
off.

## Related

- [ADR-078](adr-078-payg-connector-credit.md) — the wallet this rate feeds
- [ADR-082](adr-082-payg-classification-grain.md) — the other cached cross-service read
- [`context/service-dependency-map.md`](../../context/service-dependency-map.md)
- [`docs/04-backend/service-guide-routing.md`](../04-backend/service-guide-routing.md) — `ModelCostVersion` and `routing.model_cost.published`
