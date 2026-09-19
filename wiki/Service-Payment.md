# Payment Service

**Workspace:** [`apps/claw-payment-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-payment-service)  
**Port:** 4018  
**Database:** postgresql  
**Test runner:** vitest · **110 test files**  
**API endpoints:** 39

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-auth`
- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `BillingCustomer`
- `CheckoutSession`
- `FxQuote`
- `GatewayConfiguration`
- `GatewayPlanMapping`
- `IdempotencyRecord`
- `InboxEvent`
- `Invoice`
- `InvoiceDelivery`
- `InvoiceLine`
- `OutboxEvent`
- `PaymentMethod`
- `PaymentTransaction`
- `ProrationQuote`
- `ReconciliationDivergence`
- `ReconciliationRun`
- `Refund`
- `SeedExecution`
- `Subscription`
- `WebhookEvent`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/admin/billing/dashboard` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts) |
| `GET` | `/admin/billing/dashboard/price-version-counts` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts) |
| `POST` | `/admin/billing/reconciliation` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/controllers/reconciliation-admin.controller.ts) |
| `POST` | `/admin/billing/refunds` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts) |
| `GET` | `/admin/billing/refunds/refundable-transactions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts) |
| `GET` | `/admin/billing/users/:userId/subscription` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/controllers/admin-user-billing.controller.ts) |
| `GET` | `/admin/payment-gateways` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts) |
| `PUT` | `/admin/payment-gateways/:gateway` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts) |
| `POST` | `/billing/checkout-sessions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `GET` | `/billing/checkout-sessions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `POST` | `/billing/checkout-sessions/:id/complete-paymob` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `POST` | `/billing/checkout-sessions/:id/complete-paypal` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `POST` | `/billing/checkout-sessions/:id/complete-paypal-sdk` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `POST` | `/billing/credit-topup/checkout-sessions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| `GET` | `/billing/credit-topup/checkout-sessions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| `GET` | `/billing/credit-topup/packages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| `GET` | `/billing/display-currency` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/controllers/public-display-currency.controller.ts) |
| `GET` | `/billing/gateways` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/checkout-gateways.controller.ts) |
| `GET` | `/billing/invoices` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `GET` | `/billing/invoices/:id/pdf` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `GET` | `/billing/me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `POST` | `/billing/payment-method-setup-sessions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `GET` | `/billing/payment-method-setup-sessions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `GET` | `/billing/payment-methods` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `DELETE` | `/billing/payment-methods/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `GET` | `/billing/plans` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| `DELETE` | `/billing/subscription` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `POST` | `/billing/subscription/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `POST` | `/billing/subscription/change/confirm` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `POST` | `/billing/subscription/change/quote` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `POST` | `/billing/subscription/resume` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/health.controller.ts) |
| `GET` | `/internal/payments/subscriptions/:id/status` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| `GET` | `/internal/payments/transactions/:id/status` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| `GET` | `/internal/payments/users/:userId/entitlement` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| `POST` | `/payments/webhooks/paymob` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| `POST` | `/payments/webhooks/paymob/card-token` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| `POST` | `/payments/webhooks/paymob/transaction` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| `POST` | `/payments/webhooks/paypal` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paypal-webhook.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `log.server` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `billing.credit.topup_reversed` | — |
| `billing.credit.topup_succeeded` | — |
| `billing.payment.chargeback` | — |
| `billing.payment.refunded` | — |
| `billing.subscription.activated` | — |
| `billing.subscription.cancelled` | — |
| `billing.subscription.downgrade_scheduled` | — |
| `billing.subscription.downgraded` | — |
| `billing.subscription.expired` | — |
| `billing.subscription.past_due` | — |
| `billing.subscription.suspended` | — |
| `billing.subscription.upgraded` | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/AGENTS.md) for generated, service-local agent context.
