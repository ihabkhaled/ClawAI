---
name: meter-a-paid-provider-call
summary: Wire a new money-spending surface into PAYG credit — reserve, finalize, release, a PaygSurface member, the 402 mapping, and the test that proves it.
task_keywords:
  [
    payg,
    credit,
    meter,
    metering,
    paid provider call,
    reserve credit,
    finalize credit,
    release credit,
    wallet,
    payg surface,
    credit ledger,
    402,
    payment required,
    payg credit exhausted,
    affordability clamp,
    max output tokens,
    new provider call site,
    spend,
    billing metering,
  ]
applies_to:
  [
    backend,
    packages/shared-entitlements,
    apps/claw-auth-service,
    any service that calls a paid model,
  ]
required_rules: [37-payg-credit-integrity, 28-billing-integrity-and-api-contracts, 02-backend-rules]
required_context: [payg-credit, permission-map, event-flow-map]
affected_workspaces:
  [
    packages/shared-types,
    packages/shared-entitlements,
    apps/claw-auth-service,
    apps/claw-<calling>-service,
  ]
required_tests:
  [reserve/finalize ledger spec, provider-throw release spec, fan-out distinct-hold spec]
required_docs:
  [
    docs/03-architecture/payg-credit.md,
    docs/04-backend/service-guide-<name>.md,
    apps/claw-<name>-service/CLAUDE.md,
  ]
validation_lane: cd apps/claw-<calling>-service && npx tsgo --noEmit && npm run lint && npm test && npm run build
---

# Skill: Meter a Paid Provider Call

You are about to add code that reaches a **paid cloud model**. Until it is metered,
it spends the platform's money against no wallet and no ceiling. This runbook makes
that mechanical.

## When to use

- A new call site reaches OpenAI, Anthropic, Gemini, DeepSeek, Grok or Bedrock.
- A new orchestration mode, agent loop, or background job calls a model.
- An existing unmetered path is being closed (a `U`-numbered audit finding).
- A fan-out (compare, fallback chain, multi-turn loop) needs one hold per call.

## When NOT to use

- The call goes only to **Ollama or llama.cpp**. Those are exempt, and the meter
  returns `metered: false` anyway — do not special-case them yourself.
- You are calling a **search** or **storage** API, not a model. Research search is
  metered separately.
- The work **dispatches to another service** that meters its own provider call
  (chat → image-service, chat → file-generation-service). A hold on both sides
  debits one generation twice.
- You want a "can this user afford it?" **pre-check**. There is deliberately no
  such thing. **The reservation is the gate.**

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md) — run the resolver first.
- [`../rules/37-payg-credit-integrity.md`](../rules/37-payg-credit-integrity.md) — the constraints you must not break.
- [`../docs/03-architecture/payg-credit.md`](../docs/03-architecture/payg-credit.md) — the mechanism, and the table of every surface that already meters.
- The `CLAUDE.md` of the service you are editing — chat, image, workspace and routing each carry service-local metering rules.

## Repository discovery steps

1. Read `packages/shared-types/src/enums/payg-surface.enum.ts`. Does a member
   already describe your spend? Reuse beats adding.
2. Read `packages/shared-entitlements/src/payg-meter.ts` — the client's exact
   signature, and note it is **deliberately thin**.
3. Find how the service you are in already reaches the meter. **Do not call
   `PaygMeter` directly from a manager** if the service has a wrapper:
   - chat-service → `AccessControlService.reserveCredit / finalizeCredit / releaseCredit`
   - routing-service → `RouterInferenceCoordinatorManager.invokeMetered`
   - image-service → the image-generation service's metering path
     The wrapper is where `PaygCreditExhaustedError` becomes a `BusinessException`
     with `HttpStatus.PAYMENT_REQUIRED`. Bypassing it gives your surface a different
     status code from every other one.
4. Grep for an existing metered call in the same file and copy its shape.

## Tests-first plan

Write these before the implementation. They are the definition of done for the
surface, not extras.

