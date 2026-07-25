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

## Security posture (scaffold-level)

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

## Current status

Scaffold complete: config, infrastructure, filters/interceptors/pipes, error
model, health, Docker (dev + prod), nginx, TLS SANs, CI matrix, installers,
health aggregation, `seed_executions`. Gates green with 97 tests and ≥92%
coverage on all four metrics.

Billing schema, gateway adapters, proration and entitlement synchronization land
in the following commits on `feat/secure-subscriptions-payments`.

## Related

- `apps/claw-payment-service/CLAUDE.md` — service rules
- `docs/06-data/environment-variables.md` — full env reference
- `.claude/Integrations/secure-subscriptions-payments__PLAN.md` — Phase-0 plan
