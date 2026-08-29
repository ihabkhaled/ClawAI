# Pay-As-You-Go Connector Credit — the mechanism

How a paid provider call becomes a debit, end to end. The **decisions** behind
this design are in [ADR-078](../13-adr/adr-078-payg-connector-credit.md) through
[ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md); the **intent and
acceptance criteria** are in
[`docs/02-business-product/payg-credit-spec.md`](../02-business-product/payg-credit-spec.md);
the **numbers** are in [`docs/business/`](../business/README.md). This page is the
machinery.

## The one-sentence version

A user's monthly plan allowance and their purchased credit live in one wallet in
auth-service; before any paid provider call, the calling service asks auth to
reserve money and is told the maximum number of output tokens it may request; the
provider is then physically incapable of producing an answer that costs more than
the balance.

## Vocabulary

| Term          | Meaning                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| **micro-USD** | Integer millionths of a dollar. Every money figure in this feature. Floats are banned.       |
| **GRANT**     | The plan allowance. Resets each period, does **not** roll over.                              |
| **PURCHASED** | Credit bought with money. Never expires, survives a downgrade.                               |
| **available** | `grant + purchased − reserved`, floored at 0. What the next request may spend.               |
| **hold**      | A reservation. Money removed from `available` but not yet spent.                             |
| **clamp**     | Lowering `maxOutputTokens` so the worst-case cost fits the balance.                          |
| **surface**   | Which product feature spent the money — a `PaygSurface` member, on every ledger row.         |
| **metered**   | This request will debit credit. The opposite is not "free to the user" but "free to ClawAI". |

`1 weighted token === 1 micro-USD` (`WEIGHTED_TOKENS_PER_USD === MICRO_USD_PER_USD`,
`packages/shared-constants/src/billing.constants.ts:13-14`). That identity is why
`Plan.monthlyProviderCostCeilingMicroUsd` and `Plan.monthlyTokenQuota` are the
same number, and why the credit grant is that same number rather than a third one.

## The six steps

### 1. Classification — is this request metered?

Decided **server-side, in auth-service, once**
([ADR-082](../13-adr/adr-082-payg-classification-grain.md)):

```
isPayg(provider, model) =
      provider ∉ PAYG_EXEMPT_PROVIDERS          -- { OLLAMA, LLAMACPP }
  AND connectorPolicy(provider) is PAYG         -- connector-service, cached 60 s
```

`connectorPolicy` is a rollup of `Connector.isPayAsYouGo` at **provider** grain:
a provider is PAYG when **any enabled** connector for it is PAYG.
`GET /internal/connectors/payg-policy` returns the map; auth caches it under
`claw:payg:policy:` for `PAYG_POLICY_CACHE_TTL_SECONDS` (60 s). There is
deliberately no `connector.payg_policy_changed` event.

`PaygMeter` in `packages/shared-entitlements` is a **thin client**. It calls auth
and returns the answer — no classification, no pricing, no thresholds — because a
predicate compiled into six `node_modules` copies would need six container
rebuilds to change, and D1 promises an admin toggle.

Three short-circuits return `metered: false` before any wallet read: `NOT_PAYG`,
`METERING_DISABLED` (the `payg.credit.enabled` kill switch), and `ADMIN_BYPASS`.

### 2. Rate lookup — what does this model cost?

auth reads the input and output rates from **routing-service**, which owns model
prices, over signed internal HTTP, cached 300 s under `claw:payg:rate:`
([ADR-079](../13-adr/adr-079-auth-model-price-cache.md)). The
`routing.model_cost.published` consumer busts one key when an administrator
reprices, so the change lands on the next request.

**The one assertion that carries this whole feature**:
`ModelCostService.unpricedSnapshot` answers a **local** provider with
`isPriced: true` at a rate of **0** — correct for a model on the user's own GPU,
catastrophic for a metered one. `isUsablePaygRate`
(`modules/credit/utilities/payg-classification.utility.ts`) therefore treats a
rate carrying `isLocalComputeFallback` as **unpriced and blocked**, never free.