| Test                        | Asserts                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| **Ledger moves**            | A metered call produces a `RESERVATION` then a `CONSUMPTION` naming your `PaygSurface`.       |
| **Provider throw releases** | The provider mock throws → exactly one `RESERVATION_RELEASE`, and the error still propagates. |
| **Ceiling is used**         | The provider mock received `hold.maxOutputTokens`, **not** the value the caller asked for.    |
| **Exempt is untouched**     | The same call through Ollama produces **zero** ledger rows.                                   |
| **Zero balance refuses**    | An exhausted wallet yields a 402 with `PAYG_CREDIT_EXHAUSTED` and no provider call at all.    |
| **Fan-out is distinct**     | N lanes / attempts / turns produce **N** holds with **N** distinct `requestId`s.              |
| **Clamp is visible**        | If your surface renders text, `clamped: true` reaches a **rendered, visible** string.         |

## Implementation steps

### 1. Pick or add the `PaygSurface`

One member per **place that can reach a paid provider**. If none fits, add one —
and add it in the **same commit** as the caller. A surface with no member makes its
spend anonymous, which is what rule 37 exists to prevent.

Use `workflow` (a free-text narrowing) rather than a new member when you are a
variant of an existing surface: the nine orchestration labs all share
`ORCHESTRATION` and differ by `workflow`.

In chat-service the surface is usually **derived** from the `TokenLedgerContext`
you already pass (`PAYG_SURFACE_BY_TOKEN_CONTEXT`), so a new mode is metered the
day it is added. Pass an explicit surface only when the ledger context cannot
express it.

### 2. Choose a `requestId` that cannot collide

Reservation is **idempotent on `(userId, requestId)`**. That is a feature for a
retried HTTP request and a **silent under-charge** for a fan-out that reuses one
key.

| Shape                     | Key                                      | Why                                                                  |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| One call per user request | the request/message id                   | A retry reuses its hold — correct.                                   |
| Compare / fan-out         | `<runId>:lane:<index>`                   | Each lane is a separate paid completion.                             |
| Fallback chain            | `<runId>:attempt:<n>`                    | Each attempt is separately billed by the provider.                   |
| Agentic / tool loop       | `<runId>:turn:<n>`                       | Ten turns are ten completions, and the later ones are the dear ones. |
| Router walk               | `${traceId}:${entryId}:${attemptNumber}` | A retry inside an entry is a second paid call.                       |

**One reservation per PAID CALL, never per user request.**

### 3. Wrap the call

```ts
const hold = await this.accessControl.reserveCredit({
  userId, // never optional on a paid path — see step 5
  requestId,
  provider, // normalize a runtime tag first: local-ollama → OLLAMA
  model,
  surface: PaygSurface.<YOURS>,
  workflow, // optional narrowing
  promptTokens,
  cachedPromptTokens,
  requestedMaxOutputTokens,
});

try {
  // ALWAYS hold.maxOutputTokens. Never the number you asked for.
  const out = await this.callProvider({ ...args, maxTokens: hold.maxOutputTokens });
  await this.accessControl.finalizeCredit(hold, extractUsage(out), { toolCalls });
  return out;
} catch (error) {
  await this.accessControl.releaseCredit(hold, 'PROVIDER_ERROR');
  throw error;
}
```

`PaygReleaseReason` is `'PROVIDER_ERROR' | 'CANCELLED' | 'TIMEOUT'`. Use the one
that is true — the ledger is read by support.

### 4. Map the 402

`reserve` throws `PaygCreditExhaustedError` carrying `errorCode`,
`availableMicroUsd` and `requiredMicroUsd`. The service wrapper maps it to a
`BusinessException` with `HttpStatus.PAYMENT_REQUIRED` and a stable machine code:

| Code                        | Means                                                    |
| --------------------------- | -------------------------------------------------------- |
| `PAYG_CREDIT_EXHAUSTED`     | Not enough balance to buy a viable answer                |
| `PAYG_PROMPT_TOO_EXPENSIVE` | The prompt alone costs more than the balance             |
| `PAYG_MODEL_UNPRICED`       | Metered provider, no price row — **blocked, never free** |
| `PAYG_PRICING_UNAVAILABLE`  | routing-service unreachable — fails closed               |

**The error body carries `availableMicroUsd` and `requiredMicroUsd` and nothing
else.** Never a cost ceiling, a margin, or a provider rate.

