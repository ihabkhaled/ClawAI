# ADR-097 — Display FX is a separate subsystem from settlement FX

- Status: Accepted
- Date: 2026-09-12
- Supersedes: none
- Related: [ADR-?] payment-service FX quoting · [`rules/28-billing-integrity-and-api-contracts.md`](../../rules/28-billing-integrity-and-api-contracts.md) · [`rules/45-display-currency-versus-settlement-currency.md`](../../rules/45-display-currency-versus-settlement-currency.md)

## Context

ClawAI shows every price in USD. Product approved showing a visitor's local
currency instead — Egyptian visitors see EGP, German visitors EUR — while USD
stays the canonical price and the gateways keep settling exactly as they do now.

payment-service already has an FX module. It exists to compute the EGP total
Paymob will actually charge: it persists a quote, adds a safety margin, expires
it, binds it to a checkout session and revalidates it against what the gateway
reports. It is financial machinery, and every one of those properties is there
because getting a charge wrong is worse than not charging.

The obvious move is to reuse it. That is the mistake this ADR exists to prevent.

## Decision

Display FX is a **separate subsystem** from settlement FX. They share the
scaled-integer arithmetic and nothing else.

|               | DISPLAY                                    | SETTLEMENT                            |
| ------------- | ------------------------------------------ | ------------------------------------- |
| Purpose       | show a price                               | charge a card                         |
| Safety margin | none                                       | operator-configured bps               |
| Rounding      | commercial, to a readable increment        | none; exact                           |
| Persistence   | Redis cache, expendable                    | Postgres `FxQuote`, financial history |
| Expiry        | TTL is a performance knob                  | TTL is a correctness guarantee        |
| On failure    | fail **open** to USD                       | fail **closed**, refuse the checkout  |
| Providers     | Frankfurter, then fawazahmed0/exchange-api | existing configured upstream          |

The display subsystem lives at
`apps/claw-payment-service/src/modules/display-fx/`, beside the settlement
`modules/fx/`. Same service, because payment-service already owns FX and already
has Redis; different module, because the policies must not be able to meet.

Three amounts are named and never merged:

- **CANONICAL** — the `PlanPriceVersion` row. USD. Immutable.
- **DISPLAY** — canonical × current rate, commercially rounded. Recomputed every render.
- **SETTLEMENT** — the frozen `FxQuote` bound to a checkout session.

The separation is enforced by type, not by discipline. `DisplayFxRate` has no
`quoteId`, no `expiresAt` and no `safetyMarginBps`, so it does not fit anywhere
a gateway adapter accepts an amount. `LocalizedMoneyView` is a view object: it
carries the canonical figure with it precisely so that a caller reaching for
"the real amount" finds it without reaching for the display one.

## Consequences

**Good.** A display outage cannot reach a charge: both providers failing renders
USD and checkout is untouched. A settlement outage cannot reach a price: the
marketing page keeps working. Localized prices are not silently inflated by 1.5%
of settlement safety margin. Providers are swappable behind an adapter without a
UI change.

**Costs.** Two FX code paths to maintain, and a standing invariant a reviewer has
to hold: anything that will be charged goes through `FxService`, anything that
will be read goes through `DisplayFxService`. A second cache to operate.

**Accepted risk.** The Paymob checkout will show a marketing estimate (≈ EGP 515)
and then an authoritative charge (EGP 521.37) that differs, because the
settlement quote is newer, carries the safety margin and is not commercially
rounded. This is not a bug and the checkout UI states both figures explicitly.
The alternative — one number everywhere — is only reachable by charging the
rounded marketing figure, which is the exact failure this ADR forbids.

## Alternatives rejected

**Extend `FxService` with a `purpose` flag.** One class, two policies, one
boolean between a marketing estimate and a card charge. The first refactor that
loses track of the flag produces a wrong charge.

**Convert on the client.** No shared cache, no failover, browsing habits leaked
to an FX provider, CORS as a dependency of the pricing page.

**A dedicated `claw-fx-service`.** Cleanest boundary, but an 18th service —
seven compose files, nginx, the CI matrix, health service, install scripts — for
one HTTP call. Rejected as disproportionate.

**Regional price books.** Actually charging EGP. A different project with tax,
merchant-account, renewal-stability and refund consequences. Explicitly out of scope.
