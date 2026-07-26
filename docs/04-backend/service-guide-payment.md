# Payment Service (`claw-payment-service`)

> Port **4018** · PostgreSQL **`claw_payments`** (host port 5453) · Redis · RabbitMQ
> Source: `apps/claw-payment-service/` · Rules: `apps/claw-payment-service/CLAUDE.md`

## What problem it solves

Before this service, a ClawAI `Plan` was something an administrator granted by
writing a row. There was no way for a user to buy one, and no economic rail
stopping a single user from consuming an unbounded amount of paid cloud
inference. This service closes both gaps: it turns a **verified** PayPal or
Paymob payment into an entitlement, and it is the system of record for every
financial fact ClawAI holds.

## The invariant everything else protects

> **A paid entitlement can only originate from a verified payment or an audited
> admin grant.**

Every design decision below exists to make that true even when a client lies, a
webhook is forged or replayed, a gateway times out mid-capture, a message is
delivered twice, or two upgrade requests race.

## Where it sits

```
browser ──► nginx :443 ──► payment-service :4018 ──► PostgreSQL claw_payments
                                   │
                                   ├── signed internal HTTP ──► auth-service   (plan + price of record)
                                   ├── internal HTTP ─────────► routing-service (model cost)
                                   ├── outbound HTTPS ────────► PayPal / Paymob
                                   │
                                   └── transactional outbox ──► claw.events ──► auth inbox
                                                                            └─► audit-service
gateway ──► nginx :443 /api/v1/payments/webhooks ──► payment-service (signature verified)
```

## Ownership boundary

| Concern                                                                                                                                                                       | Owner       | Reached via                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------- |
| Billing customers, subscriptions, checkout sessions, transactions, refunds, invoices, proration quotes, gateway mappings, vaulted tokens, webhook events, idempotency, outbox | **payment** | (owned)                                   |
| Users, plans, price-of-record, quotas, entitlement projection                                                                                                                 | auth        | signed internal HTTP + `billing.*` events |
| Model identity, cost class, per-million rates                                                                                                                                 | routing     | internal HTTP                             |
| Sanitized audit history                                                                                                                                                       | audit       | `billing.*` events                        |

**No cross-database access.** External identifiers are stored as validated
opaque strings with no foreign key — a payment row can name a `userId` but can
never join to it.

## Money representation

| Quantity        | Representation                            | Why                                                              |
| --------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Plan price      | integer **minor units** (`$5.00` → `500`) | `0.1 + 0.2 !== 0.3`; a float in a billing path is a wrong charge |
| Provider cost   | integer **micro-USD**                     | per-token prices are far below one cent                          |
| FX rate         | integer scaled by `FX_RATE_SCALE`         | keeps conversion exact under integer arithmetic                  |
| Proration ratio | integer scaled by `PRORATION_RATIO_SCALE` | one rounding, at the final boundary                              |

All arithmetic goes through `@claw/shared-utilities` (`money`, `proration`,
`fx`). ESLint bans `Math.round` and `parseFloat` in this service's logic files:
`Math.round(-0.5) === 0` while `Math.round(0.5) === 1`, so a credit and the
charge it offsets would round asymmetrically. Use `roundHalfUpDivide`.

`null` means **unlimited**. `0` means **disabled**. They are never
interchangeable.

## Card data and PCI

ClawAI is **never** in the card-data path. Both gateways use hosted checkout and
tokenization, so a PAN never reaches these servers.

**Never stored, logged, or accepted:** PAN, full card number, CVV/CVC,
magnetic-stripe data, 3-D Secure challenge data, card OTP, or any raw provider
body that could contain them.

**Stored:** the gateway's own token, AES-256-GCM encrypted at the application
layer with a random nonce and AAD bound to `userId|gateway|paymentMethodId`,
carrying a key version so rotation does not orphan existing rows — plus masked
metadata (brand, last4, expiry month/year).

`PaymentMethodView`, the only payment-method shape that crosses a service or
network boundary, is _structurally_ incapable of carrying card data.

Tokenization existing does **not** make the merchant PCI compliant. The real
obligations are documented in `docs/03-architecture/billing-threat-model.md`.