An unpriced model on a metered provider is refused with `PAYG_MODEL_UNPRICED`. An
unreachable routing-service is refused with `PAYG_PRICING_UNAVAILABLE`. **Never
free** — an unpriced paid model is an unbounded liability, not a giveaway.

### 3. Affordability clamp — how long an answer can this balance buy?

```
inputCost        = ceil(promptTokens × inputRatePerToken)
                 + ceil(cachedPromptTokens × cachedRatePerToken)
affordableOutput = floor((available − inputCost) / outputRatePerToken)
maxOutputTokens  = min(requestedMax, affordableOutput)

if (inputCost > available)                        → 402 PAYG_PROMPT_TOO_EXPENSIVE
if (maxOutputTokens < PAYG_MIN_VIABLE_OUTPUT_TOKENS = 256) → 402 PAYG_CREDIT_EXHAUSTED
```

This is the design's keystone. `computeDefaultMaxTokens`
(`chat-service .../constants/output-token-bounds.constants.ts:59-68`) returns
`ctxSize − promptTokens − 256`, so a default request asks for roughly 32,000
output tokens; at $10 per million that single un-clamped worst case is around
$0.32, more than Starter's entire **daily** allowance. Reserving the un-clamped
worst case would refuse nearly every request on nearly every plan.

With the clamp, the caller sends `hold.maxOutputTokens` to the provider and the
provider **cannot** produce a response that costs more than the balance. The user
gets a shorter answer rather than a refusal, and the clamp is surfaced — it is not
a silent truncation (see §"Telling the user", below).

### 4. Reserve — the nine-window atomic admission

`CreditReservationManager` calls `RESERVE_QUOTA_LUA`
(`modules/quota/constants/quota-redis.constants.ts:94`) — one Redis `EVAL`,
**nine** windows, fail-closed ([ADR-080](../13-adr/adr-080-one-reservation-not-two.md)):

```lua
local names = {
  'DAY', 'WEEK', 'MONTH', 'PROVIDER_COST', 'CONCURRENCY', 'CHATS', 'MESSAGES',
  'CREDIT_GRANT', 'CREDIT_PURCHASED'
}
```

The two credit windows **invert the encoding** of the other seven: the "limit" is
the wallet bucket's balance read from Postgres, and the counter holds only the
**outstanding holds**. Settled spend is subtracted in Postgres and never
accumulated in Redis, so losing the Redis tail costs a safety margin, not a
balance — production Redis is RDB-only.

The debit order is **GRANT then PURCHASED**: spend the perishable half before the
money someone paid for.

A row is written to `WeightedUsageRecord` (`state: RESERVED`, `isPayg: true`, with
the per-bucket split) and a `RESERVATION` row to `credit_ledger_entries` carrying a
**negative** `amountMicroUsd` and **zero** bucket deltas. The reservation is
**idempotent on `(userId, requestId)`** — a retried request reuses its hold.

### 5. Provider call, then finalize or release

The caller uses `hold.maxOutputTokens`, always — never the value it asked for.

- **Success** → `finalize` with the real usage (`promptTokens`,
  `completionTokens`, `cachedPromptTokens`, `reasoningTokens`, tool/search calls).
  The hold is reconciled against reality: a `CONSUMPTION` row moves the buckets, a
  `RESERVATION_RELEASE` row cancels the hold, and the pair sums to the actual
  spend. An unknown `reservationId` returns `204` and a warning, never a 5xx — the
  user already has their answer, and a finalize failure must not surface as a
  request failure.
- **Failure before the user got anything** → `release`. Idempotent: a double
  release is a no-op, not a double refund (`markReleased` returns the row count and
  the caller gates on it). Each bucket is returned **to its own side** — returning
  GRANT as PURCHASED would mint permanent money out of an expiring allowance.
- **Neither** (a crashed container, a killed replica) → the **sweeper** reclaims
  the hold after `PAYG_RESERVATION_TTL_MS` (15 min), single-flight under the Redis
  lock `claw:job:credit:reservation-sweep` with an owner-token compare-and-delete
  release. chat-service runs four replicas and a rolling recreate kills in-flight
  streams, so this path runs on every deploy — it is not theoretical.

### 6. The ledger is the record

