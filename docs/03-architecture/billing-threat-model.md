# Billing Threat Model

What an attacker would try against the payment path, and what stops them.

> **The one invariant.** A paid entitlement can exist only after a _verified
> payment_ or an _audited admin grant_. No client input, no redirect parameter,
> and no unverified webhook may move a user onto a paid plan.

---

## 1. Trust boundaries

| Boundary               | Trusted?             | Why                                                                                  |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Browser → API          | **No**               | Every price, plan id, currency and user id is re-resolved server-side                |
| Gateway → webhook      | **No**               | Authenticity comes from signature/HMAC verification, never from the URL being secret |
| Gateway → API response | **No**               | Validated with Zod before it becomes business state                                  |
| payment-service → auth | Yes, _authenticated_ | Producer identity is checked on every entitlement event                              |
| auth-service → payment | Yes, _authenticated_ | Shared service token, constant-time comparison, bounded Zod response, user-id match  |
| Redirect / return page | **No**               | Display-only. A browser can be told anything                                         |

The redirect boundary is the one people get wrong. A user who reaches
`/checkout/success` has proved nothing — they may have edited the URL. The only
evidence that counts is a server-side capture read or a verified webhook.

---

## 2. Attacks and controls

### Price and plan tampering

| Attack                          | Control                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Post a cheaper `amount`         | Amount never comes from the request; it is read from the immutable `PlanPriceVersion` bound to the session |
| Substitute another `planId`     | Plan is resolved server-side and pinned to the session at creation                                         |
| Swap `currency` to a weaker one | Currency is compared exactly at verification; a mismatch is a refusal                                      |
| Replay an old, cheaper price    | Prices are versioned and the session stores the version id, not the number                                 |

### Payment forgery

| Attack                                   | Control                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Forge a webhook                          | PayPal: signature verified via the gateway's verify API. Paymob: HMAC-SHA512 over the fixed field order, compared in **constant time**  |
| Replay a real webhook                    | Unique `(gateway, providerEventId)`; a duplicate is recorded and ignored                                                                |
| Claim success from the redirect          | Redirects are display-only; entitlement requires a verified capture                                                                     |
| Pay for session A, claim session B       | `custom_id` / `merchant_order_id` must match the session being completed                                                                |
| Pay a valid amount in the wrong currency | Currency checked independently of amount                                                                                                |
| Pay, then charge back                    | `CHARGEBACK` is terminal; entitlement is revoked immediately                                                                            |
| Race partial refunds above the capture   | A committed `PENDING` reservation reduces the balance; a DB trigger locks the charge and rejects an aggregate above the captured amount |
| Use a partial refund to revoke service   | Partial refunds are audit-only for entitlement; only cumulative full refund or chargeback revokes paid access                           |
| Pay, then refund, keep access            | Reversal flags (`is_refunded`, `is_voided`, `error_occured`) are checked — `success: true` alone is never sufficient                    |

### Concurrency and idempotency

| Attack                          | Control                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Double-submit checkout          | Idempotency key scoped `(user, key)`; the replay returns the original session                |
| Race two upgrades               | Conditional update on the quote's status — exactly one confirm wins                          |
| Race two subscriptions          | `unique_active_key` — the **database** rejects a second entitlement-bearing row              |
| Retry a capture after a timeout | Captures are never retried; the order is read back instead                                   |
| Redeliver an entitlement event  | `createMany({skipDuplicates})` on the inbox's unique `eventId`                               |
| Deliver events out of order     | `effectiveAt` comparison — a stale event is skipped, never applied                           |
| Replay entitlement reconcile    | Durable inbox claim; only one failed-event retry claimant can proceed                        |
| Retry an ambiguous refund       | The local reservation is returned for the same operator key; the gateway is not called again |

### Internal endpoint abuse

| Attack                                        | Control                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Call internal status routes from the internet | No `/api/v1/internal/payments` nginx location; regression test enforces absence    |
| Present a user JWT as service authority       | Guard accepts only the exact `Service` scheme and shared inter-service token       |
| Time token guesses                            | Equal-length tokens are compared with `timingSafeEqual`                            |
| Return another user's entitlement             | Auth validates the bounded response and requires its `userId` to match the request |
| Leak provider or tenant internals on lookup   | Responses are allowlisted projections; unknown ids share one generic 404           |

### Quota and cost abuse

| Attack                         | Control                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| Race the last quota slot       | All windows checked and incremented in **one Lua script**              |
| Farm free lifetime trials      | Durable `FeatureUsageRecord` keyed to the user, not the browser        |
| Drive unbounded provider spend | Monthly provider-cost ceiling, enforced in the same atomic reservation |
| Exploit an unpriced model      | An unpriced model is **unsafe**, not free — reservations fail closed   |
| Double-release to gain quota   | Release clamps at zero                                                 |
| Rollover abuse across periods  | `EXISTS` guard: a rolled-over window is not charged or credited        |

### Data exposure

| Attack                               | Control                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Read another user's invoices         | Owner resolved from the JWT; user id never accepted from the client             |
| Harvest card data from logs          | No PAN/CVV ever enters the system; response bodies are never logged             |
| Learn margins from an error          | Cost ceilings are internal; error payloads carry stable codes only              |
| Steal a vaulted token                | AES-256-GCM with AAD bound to `userId\|gateway\|paymentMethodId`, key-versioned |
| Extract secrets from a gateway error | Failures log status codes, never provider bodies                                |

---

## 3. What ClawAI is _not_

**Tokenization does not make this PCI compliant.** Using hosted checkout means
ClawAI never touches a PAN, which places the merchant in the smallest scope
(SAQ A territory) — but scope is not compliance. The merchant still owes:

- a completed SAQ appropriate to the integration,
- the gateway's own onboarding and approval,
- evidence that no card data traverses these servers,
- vulnerability management and access control on the surrounding systems.

Claiming compliance because "we only store tokens" is exactly the mistake this
section exists to prevent.

---

## 4. Residual risks

Honest list of what is _not_ fully mitigated today:

| Risk                                    | Status                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Saved cards / vault endpoints           | **Not implemented.** Deliberate — the spec forbids advertising saved cards before merchant approval |
| Durable publish of `runtime.progress.*` | SSE only; RabbitMQ publishing is future work                                                        |
| FX provider outage with no fallback     | Fails the checkout by design; no degraded-rate path                                                 |
| Chargeback dispute automation           | Manual — the reconciliation dashboard surfaces cases, a human answers them                          |
| Gateway-side fraud scoring              | Delegated to PayPal/Paymob; ClawAI adds rate limiting only                                          |

---

## 5. Incident playbook

| Symptom                          | First action                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Webhook signature failures spike | Confirm the webhook id/HMAC secret matches the gateway; **do not** relax verification                             |
| Entitlement drift                | Re-run reconciliation; the inbox is idempotent, replay is safe                                                    |
| Suspected token compromise       | Rotate `PAYMENT_TOKEN_ENCRYPTION_KEY`, bump the key version, revoke tokens at the gateway                         |
| Duplicate charges reported       | Check `PaymentTransaction` by idempotency key before refunding — a duplicate _record_ is not a duplicate _charge_ |
| A plan is mispriced              | Publish a **new** price version; never edit the old one, or historical invoices stop reconciling                  |

Rotating `PAYMENT_TOKEN_ENCRYPTION_KEY` orphans every vaulted token by design —
that is the point of a rotation. Both installers preserve it precisely so it is
never rotated by accident.