## Configuration model

A gateway is enabled only when its **entire** credential set is present. A
partial set does not half-enable it — a checkout that reaches PayPal without a
webhook id can be paid but never verified, which is strictly worse than the
gateway being absent. `AppConfig` validates the whole set; `GET /api/v1/health`
reports `configured: true|false` per gateway without ever echoing a credential.

Production **fails fast** when PayPal is configured but still pointed at
sandbox: real customers must never reach a gateway that will not settle.

## Migrations and seeding — run once, at startup

Startup still migrates and seeds. Both are made **provably once**:

1. `prisma migrate deploy` consults the `_prisma_migrations` ledger and applies
   only what is unapplied, so a container restart applies nothing new.
2. A PostgreSQL **advisory lock** serializes concurrent replicas: exactly one
   evaluates and applies while the others wait and observe the finished state.
3. Versioned seeders are keyed `(name, version)` in **`seed_executions`** with a
   content checksum. A row that reached `COMPLETED` never runs again. A seeder
   edited without bumping its version aborts loudly rather than silently
   applying different data to production.

This is why `claw.sh reset` warns explicitly about the payment database:
subscriptions, invoices and payment history are financial records and are not
recoverable.

## Security posture

- **Redaction** is broad by default: authorization and cookie headers, every
  gateway signature header, and the entire request/response body are redacted in
  the pino config, alongside token- and secret-shaped field names. A payment
  service handles more secret-shaped values than any other service, and a leaked
  gateway token in a log is a full compromise of that credential.
- **Error responses** carry a stable `BillingErrorCode` and an i18n key only —
  never a stack trace, provider payload, secret identifier, or cost-budget
  figure.
- **Raw body** is preserved (`rawBody: true`) because gateway signatures cover
  the exact bytes sent; re-serialized JSON would fail verification.
- **Webhook routes are unauthenticated by design** — a gateway cannot present a
  ClawAI JWT. Authenticity comes from mandatory constant-time signature/HMAC
  verification inside the service. nginx caps those bodies at 256k and applies a
  dedicated `payment_webhooks` rate zone.
- **Rate limiting** at the edge (`payment_writes`, 20 r/m) in addition to the
  application throttler, because checkout creation and payment-method setup are
  what an attacker hammers to farm trials or brute-force a reference.
- **No caching** on any billing or payment route: billing state is per-user and
  changes on payment.

## Internal service API

The payment service exposes three service-authenticated read routes. They are
reachable only on the internal service network and are deliberately absent from
nginx:

| Route                                              | Purpose                                         |
| -------------------------------------------------- | ----------------------------------------------- |
| `GET /internal/payments/transactions/:id/status`   | Bounded transaction status projection           |
| `GET /internal/payments/subscriptions/:id/status`  | Bounded subscription status projection          |
| `GET /internal/payments/users/:userId/entitlement` | Payment's authoritative paid-entitlement answer |

Every route requires `Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`.
Comparison is constant-time, missing/wrong schemes are rejected, inputs and
outputs are Zod-validated, and unknown record responses use one generic 404
shape. No provider transaction body, gateway subscription identifier, vaulted
token, or card metadata crosses this boundary.

Auth consumes `billing.entitlement.reconcile_requested`, calls the user-scoped
entitlement route with the shared service-token wrapper, validates that the
response belongs to the requested user, and applies the current payment truth
through its durable inbox and canonical entitlement applier. A failed lookup is
marked failed and rethrown for broker retry; one retry claimant wins
atomically.

## Health

`GET /api/v1/health` (public) returns:

```json
{
  "status": "ok",
  "service": "payment-service",
  "database": "ok",
  "gateways": [
    { "gateway": "PAYPAL", "configured": false, "mode": "sandbox" },
    { "gateway": "PAYMOB", "configured": false, "mode": "EGP" }
  ]
}
```

`status` degrades when the database is unreachable, so the aggregator at
`health-service:4009` surfaces impaired payments rather than silently passing.
The endpoint reports _configuration_ only — never whether a specific key is
valid, which would let an unauthenticated caller probe the merchant setup.

