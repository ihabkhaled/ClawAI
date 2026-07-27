---
name: add-a-payment-gateway-flow
summary: Extend a payment gateway adapter with verified signatures, durable idempotency, integer money, and redaction.
task_keywords:
  [
    payment gateway,
    paypal,
    paymob,
    checkout flow,
    payment webhook,
    refund adapter,
    gateway signature,
    provider idempotency,
  ]
applies_to: [apps/claw-payment-service, infra/nginx, apps/claw-frontend]
required_rules:
  [
    08-security-rules,
    13-external-library-wrappers-and-adapters,
    28-billing-integrity-and-api-contracts,
  ]
required_context: [architecture-map, environment-ownership-map, event-flow-map]
affected_workspaces: [apps/claw-payment-service, apps/claw-frontend]
required_tests:
  [adapter contract, webhook signature, idempotent replay, amount and currency mismatch]
required_docs:
  [docs/03-architecture/billing-threat-model.md, docs/04-backend/service-guide-payment.md]
validation_lane: cd apps/claw-payment-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Payment Gateway Flow

## When to use

Use when adding or changing checkout, capture, setup-token, refund, webhook, or
authoritative gateway-read behavior.

## When NOT to use

Do not call a provider outside its adapter, create a second email/HTTP wrapper,
or use a gateway response as the sole local idempotency boundary.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md)
- [`../rules/28-billing-integrity-and-api-contracts.md`](../rules/28-billing-integrity-and-api-contracts.md)
- [`../docs/03-architecture/billing-threat-model.md`](../docs/03-architecture/billing-threat-model.md)

## Repository discovery steps

1. Trace the existing `PaypalAdapter` and `PaymobAdapter` contract.
2. Find the checkout/webhook idempotency repositories and activation service.
3. Identify the exact amount, currency, ownership, and terminal-state checks.
4. Locate all nginx, env, installer, compose, and documentation surfaces.

## Tests-first plan

Write adapter response-schema tests; missing/wrong signature tests; amount and
currency mismatch tests; duplicate webhook/request tests; timeout/5xx tests;
and exact frontend repository body tests when UI calls the flow.

## Implementation steps

1. Add the provider operation to the existing adapter interface.
2. Validate bounded provider responses before using them.
3. Verify webhook signatures against exact raw/body semantics before claiming
   the event.
4. Commit a local idempotency/reservation record before ambiguous provider
   operations.
5. Compare integer amount and currency with the local snapshot.
6. Apply state through the existing transactional service and outbox.
7. Expose only the intended public route; keep internal routes private.

## Security considerations

Never log or persist PAN, CVV, OTP, 3-D Secure payloads, raw provider bodies,
access tokens, webhook secrets, or unmasked payment credentials. Vault tokens
use AES-256-GCM with owner-bound AAD and a key version.

## Failure modes

- Signature verification after parsing/apply permits forged state.
- Provider-only idempotency differs across gateways.
- Owner identity taken from callback input creates IDOR.
- Float conversion or missing currency checks activates the wrong purchase.
- Retrying an ambiguous refund can return money twice.

## Validation commands

```bash
cd apps/claw-payment-service
npm run typecheck && npm run lint && npm test && npm run build
```

Also validate nginx configuration and run the live sandbox callback round-trip.

## Documentation updates

Update the payment service guide, billing threat model, environment-variable
reference, nginx/docker guide, API reference, and event flow when applicable.

## Definition of done

- Provider calls exist only in the adapter.
- Signatures, runtime schemas, ownership, integer amount/currency, and
  idempotency are tested.
- Secrets and raw payment data are absent from responses, persistence, and logs.
- Deployment and operational surfaces are wired.