`credit_ledger_entries` is **append-only**. The wallet row is a materialized sum
of it, and must always reconcile:

```
wallet.grantMicroUsd     == SUM(grant_delta_micro_usd)
wallet.purchasedMicroUsd == SUM(purchased_delta_micro_usd)
available                == SUM(amount_micro_usd)
```

Nine `CreditLedgerKind` members explain every row: `PLAN_GRANT`, `GRANT_EXPIRY`,
`TOPUP`, `TOPUP_REVERSAL`, `RESERVATION`, `RESERVATION_RELEASE`, `CONSUMPTION`,
`ADMIN_ADJUSTMENT`, `PROVIDER_FAILURE_REFUND`. **A correction is a new
compensating row, never an edit** — the same rule
[ADR-064](../13-adr/adr-064-refund-ledger-and-entitlement-policy.md) applies to the
payment service's financial tables.

`source_event_id` is `@unique`, so a redelivered `billing.credit.topup_succeeded`
collides **at the database** rather than at an application check two consumers can
race.

## The sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant S as Calling service<br/>(chat / image / workspace / routing)
    participant M as PaygMeter<br/>(shared-entitlements)
    participant A as auth-service<br/>credit module
    participant C as connector-service
    participant R as routing-service
    participant DB as Postgres<br/>wallet + ledger
    participant RD as Redis<br/>hold counters
    participant P as Paid provider

    U->>S: send a message / generate an image
    S->>M: reserve({ userId, requestId, provider, model,<br/>surface, promptTokens, requestedMaxOutputTokens })
    M->>A: POST /internal/credit/reserve (inter-service auth)

    A->>A: kill switch? admin? exempt provider?
    A->>C: GET /internal/connectors/payg-policy (cached 60 s)
    C-->>A: { OPENAI: true, GEMINI: true, ... }

    alt not metered
        A-->>M: { metered: false, reason, maxOutputTokens }
        Note over S,P: local / disabled / admin — no wallet touched
    else metered
        A->>R: GET /internal/router-models/cost/:provider/:model (cached 300 s)
        R-->>A: { inputPerMillionMicroUsd, outputPerMillionMicroUsd, isPriced }
        A->>A: reject if unpriced or local-compute fallback
        A->>DB: read wallet (grant, purchased, reserved)
        A->>A: clamp maxOutputTokens to what `available` buys
        A->>RD: EVAL RESERVE_QUOTA_LUA — 9 windows, atomic
        alt refused
            RD-->>A: { ok: false, window: CREDIT_GRANT | ... }
            A-->>M: 402 PAYG_CREDIT_EXHAUSTED { available, required }
            M-->>S: throw PaygCreditExhaustedError
            S-->>U: 402 + "add credit" / degrade to a local model
        else admitted
            RD-->>A: { ok: true }
            A->>DB: WeightedUsageRecord(RESERVED) + ledger RESERVATION row
            A-->>M: { metered: true, reservationId, maxOutputTokens, clamped, heldMicroUsd }
        end
    end

    M-->>S: hold
    S->>P: call with maxTokens = hold.maxOutputTokens
    alt provider answered
        P-->>S: text + usage
        S->>M: finalize(hold, usage, { toolCalls })
        M->>A: POST /internal/credit/finalize
        A->>RD: decrement hold counters
        A->>DB: CONSUMPTION + RESERVATION_RELEASE rows; wallet updated
        A-->>M: 204
        S-->>U: answer (+ "shortened to fit your credit" if clamped)
    else provider threw
        S->>M: release(hold, 'PROVIDER_ERROR')
        M->>A: POST /internal/credit/release
        A->>RD: decrement hold counters
        A->>DB: RESERVATION_RELEASE — each bucket back to its own side
        A-->>M: 204 (idempotent)
    end

    Note over A,DB: neither arrived? the sweeper reclaims after 15 min,<br/>single-flight under claw:job:credit:reservation-sweep