## Events published

All eleven flow from a **transactional outbox** written in the same database
transaction as the state change, so an entitlement event can never be lost
between "payment committed" and "message published". Auth consumes them through
an **inbox** keyed on the envelope's `eventId`, making RabbitMQ's at-least-once
delivery safe.

`billing.subscription.{activated,renewed,upgraded,downgrade_scheduled,cancelled,expired,past_due,suspended}`,
`billing.payment.{refunded,chargeback}`,
`billing.entitlement.reconcile_requested`.

Every payload carries `eventId`, `schemaVersion`, `producer`, `causationId`,
`correlationId`, `occurredAt` and `entitlementValidUntil`. Auth rejects unknown
schema versions, duplicate event ids, non-payment-service producers for paid
activations, and stale events whose `entitlementValidUntil` predates the stored
value.

## How a price becomes a charge

This service does not own prices and never copies them. Auth-service holds them
as immutable `PlanPriceVersion` rows; payment-service reads one over a signed
internal API and stores its **id** on the checkout session. That indirection is
what makes a repricing incapable of rewriting what an existing subscriber
already agreed to pay.

```
browser                payment-service                 auth-service
   │  planId, interval, gateway   │                          │
   ├─────────────────────────────►│                          │
   │  (no amount, no currency,    │  GET /internal/plans/price│
   │   no userId — those are      ├─────────────────────────►│
   │   server-resolved)           │  Authorization: Service … │
   │                              │◄─────────────────────────┤
   │                              │  { id, amountMinor, … }   │
   │                              │                           │
   │                              │  Zod-validate: a price that is not a
   │                              │  non-negative integer is REFUSED.
   │                              │  Zero/negative never reaches a gateway.
   │                              │
   │                              │  FX (Paymob only): quote USD→EGP, freeze
   │                              │  the rate id onto the session.
   │                              │
   │                              │  COMMIT the session row  ← before the
   │                              │                            gateway call
   │                              ├──────────► PayPal / Paymob
   │◄─────────────────────────────┤  hostedCheckoutUrl
```

The session is committed **before** the provider is contacted. If the provider
call then succeeds but its response is lost, we still hold a record of what was
intended, so reconciliation has something to match the money against.

`ChargeResolverService` is the only place a charge is derived, and it reads
nothing from the request body.

## How a payment becomes an entitlement

Both gateway handlers follow the same order, and the order **is** the security
design:

1. **Verify the signature/HMAC** over the raw bytes. A rejected signature is
   recorded (never silently dropped — a forgery attempt is a signal an operator
   needs) and nothing further happens.
2. **Claim the event.** The `(gateway, providerEventId)` unique index arbitrates
   replays, so two replicas receiving the same retry cannot both win.
3. **Read the order back from the gateway.** We never activate on what the
   webhook body says the amount was — only on what an authenticated
   server-to-server read tells us.
4. **Activate**, in one transaction with the outbox row that informs auth.

`PaymentActivationService` re-checks the amount against the session's own
recorded figure even though the adapter already verified it. A mismatch fails
the session with `PAYMENT_AMOUNT_MISMATCH` rather than being accepted with a
warning.

Both webhook endpoints always answer `200 {"received": true}`. A 4xx would make
the gateway retry, and telling a forger their signature was rejected only tells
them to try another one.

## Current status

Live: config, infrastructure, error model, health, Docker (dev + prod), nginx,
TLS SANs, CI matrix, installers, `seed_executions`, billing schema, both gateway
adapters, FX quoting, proration, the transactional outbox, signed plan-catalog
client, checkout and subscription management, webhook verification,
entitlement activation, locked reconciliation/lifecycle sweeps, and the
service-authenticated internal status/reconcile API.

Still to land in the subscription-completion program: standalone payment-method
setup, first-class refund operations, immutable invoice delivery, public
pricing, and the admin price/margin surfaces.

## Related

- `apps/claw-payment-service/CLAUDE.md` — service rules
- `docs/06-data/environment-variables.md` — full env reference
- `.claude/Integrations/secure-subscriptions-payments__PLAN.md` — Phase-0 plan
