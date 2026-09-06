# Claw Payment Service — Development Rules

## Service Overview

Owns everything financial: billing customers, checkout sessions, subscriptions,
billing periods, payment transactions, refunds, invoices, proration quotes,
gateway mappings, vaulted payment-method tokens, webhook events, reconciliation,
idempotency and the transactional outbox.

Runs on port **4018** with its own PostgreSQL database (**`claw_payments`**,
host port 5453).

## The one rule that matters most

**A paid entitlement can only come from a verified payment or an audited admin
grant.** No client input, no redirect query parameter, and no unverified webhook
may ever move a user onto a paid plan. If you are about to write code that sets
a plan from something a browser sent, stop.

## Ownership boundary

This service **owns** billing state. It does **not** own:

| Concern                                | Owner           | How we reach it                           |
| -------------------------------------- | --------------- | ----------------------------------------- |
| Users, plans, prices-of-record, quotas | auth-service    | signed internal HTTP + `billing.*` events |
| Model identity, cost class, cost rates | routing-service | internal HTTP                             |
| Audit history                          | audit-service   | `billing.*` events on `claw.events`       |

There is **no cross-database access**. External identifiers (userId, planId,
planPriceVersionId) are stored as validated opaque strings with no FK.

## Money rules (non-negotiable)

1. Every amount is an **integer minor unit** (`$5.00` → `500`). Never a float.
2. Provider cost is **integer micro-USD**. Never a float.
3. Arithmetic goes through `@claw/shared-utilities` (`money`, `proration`, `fx`).
   ESLint bans `Math.round` and `parseFloat` in service/manager/adapter/
   repository/controller files — `Math.round(-0.5) === 0` but
   `Math.round(0.5) === 1`, so a credit and the charge it offsets would round
   asymmetrically. Use `roundHalfUpDivide`.
4. Round **once**, at the final minor-unit boundary.
5. Prices come from the database (`PlanPriceVersion`), never from env, never
   from the client.
6. `null` means unlimited. `0` means disabled. They are not interchangeable.

## Card data

ClawAI is **never** in the card-data path. Both gateways use hosted checkout /
tokenization, so a PAN never reaches these servers.

**Never store, log, or accept:** PAN, full card number, CVV/CVC, magnetic-stripe
data, 3-D Secure challenge data, card OTP, or a raw provider request/response
body that could contain them.

**Do store:** the gateway's own token (AES-256-GCM encrypted at the application
layer, AAD bound to `userId|gateway|paymentMethodId`, with a key version) plus
masked metadata (brand, last4, expiry month/year).

Tokenization existing does **not** make ClawAI PCI compliant. See
`docs/03-architecture/billing-threat-model.md` for the real obligations.

## Gateway adapters

`PaypalAdapter` and `PaymobAdapter` are the **only** files permitted to make
gateway HTTP calls. Everything else goes through them. Each adapter must:

- validate every response with Zod before it becomes trusted state,
- bound every request with a timeout and an explicit retry policy,
- retry only idempotent operations, with a provider idempotency key,
- never log a token, payer detail, or response body,
- verify signature/HMAC in constant time before parsing into business state.

## Configuration

A gateway is enabled only when its **whole** credential set is present. A
partial set does not half-enable it: a checkout that reaches PayPal without a
webhook id can be paid but never verified, which is worse than the gateway being
off. See `AppConfig` and `gateway-readiness.utility.ts`.

Production **fails fast** on configured-but-sandbox PayPal.

## Migrations & seeding

Startup migrates and seeds, but **exactly once**:

- `prisma migrate deploy` consults the `_prisma_migrations` ledger, so a restart
  applies nothing new.
- A PostgreSQL advisory lock serializes concurrent replicas — one applies, the
  rest wait and observe.
- Versioned seeders are keyed `(name, version)` in `seed_executions` with a
  checksum. A completed seeder never re-runs; an edited-but-not-reversioned
  seeder aborts loudly instead of silently changing production data.

## Tech Details

- **Port**: 4018
- **Database**: PostgreSQL (`claw_payments`), host port 5453
- **Cache/locks**: Redis (shared)
- **Broker**: RabbitMQ (shared), exchange `claw.events`
- **Coverage floor**: 92% on all four metrics, from the first commit

## Credit top-up is the THIRD checkout purpose (ADR-083)

`CheckoutSessionPurpose.CREDIT_TOPUP` is not merely a fifth enum member. It
carries **no plan fields** (like `PAYMENT_METHOD_SETUP`) but **does carry a real
amount** (like a subscription), so it satisfies neither branch of
`checkout_sessions_purpose_fields_check`. Migration
`20260829120200_add_credit_topup_checkout` adds a third branch and tightens the
original two to require the three new credit columns be NULL — a subscription
row can never carry credit fields. **Adding the enum member without that
migration makes every top-up insert fail at the database.**

