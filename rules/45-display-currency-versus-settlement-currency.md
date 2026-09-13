# 45 — Display currency is never settlement currency

Status: active · Owner: billing · Decision: [ADR-097](../docs/13-adr/adr-097-display-fx-separate-from-settlement-fx.md) ·
Plan: [`docs/implementation/local-currency-display-plan.md`](../docs/implementation/local-currency-display-plan.md)

ClawAI shows prices in a visitor's local currency and charges in the gateway's.
Those are different numbers, produced by different code, under different
policies. This rule exists because merging them charges someone the wrong amount.

## The three amounts

```text
CANONICAL   PlanPriceVersion row. USD. Immutable. The product's actual price.
DISPLAY     canonical x current rate, commercially rounded. Recomputed each render.
SETTLEMENT  FxQuote frozen on a checkout session. What the gateway will charge.
```

Name them apart in code. A variable called `amount` near a gateway call is how
this goes wrong.

## MUST

- Convert for display through `toLocalizedMoneyView` and nothing else. Every
  money surface calls it; no surface multiplies by a rate itself.
- Keep `LocalizedMoneyView.canonicalAmountMinor` intact on every response. A
  converted amount without its canonical twin is an orphan nobody can verify.
- Fail **open** on display: both FX providers down renders canonical USD. A
  pricing page must never blank, zero, or block checkout because of FX.
- Fail **closed** on settlement: no quote means no checkout. Unchanged from
  today.
- Keep `SUPPORTED_DISPLAY_CURRENCIES` and `SUPPORTED_BILLING_CURRENCIES`
  separate. Display is wide; billing is four currencies. Adding a currency to
  the display list is a presentation change; adding one to the billing list is a
  payments project.
- Validate every currency code against the allowlist before it reaches a cache
  key, a provider URL or a `Vary` header. An unvalidated code is a cache-DoS
  primitive.
- Round with `applyCommercialRounding` for prices and with nothing at all for
  usage. A usage figure rounded to zero tells a user they were not charged.
- Derive country only from a signal ClawAI's own infrastructure produced —
  nginx's `X-Real-IP`, or an edge header the operator has explicitly enabled on
  a deployment that rewrites it. The browser's IANA time zone is the one
  exception and it is deliberately LAST: it is the only signal that exists when
  the request never crossed the internet, which is every local install and every
  corporate NAT. Without it AUTO can only ever resolve USD on those deployments.
  A real geolocation outranks it; a manual choice outranks everything.

## MUST NOT

- **NEVER** pass a display amount, or anything derived from one, to a gateway
  adapter, a checkout creation call, an invoice, a refund or a wallet write.
- **NEVER** apply the settlement safety margin to a displayed price. It exists
  to protect a charge; on a price it is a quiet markup on everyone abroad.
- **NEVER** apply commercial rounding to a charge, a refund or a ledger row.
- **NEVER** store a converted amount. No converted plan price, no EGP wallet, no
  per-country `PlanPriceVersion`. Display is computed, never persisted.
- **NEVER** rewrite an issued invoice. A current local equivalent may sit beside
  the invoice figure, clearly secondary, never in place of it.
- **NEVER** trust `CF-IPCountry`, `X-Forwarded-For` or any client-settable
  header for country unless the edge rewrites it and nginx strips the inbound
  copy.
- **NEVER** persist a raw visitor IP for currency localization. Geo cache keys
  are hashes with a short TTL.
- **NEVER** expose an FX or geolocation endpoint that accepts an arbitrary URL,
  IP or currency. That is an open proxy wearing a billing feature's clothes.
- **NEVER** infer currency from UI language. Arabic is not EGP; English is not USD.

## The test that must always exist

A user switching display currency changes nothing but pixels:

```text
switch USD -> EGP -> EUR -> USD
wallet microUsd identical
invoice currency and amount identical
refund currency and amount identical
gateway request body byte-identical
```

If that test is deleted, this rule has no teeth.