If your surface can **degrade** rather than refuse — AUTO routing is the example —
convert the refusal into a request-scoped fallback to a local model instead of
surfacing the 402. D4: at zero credit, PAYG is blocked and local keeps working.

### 5. Decide what happens with no `userId`

**Fail CLOSED for a paid provider, OPEN for a local one.** An unattributable
frontier call is unbounded liability; refusing a model on the operator's own
hardware takes the product down for no gain.

If your call site genuinely has no user — an operator-initiated replay, say —
that is a **known unmetered path** and it must be recorded at the call site with
its reason, the way
`apps/claw-routing-service/src/modules/routing/managers/router-shadow-evaluation.manager.ts:138`
records U7. Do not invent a user to charge.

### 6. Surface the clamp

If `hold.clamped` is true the answer was shortened to fit the balance. Propagate it
to something the user actually sees. A silently shortened reply reads as the model
being bad rather than the wallet being empty.

## Security considerations

- The internal credit endpoints require `buildInterServiceAuthHeader`. They move
  money and must **not** inherit `internal/quota`'s `@Public()` shape.
- Never log a balance beside a `userId`. Log the reservation id, the surface and the
  outcome.
- Never let a caller supply a price, a rate, or an amount. The reservation is priced
  server-side from routing-service's rates.
- Never classify PAYG yourself. A local runtime tag is **renamed**
  (`local-ollama` → `OLLAMA`), never exempted — the decision belongs to
  auth-service ([ADR-082](../docs/13-adr/adr-082-payg-classification-grain.md)).

## Failure modes

| Symptom                                          | Cause                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Spend appears in the ledger with no surface      | You reused a member that does not describe the call, or passed none.                                                                   |
| A fan-out charges once for N calls               | One `requestId` shared across lanes — reservation is idempotent on it.                                                                 |
| Balances shrink and never recover                | A path that returns early without `finalize` or `release`. The sweeper reclaims it after 15 minutes, but the user is short until then. |
| A double refund                                  | `release` called twice without gating on the returned row count.                                                                       |
| Overspend                                        | You passed `requestedMaxOutputTokens` to the provider instead of `hold.maxOutputTokens`.                                               |
| A local chat debits credit                       | You classified locally instead of asking the meter, or a paid provider reached the zero-rate fallback. **Serious** — see rule 37 #6.   |
| One generation debited twice                     | Both the dispatching service and the executing service took a hold.                                                                    |
| Users see a truncated answer with no explanation | `hold.clamped` never reached the UI.                                                                                                   |

## Validation commands

```bash
cd apps/claw-<calling>-service
npx tsgo --noEmit && npm run lint && npm test && npm run build

# if you added a PaygSurface member:
cd packages/shared-types && npx tsgo --noEmit && npm test && npm run build

# prove it end to end against a running stack
docker exec claw-pg-auth psql -U claw -d claw_auth -tAF'|' -c "
  SELECT kind, amount_micro_usd, surface, workflow, provider, model
  FROM credit_ledger_entries ORDER BY occurred_at DESC LIMIT 10;"
```

## Documentation updates

- `docs/03-architecture/payg-credit.md` — add your surface to the metering table.
- The calling service's `CLAUDE.md` — the service-local metering rule, if you
  established one.
- `docs/04-backend/service-guide-<name>.md` — what the service now meters.
- `context/testing-map.md` if you added a new class of test.
- A new `PaygSurface` member is user-visible on the billing ledger, so it needs an
  i18n label in all 13 locales.

## Definition of done

- [ ] A `PaygSurface` member exists for the call, added in the same commit.
- [ ] Reserve → finalize → release wraps every paid call, through the service's
      wrapper rather than `PaygMeter` directly.
- [ ] The provider receives `hold.maxOutputTokens`.
- [ ] `requestId` is unique per **paid call**, proven by a fan-out test.
- [ ] The 402 is mapped to `PAYMENT_REQUIRED` with a stable code and no rate,
      ceiling or margin in the body.
- [ ] An exempt (Ollama) call produces zero ledger rows.
- [ ] `hold.clamped` reaches a rendered, visible surface.
- [ ] Any deliberately unmetered path is recorded **at the call site** with its
      reason.
- [ ] Docs and the architecture surface table updated.