```

## Every surface that meters

One `PaygSurface` member per place that can reach a paid provider. **Adding a
surface without adding a member is what lets spend become anonymous again**, which
is why [rule 37](../../rules/37-payg-credit-integrity.md) requires the two to
change together.

| `PaygSurface`      | Service   | What it covers                                                         | Audit ids   |
| ------------------ | --------- | ---------------------------------------------------------------------- | ----------- |
| `CHAT`             | chat      | Ordinary chat, regenerate, edit-resend, streaming                      | U1          |
| `COMPARE`          | chat      | Compare mode — **one hold per lane**, not one per run                  | —           |
| `JUDGE`            | chat      | The judge / critic second pass over a compare run                      | —           |
| `ORCHESTRATION`    | chat      | The nine advanced labs; `workflow` narrows which one                   | —           |
| `CODING_AGENT`     | chat      | The runtime-v2 agent loop — one row per turn                           | U11         |
| `IMAGE`            | image     | Image generation, **including each attempt of an auto-fallback chain** | U3, U4      |
| `FILE_GENERATION`  | chat      | Document/file content generation                                       | —           |
| `WORKSPACE_ACTION` | workspace | AI actions, multi-model review, chain NL draft, IMPL handoff           | U8–U10, U12 |
| `ROUTING`          | routing   | The cloud router's own paid calls — **one hold per attempt**           | U5, U6      |
| `RESEARCH`         | research  | Research enrichment that reaches a paid model rather than a search API | —           |

The vision-prompt path (audit **U2**) previously hard-coded a direct Gemini call
and bypassed the chokepoint; it now goes through `callProvider` at
`PaygSurface.IMAGE` with `workflow` naming the vision step.

`requestId` must not collide under fan-out. Compare keys per lane; routing keys
`${traceId}:${entryId}:${attemptNumber}` because a retry inside an entry is a
second paid call and sharing the key would silently under-charge it. See
[`skills/meter-a-paid-provider-call.md`](../../skills/meter-a-paid-provider-call.md).

### Not metered, and why

| Path                                        | Why                                                                                                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claw-agent-service`                        | Control plane only — grep for provider hosts returns zero hits                                                                                                   |
| `claw-research-service` search calls        | A search SaaS, metered separately from model inference                                                                                                           |
| `claw-file-generation-service` formatters   | Formatters, no model call of their own                                                                                                                           |
| `claw-memory-service` embeddings            | Local embeddings                                                                                                                                                 |
| Ollama / llama.cpp                          | `PAYG_EXEMPT_PROVIDERS` — the user's or operator's own hardware                                                                                                  |
| **Ollama Cloud**                            | **Unmetered by default.** A routing-only provider name connector-service does not carry, so it resolves unclassified. ADR-078 A3; the lever is the admin toggle. |
| **Admin routing replay / shadow eval (U7)** | **Known gap.** Reaches billed providers with no `userId`; `RoutingDecision` has no `userId` column. Recorded at `router-shadow-evaluation.manager.ts:138`.       |

## Telling the user

A clamp that nobody sees is a silently truncated answer, which is worse than a
refusal. `clamped: true` propagates as `LlmResponse.paygClamped`, onto the
assistant message metadata, and as a `StreamEventType.PAYG_CREDIT_CLAMPED` frame.

Compare is **all-or-nothing**: every lane's hold is taken up front, and if one
does not fit, none is taken and `PAYG_COMPARE_CREDIT_INSUFFICIENT` is raised — a
partial fan-out charges for a comparison the user cannot use.

Refusal payloads carry `errorCode`, `availableMicroUsd` and `requiredMicroUsd` —
the user's own numbers plus the code the frontend maps — and **no rate, ceiling
or margin
else**. Never a cost ceiling, never a margin, never a provider rate.

## Top-up

`POST /billing/credit-topup/checkout-sessions` with
`{ packageId, gateway, idempotencyKey }` and **never an amount**.
`CreditChargeResolverService` derives the charge from an immutable
`CreditPackageVersion` fetched out of auth. On capture, payment writes an outbox
row and publishes `billing.credit.topup_succeeded`; auth's inbox consumer raises
`PURCHASED` exactly once, keyed on the unique `source_event_id`
([ADR-083](../13-adr/adr-083-credit-topup-checkout-purpose.md)).