- `isSubscriptionCheckoutSession` is UNCHANGED and still returns false for a
  top-up (its plan fields are null). Use the positive
  `isCreditTopupCheckoutSession`, or `isPayableCheckoutSession` where only the
  money fields matter. Do not loosen the subscription guard.
- The route is `POST /billing/credit-topup/checkout-sessions` — under
  `/api/v1/billing`, which nginx already proxies here. The body carries
  `{ packageId, gateway, idempotencyKey }` and **never an amount**; the price
  comes from an immutable `CreditPackageVersion` fetched from auth-service.
- A partial refund reverses a **proportional** share of the credit, not the
  whole package. Auth clamps the reversal to the UNSPENT purchased balance and
  the wallet never goes negative; spent credit is not refundable.
- A credit reversal must **NOT** revoke the plan entitlement (ADR-064).

`BILLING_CREDIT_TOPUP_SUCCEEDED` is enqueued in the SAME transaction as the
charge. auth-service must be subscribed before this service drains its outbox —
the topic exchange discards a routing key with no bound queue, so an early
publish loses the event with no DLQ while the money is already taken.

## `resolvePeriodEndMs` covers all four billing intervals (2026-09-02)

`resolvePeriodEndMs` (`modules/webhooks/utilities/billing-period.utility.ts`) now
resolves `QUARTERLY` and `SEMIANNUAL` the same way it already resolved `YEARLY`:
by looking up the interval's month count in `MONTHS_BY_BILLING_INTERVAL` and
calling the shared `addCalendarMonths` (`@claw/shared-utilities`) once, rather
than special-casing `YEARLY` as "add 12 months" beside a fixed-days path for
everything else. This was a deliberate behavior fix, not just new-interval
plumbing: a subscription that starts on **29 February** now correctly clamps to
the last day of the target month instead of the old fixed-days arithmetic
silently rolling the period end into March.

## `monthsPaid` is derived from invoices, never stored (2026-09-06)

`GET /api/v1/admin/billing/users/:userId/subscription`
(`modules/admin-user-billing`) is the admin read of one user's whole billing
state. Three things about it are easy to get wrong:

- **`nextRenewalAt` is not `currentPeriodEnd`.** A cancelled, expired or
  refunded subscription still has a `currentPeriodEnd` — there it means "when
  access stops", not "when money moves". The field is null whenever
  `cancelAtPeriodEnd` is set or the status is outside
  `ENTITLEMENT_BEARING_STATUSES`, so an operator is never shown a churned
  customer as about to pay again.
- **`monthsPaid` has no counter behind it.** It is summed over PAID invoices,
  each contributing the calendar-month length of its own `periodStart`/
  `periodEnd`, falling back to the interval of the subscription it was issued
  against when the document carries no period. Calendar months, not days,
  because `addCalendarMonths` clamps 31 Jan + 1 month to 28 Feb and a day count
  would truncate that period to zero. A sub-month period counts as 1, never 0.
  A fully refunded invoice leaves `PAID` and correctly stops counting.
- **`totalPaidMinor` is a list, one integer per currency.** Never one blended
  total (rule 28.4).

`status` and `billingInterval` are plain `String` columns, so the module builds
a draft with `string` fields and `adminUserSubscriptionStatisticsSchema` parses
it into the enum-typed `AdminUserSubscriptionStatistics`. That is a runtime
check, not a cast: an unrecognised status fails there rather than reaching an
admin screen typed as something it is not.

## Commands

```bash
npm run dev              # tsgo --watch + tsc-alias --watch + nodemon
npm run build            # production build
npm run typecheck        # tsgo --noEmit
npm run lint             # ESLint
npm run test             # Jest
npm run test:cov         # Jest + coverage (92% floor enforced)
npm run migrate          # prisma migrate deploy
npm run prisma:generate  # regenerate Prisma client
```

## Docker rebuild

```bash
./scripts/claw.sh stop payment-service
./scripts/claw.sh rm -f payment-service
docker rmi claw-payment-service
./scripts/claw.sh up -d --build payment-service
```

## All standard backend rules apply

See root `CLAUDE.md`. Key points, plus the money/card rules above:

- No `any`, no `!`, no `eslint-disable`, no `console.log`.
- No `process.env` outside `AppConfig`.
- Controllers: 3-line methods, no try/catch, no throw.
- Services: ≤ 30 lines per method. Managers: ≤ 80, complexity ≤ 15.
- Repositories: pure data access, no throw.
- No inline types/enums/constants in logic files.
- Every third-party library wrapped in `src/common/utilities/<name>.utility.ts`.
- Every public method logs `debug` on entry and `error` in every `catch`.