**Boot ordering is load-bearing.** `packages/shared-rabbitmq/src/rabbitmq.service.ts:114`
publishes **without `mandatory`** onto a topic exchange, and queues are asserted by
the **consumer** at boot. If payment drains a credit event before auth has ever
subscribed, the message is discarded, no DLQ receives anything, and the outbox row
is still marked `PUBLISHED` — the money is taken and no credit is granted.
**auth-service must be healthy before payment-service starts.**

## Grant renewal

`UserCreditWallet.periodKey` is a UTC `YYYY-MM`. Renewal is driven off a
**mismatch** with the current key, so a missed run self-heals on the next tick
instead of skipping a period. The roll writes a `GRANT_EXPIRY` row for the unused
remainder (so the ledger still sums to the wallet) and a `PLAN_GRANT` row for the
new period, then emits `credit.grant.renewed`. Single-flight under
`claw:job:credit:grant-renewal`.

`@nestjs/schedule` is a **new dependency of auth-service** for this. It is why
auth needs a full image rebuild rather than a restart —
see [`runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md).

## Events

| Pattern                          | Producer | Consumer | Purpose                        |
| -------------------------------- | -------- | -------- | ------------------------------ |
| `billing.credit.topup_succeeded` | payment  | auth     | Raise `PURCHASED`, once        |
| `billing.credit.topup_reversed`  | payment  | auth     | Compensating `TOPUP_REVERSAL`  |
| `credit.balance.low`             | auth     | audit    | Threshold crossing, warn early |
| `credit.balance.exhausted`       | auth     | audit    | The wall was hit               |
| `credit.grant.renewed`           | auth     | audit    | A period rolled                |
| `routing.model_cost.published`   | routing  | auth     | Bust one cached rate           |

`routing.model_cost.published` carries `{ provider, modelKey, version }` and
**never a rate** — a topic exchange is readable by any consumer that binds the
pattern, and a rate is a margin input.

## Storage

| Table                     | Owner     | What it holds                                                          |
| ------------------------- | --------- | ---------------------------------------------------------------------- |
| `user_credit_wallets`     | auth      | One row per user: grant, purchased, reserved, period, lifetimes        |
| `credit_ledger_entries`   | auth      | Append-only movements; unique `source_event_id`                        |
| `credit_packages`         | auth      | Top-up SKUs (no money on the row)                                      |
| `credit_package_versions` | auth      | Immutable price + credit, `activeKey` partial-unique idiom             |
| `weighted_usage_records`  | auth      | + `is_payg`, `credit_grant_micro_usd`, `credit_purchased_micro_usd`    |
| `connectors`              | connector | + `is_pay_as_you_go`                                                   |
| `checkout_sessions`       | payment   | + `credit_package_id`, `credit_package_version_id`, `credit_micro_usd` |

## Failure modes, and which way each fails

| Failure                       | Metered request                                                                                 | Exempt request |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | -------------- |
| auth-service unreachable      | **refused** (closed)                                                                            | proceeds       |
| routing-service unreachable   | **refused** — `PAYG_PRICING_UNAVAILABLE`                                                        | proceeds       |
| connector-service unreachable | cached policy, then **refused**                                                                 | proceeds       |
| Redis unreachable             | **refused** — the admission gate is Redis                                                       | proceeds       |
| Model has no price row        | **refused** — `PAYG_MODEL_UNPRICED`, never free                                                 | n/a            |
| RabbitMQ down at top-up       | money taken, credit granted late from the outbox — **unless auth never subscribed** (see above) | n/a            |
| Request dies mid-flight       | hold reclaimed by the sweeper after 15 min                                                      | n/a            |

An outage must not hand out unbounded provider spend, and must not take the whole
product down either. Fail **closed** for metered, **open** for exempt — which is
D4 exactly.

## The HTTP surface

Frozen contract. Everything that spends money codes against this.

### Internal — auth-service, `/api/v1/internal/credit/*`

Every route requires `buildInterServiceAuthHeader` and validates with bounded
Zod. These move dollars, so they deliberately do NOT inherit the `@Public()`
shape that `internal/quota` still has.

| Route                                              | Body                                                                                                                                 | Returns                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /internal/credit/reserve`                    | `userId`, `requestId`, `provider`, `model`, `surface`, `workflow?`, `promptTokens`, `cachedPromptTokens`, `requestedMaxOutputTokens` | `{metered:false, reason, maxOutputTokens}` · `{metered:true, reservationId, maxOutputTokens, clamped, heldMicroUsd, availableAfterMicroUsd}` · **402** `{errorCode, availableMicroUsd, requiredMicroUsd}` |
| `POST /internal/credit/finalize`                   | `reservationId`, `usage{promptTokens, completionTokens, cachedPromptTokens, reasoningTokens}`, `toolCalls`, `searchCalls`            | `204`                                                                                                                                                                                                     |
| `POST /internal/credit/release`                    | `reservationId`, `reason`                                                                                                            | `204`                                                                                                                                                                                                     |
| `GET /internal/credit/wallet/:userId`              | —                                                                                                                                    | `PaygWalletSnapshot`                                                                                                                                                                                      |
| `GET /internal/credit/packages`                    | —                                                                                                                                    | active `CreditPackageView[]`. payment-service proxies this so the checkout UI has a single origin.                                                                                                        |
| `GET /internal/credit/packages/:id/active-version` | —                                                                                                                                    | the immutable version a top-up is priced from. Deliberately uncached: it decides a charge.                                                                                                                |

`reserve` is idempotent on `(userId, requestId)` — a retry reuses its hold
rather than taking a second one. `finalize` on an unknown reservation returns
`204` and warns: the user already has their answer, and a bookkeeping failure
must never surface as a failed request.

### User-facing — nginx `location /api/v1/credit` → auth-service:4001

**Not under `/api/v1/billing`.** That prefix already proxies to
payment-service, so an auth-owned wallet route placed there resolves to the
wrong service in production while passing every localhost test.

| Route                                | Returns                                        |
| ------------------------------------ | ---------------------------------------------- |
| `GET /credit/me`                     | `PaygWalletSnapshot`                           |
| `GET /credit/me/ledger?cursor&limit` | `{entries: PaygLedgerEntryView[], nextCursor}` |
| `GET /credit/packages`               | `CreditPackageView[]` — active versions only   |

### Admin — `/api/v1/admin/credit`, already proxied to auth

All gated on `ADMIN_CREDIT_MANAGE`: `GET /wallets/:userId`,
`POST /wallets/:userId/adjust`, `GET|POST /packages`,
`POST /packages/:id/versions`.

### Top-up purchase — payment-service, inherits `location /api/v1/billing`

| Route                                             | Purpose                                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /billing/credit-topup/checkout-sessions`    | Start a purchase. Body is `{packageId, gateway, idempotencyKey}` and **never an amount** — the price is resolved server-side from the immutable `CreditPackageVersion`. |
| `GET /billing/credit-topup/packages`              | The buyable catalog, proxied from auth so the checkout UI has one origin.                                                                                               |
| `GET /billing/credit-topup/checkout-sessions/:id` | Poll a started purchase.                                                                                                                                                |

There is deliberately **no** completion route here: settlement reuses the
purpose-agnostic `/billing/checkout-sessions/:id/complete-*` endpoints, so a
top-up goes through `PaymentActivationService` like every other payment.

## Related

- [ADR-078](../13-adr/adr-078-payg-connector-credit.md) · [079](../13-adr/adr-079-auth-model-price-cache.md) · [080](../13-adr/adr-080-one-reservation-not-two.md) · [081](../13-adr/adr-081-retire-routing-cost-budget.md) · [082](../13-adr/adr-082-payg-classification-grain.md) · [083](../13-adr/adr-083-credit-topup-checkout-purpose.md)
- [`rules/37-payg-credit-integrity.md`](../../rules/37-payg-credit-integrity.md) — the constraints
- [`skills/meter-a-paid-provider-call.md`](../../skills/meter-a-paid-provider-call.md) — wiring a new surface
- [`docs/11-runbooks/runbook-payg-credit.md`](../11-runbooks/runbook-payg-credit.md) — deploying it
- [`docs/03-architecture/universal-token-accounting.md`](universal-token-accounting.md) — the chokepoint this rides on
- [`docs/03-architecture/billing-threat-model.md`](billing-threat-model.md)
