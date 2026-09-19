# claw-payment-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-payment-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service) |
| Port | 4018 |
| Database | postgresql |
| Endpoints | 39 |
| Tests | 110 |
| Runner | vitest |
| Internal packages | @claw/shared-auth, @claw/shared-constants, @claw/shared-entitlements, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `admin-user-billing`
- `billing`
- `billing-dashboard`
- `checkout`
- `display-fx`
- `fx`
- `gateway-config`
- `gateways`
- `health`
- `idempotency`
- `internal-payments`
- `invoice-documents`
- `outbox`
- `plan-catalog`
- `reconciliation`
- `refunds`
- `scheduled-jobs`
- `subscriptions`
- `webhooks`

## Persistence models
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

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/admin/billing/dashboard` | [src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts) |
| GET | `/admin/billing/dashboard/price-version-counts` | [src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts) |
| POST | `/admin/billing/reconciliation` | [src/modules/reconciliation/controllers/reconciliation-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/controllers/reconciliation-admin.controller.ts) |
| POST | `/admin/billing/refunds` | [src/modules/refunds/controllers/refund.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts) |
| GET | `/admin/billing/refunds/refundable-transactions` | [src/modules/refunds/controllers/refund.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts) |
| GET | `/admin/billing/users/:userId/subscription` | [src/modules/admin-user-billing/controllers/admin-user-billing.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/controllers/admin-user-billing.controller.ts) |
| GET | `/admin/payment-gateways` | [src/modules/gateway-config/controllers/admin-gateway-config.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts) |
| PUT | `/admin/payment-gateways/:gateway` | [src/modules/gateway-config/controllers/admin-gateway-config.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts) |
| POST | `/billing/checkout-sessions` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| GET | `/billing/checkout-sessions/:id` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| POST | `/billing/checkout-sessions/:id/complete-paymob` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| POST | `/billing/checkout-sessions/:id/complete-paypal` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| POST | `/billing/checkout-sessions/:id/complete-paypal-sdk` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| POST | `/billing/credit-topup/checkout-sessions` | [src/modules/checkout/controllers/credit-topup.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| GET | `/billing/credit-topup/checkout-sessions/:id` | [src/modules/checkout/controllers/credit-topup.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| GET | `/billing/credit-topup/packages` | [src/modules/checkout/controllers/credit-topup.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts) |
| GET | `/billing/display-currency` | [src/modules/display-fx/controllers/public-display-currency.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/controllers/public-display-currency.controller.ts) |
| GET | `/billing/gateways` | [src/modules/gateway-config/controllers/checkout-gateways.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/checkout-gateways.controller.ts) |
| GET | `/billing/invoices` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| GET | `/billing/invoices/:id/pdf` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| GET | `/billing/me` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| POST | `/billing/payment-method-setup-sessions` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| GET | `/billing/payment-method-setup-sessions/:id` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| GET | `/billing/payment-methods` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| DELETE | `/billing/payment-methods/:id` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| GET | `/billing/plans` | [src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts) |
| DELETE | `/billing/subscription` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| POST | `/billing/subscription/cancel` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| POST | `/billing/subscription/change/confirm` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| POST | `/billing/subscription/change/quote` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| POST | `/billing/subscription/resume` | [src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts) |
| GET | `/health` | [src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/health.controller.ts) |
| GET | `/internal/payments/subscriptions/:id/status` | [src/modules/internal-payments/controllers/internal-payments.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| GET | `/internal/payments/transactions/:id/status` | [src/modules/internal-payments/controllers/internal-payments.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| GET | `/internal/payments/users/:userId/entitlement` | [src/modules/internal-payments/controllers/internal-payments.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts) |
| POST | `/payments/webhooks/paymob` | [src/modules/webhooks/controllers/paymob-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| POST | `/payments/webhooks/paymob/card-token` | [src/modules/webhooks/controllers/paymob-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| POST | `/payments/webhooks/paymob/transaction` | [src/modules/webhooks/controllers/paymob-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts) |
| POST | `/payments/webhooks/paypal` | [src/modules/webhooks/controllers/paypal-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paypal-webhook.controller.ts) |

## File inventory
<details>
<summary>386 tracked files</summary>

- [apps/claw-payment-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/AGENTS.md)
- [apps/claw-payment-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/CLAUDE.md)
- [apps/claw-payment-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/Dockerfile)
- [apps/claw-payment-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/Dockerfile.dev)
- [apps/claw-payment-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/docker-entrypoint.dev.sh)
- [apps/claw-payment-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/eslint.config.mjs)
- [apps/claw-payment-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/nest-cli.json)
- [apps/claw-payment-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/package.json)
- [apps/claw-payment-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma.config.ts)
- [apps/claw-payment-service/prisma/migrations/20260725000000_init_seed_execution/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260725000000_init_seed_execution/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260725010000_add_billing_schema/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260725010000_add_billing_schema/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260726190000_add_reconciliation_runs/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260726190000_add_reconciliation_runs/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260727013000_add_payment_method_setup_sessions/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260727013000_add_payment_method_setup_sessions/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260727040000_add_refunds/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260727040000_add_refunds/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260727050000_add_invoice_delivery/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260727050000_add_invoice_delivery/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260728110000_add_automatic_payment_compensation/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260728110000_add_automatic_payment_compensation/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260728150000_allow_setup_verification_amount/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260728150000_allow_setup_verification_amount/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260801203000_add_scheduled_plan_change_reason/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260801203000_add_scheduled_plan_change_reason/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260809140000_add_gateway_configurations/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260809140000_add_gateway_configurations/migration.sql)
- [apps/claw-payment-service/prisma/migrations/20260829120200_add_credit_topup_checkout/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/20260829120200_add_credit_topup_checkout/migration.sql)
- [apps/claw-payment-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/migrations/migration_lock.toml)
- [apps/claw-payment-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/prisma/schema.prisma)
- [apps/claw-payment-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/app.module.ts)
- [apps/claw-payment-service/src/app/config/__tests__/app.config.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/config/__tests__/app.config.spec.ts)
- [apps/claw-payment-service/src/app/config/__tests__/payment-log-redaction.constants.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/config/__tests__/payment-log-redaction.constants.spec.ts)
- [apps/claw-payment-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/config/app.config.ts)
- [apps/claw-payment-service/src/app/config/payment-log-redaction.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/config/payment-log-redaction.constants.ts)
- [apps/claw-payment-service/src/app/filters/__tests__/global-exception.filter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/filters/__tests__/global-exception.filter.spec.ts)
- [apps/claw-payment-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-payment-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-payment-service/src/app/guards/__tests__/service-token.guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/guards/__tests__/service-token.guard.spec.ts)
- [apps/claw-payment-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/guards/service-token.guard.ts)
- [apps/claw-payment-service/src/app/interceptors/__tests__/logging.interceptor.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/interceptors/__tests__/logging.interceptor.spec.ts)
- [apps/claw-payment-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-payment-service/src/app/pipes/__tests__/zod-validation.pipe.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/pipes/__tests__/zod-validation.pipe.spec.ts)
- [apps/claw-payment-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-payment-service/src/common/constants/invoice-pdf.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/constants/invoice-pdf.constants.ts)
- [apps/claw-payment-service/src/common/constants/subscription-transitions.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/constants/subscription-transitions.constants.ts)
- [apps/claw-payment-service/src/common/constants/token-vault.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/constants/token-vault.constants.ts)
- [apps/claw-payment-service/src/common/enums/payment-method-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/enums/payment-method-type.enum.ts)
- [apps/claw-payment-service/src/common/enums/reconciliation.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/enums/reconciliation.enum.ts)
- [apps/claw-payment-service/src/common/errors/__tests__/errors.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/errors/__tests__/errors.spec.ts)
- [apps/claw-payment-service/src/common/errors/billing.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/errors/billing.exception.ts)
- [apps/claw-payment-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/errors/business.exception.ts)
- [apps/claw-payment-service/src/common/errors/entity-not-found.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/errors/entity-not-found.exception.ts)
- [apps/claw-payment-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/errors/index.ts)
- [apps/claw-payment-service/src/common/types/invoice-pdf.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/types/invoice-pdf.types.ts)
- [apps/claw-payment-service/src/common/types/token-vault.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/types/token-vault.types.ts)
- [apps/claw-payment-service/src/common/utilities/__tests__/env-blank.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/__tests__/env-blank.utility.spec.ts)
- [apps/claw-payment-service/src/common/utilities/__tests__/invoice-pdf.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/__tests__/invoice-pdf.utility.spec.ts)
- [apps/claw-payment-service/src/common/utilities/__tests__/subscription-state-machine.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/__tests__/subscription-state-machine.utility.spec.ts)
- [apps/claw-payment-service/src/common/utilities/__tests__/token-vault.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/__tests__/token-vault.utility.spec.ts)
- [apps/claw-payment-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-payment-service/src/common/utilities/env-blank.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/env-blank.utility.ts)
- [apps/claw-payment-service/src/common/utilities/invoice-pdf.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/invoice-pdf.utility.ts)
- [apps/claw-payment-service/src/common/utilities/log-route.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/log-route.utility.ts)
- [apps/claw-payment-service/src/common/utilities/subscription-state-machine.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/subscription-state-machine.utility.ts)
- [apps/claw-payment-service/src/common/utilities/token-vault.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/common/utilities/token-vault.utility.ts)
- [apps/claw-payment-service/src/infrastructure/database/prisma/__tests__/prisma.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/database/prisma/__tests__/prisma.service.spec.ts)
- [apps/claw-payment-service/src/infrastructure/database/prisma/__tests__/types/prisma-mock-registry.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/database/prisma/__tests__/types/prisma-mock-registry.types.ts)
- [apps/claw-payment-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-payment-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-payment-service/src/infrastructure/redis/__tests__/redis.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/redis/__tests__/redis.service.spec.ts)
- [apps/claw-payment-service/src/infrastructure/redis/constants/redis-lock.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/redis/constants/redis-lock.constants.ts)
- [apps/claw-payment-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-payment-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-payment-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-payment-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/main.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/__tests__/admin-user-billing.fixtures.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/__tests__/admin-user-billing.fixtures.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/admin-user-billing.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/admin-user-billing.module.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/constants/admin-user-billing.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/constants/admin-user-billing.constants.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/controllers/__tests__/admin-user-billing.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/controllers/__tests__/admin-user-billing.controller.spec.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/controllers/admin-user-billing.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/controllers/admin-user-billing.controller.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/dto/admin-user-billing.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/dto/admin-user-billing.dto.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/schemas/admin-user-billing-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/schemas/admin-user-billing-response.schema.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/services/__tests__/admin-user-billing.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/services/__tests__/admin-user-billing.service.spec.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/services/admin-user-billing.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/services/admin-user-billing.service.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/types/admin-user-billing.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/types/admin-user-billing.types.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/utilities/__tests__/admin-user-billing-view.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/utilities/__tests__/admin-user-billing-view.utility.spec.ts)
- [apps/claw-payment-service/src/modules/admin-user-billing/utilities/admin-user-billing-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/admin-user-billing/utilities/admin-user-billing-view.utility.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/billing-dashboard.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/billing-dashboard.module.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/clients/provider-cost.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/clients/provider-cost.client.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/constants/billing-dashboard.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/constants/billing-dashboard.constants.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/controllers/__tests__/billing-dashboard.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/__tests__/billing-dashboard.controller.spec.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/controllers/billing-dashboard.controller.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/dto/billing-dashboard.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/dto/billing-dashboard.dto.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/repositories/billing-dashboard.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/repositories/billing-dashboard.repository.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/services/__tests__/billing-dashboard.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/services/__tests__/billing-dashboard.service.spec.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/services/billing-dashboard.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/services/billing-dashboard.service.ts)
- [apps/claw-payment-service/src/modules/billing-dashboard/types/billing-dashboard.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing-dashboard/types/billing-dashboard.types.ts)
- [apps/claw-payment-service/src/modules/billing/__tests__/proration.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/__tests__/proration.service.spec.ts)
- [apps/claw-payment-service/src/modules/billing/billing.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/billing.module.ts)
- [apps/claw-payment-service/src/modules/billing/constants/billing.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/constants/billing.constants.ts)
- [apps/claw-payment-service/src/modules/billing/repositories/__tests__/invoice-write.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/repositories/__tests__/invoice-write.repository.spec.ts)
- [apps/claw-payment-service/src/modules/billing/repositories/checkout-session.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/repositories/checkout-session.repository.ts)
- [apps/claw-payment-service/src/modules/billing/repositories/invoice-write.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/repositories/invoice-write.repository.ts)
- [apps/claw-payment-service/src/modules/billing/repositories/payment-transaction.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/repositories/payment-transaction.repository.ts)
- [apps/claw-payment-service/src/modules/billing/repositories/proration-quote.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/repositories/proration-quote.repository.ts)
- [apps/claw-payment-service/src/modules/billing/schemas/credit-topup-snapshot.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/schemas/credit-topup-snapshot.schema.ts)
- [apps/claw-payment-service/src/modules/billing/services/__tests__/credit-topup-lifecycle.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/__tests__/credit-topup-lifecycle.service.spec.ts)
- [apps/claw-payment-service/src/modules/billing/services/__tests__/subscription-lifecycle.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/__tests__/subscription-lifecycle.service.spec.ts)
- [apps/claw-payment-service/src/modules/billing/services/billing-record.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/billing-record.service.ts)
- [apps/claw-payment-service/src/modules/billing/services/credit-topup-lifecycle.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/credit-topup-lifecycle.service.ts)
- [apps/claw-payment-service/src/modules/billing/services/proration.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/proration.service.ts)
- [apps/claw-payment-service/src/modules/billing/services/subscription-lifecycle.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/services/subscription-lifecycle.service.ts)
- [apps/claw-payment-service/src/modules/billing/types/billing-reconciliation.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/billing-reconciliation.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/billing-record-service.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/billing-record-service.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/billing-record.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/billing-record.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/checkout-session-purpose.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/checkout-session-purpose.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/credit-topup-lifecycle.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/credit-topup-lifecycle.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/invoice-total.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/invoice-total.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/proration.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/proration.types.ts)
- [apps/claw-payment-service/src/modules/billing/types/subscription-lifecycle.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/types/subscription-lifecycle.types.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/__tests__/checkout-session-purpose.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/__tests__/checkout-session-purpose.utility.spec.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/__tests__/credit-topup-snapshot.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/__tests__/credit-topup-snapshot.utility.spec.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/__tests__/invoice-total.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/__tests__/invoice-total.utility.spec.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/charge-line-kind.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/charge-line-kind.utility.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/checkout-session-purpose.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/checkout-session-purpose.utility.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/credit-topup-snapshot.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/credit-topup-snapshot.utility.ts)
- [apps/claw-payment-service/src/modules/billing/utilities/invoice-total.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/billing/utilities/invoice-total.utility.ts)
- [apps/claw-payment-service/src/modules/checkout/checkout.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/checkout.module.ts)
- [apps/claw-payment-service/src/modules/checkout/constants/checkout.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/constants/checkout.constants.ts)
- [apps/claw-payment-service/src/modules/checkout/controllers/__tests__/checkout.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/__tests__/checkout.controller.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/checkout.controller.ts)
- [apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/controllers/credit-topup.controller.ts)
- [apps/claw-payment-service/src/modules/checkout/dto/__tests__/checkout.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/dto/__tests__/checkout.dto.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/dto/__tests__/credit-topup.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/dto/__tests__/credit-topup.dto.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/dto/checkout.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/dto/checkout.dto.ts)
- [apps/claw-payment-service/src/modules/checkout/dto/credit-topup.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/dto/credit-topup.dto.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/charge-resolver.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/charge-resolver.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/checkout.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/checkout.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/credit-charge-resolver.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/credit-charge-resolver.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/credit-topup-migration.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/credit-topup-migration.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/payment-method-setup-migration.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/payment-method-setup-migration.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/payment-method-setup.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/payment-method-setup.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/paymob-checkout-completion.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/paymob-checkout-completion.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/__tests__/paypal-checkout-completion.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/__tests__/paypal-checkout-completion.service.spec.ts)
- [apps/claw-payment-service/src/modules/checkout/services/charge-resolver.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/charge-resolver.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/checkout.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/checkout.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/credit-charge-resolver.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/credit-charge-resolver.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/credit-topup-checkout.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/credit-topup-checkout.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/payment-method-setup.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/payment-method-setup.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/paymob-checkout-completion.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/paymob-checkout-completion.service.ts)
- [apps/claw-payment-service/src/modules/checkout/services/paypal-checkout-completion.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/services/paypal-checkout-completion.service.ts)
- [apps/claw-payment-service/src/modules/checkout/types/checkout.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/types/checkout.types.ts)
- [apps/claw-payment-service/src/modules/checkout/types/credit-topup.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/types/credit-topup.types.ts)
- [apps/claw-payment-service/src/modules/checkout/utilities/checkout-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/utilities/checkout-view.utility.ts)
- [apps/claw-payment-service/src/modules/checkout/utilities/settlement-currency.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/checkout/utilities/settlement-currency.utility.ts)
- [apps/claw-payment-service/src/modules/display-fx/__tests__/client-ip.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/__tests__/client-ip.utility.spec.ts)
- [apps/claw-payment-service/src/modules/display-fx/__tests__/display-currency.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/__tests__/display-currency.service.spec.ts)
- [apps/claw-payment-service/src/modules/display-fx/__tests__/display-fx-providers.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/__tests__/display-fx-providers.spec.ts)
- [apps/claw-payment-service/src/modules/display-fx/__tests__/display-fx.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/__tests__/display-fx.service.spec.ts)
- [apps/claw-payment-service/src/modules/display-fx/__tests__/geo-country.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/__tests__/geo-country.service.spec.ts)
- [apps/claw-payment-service/src/modules/display-fx/constants/display-fx.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/constants/display-fx.constants.ts)
- [apps/claw-payment-service/src/modules/display-fx/controllers/public-display-currency.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/controllers/public-display-currency.controller.ts)
- [apps/claw-payment-service/src/modules/display-fx/display-fx.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/display-fx.module.ts)
- [apps/claw-payment-service/src/modules/display-fx/dto/display-currency-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/dto/display-currency-query.dto.ts)
- [apps/claw-payment-service/src/modules/display-fx/providers/fawaz-exchange.provider.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/providers/fawaz-exchange.provider.ts)
- [apps/claw-payment-service/src/modules/display-fx/providers/frankfurter.provider.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/providers/frankfurter.provider.ts)
- [apps/claw-payment-service/src/modules/display-fx/schemas/display-fx.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/schemas/display-fx.schema.ts)
- [apps/claw-payment-service/src/modules/display-fx/service.utilities/client-ip.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/service.utilities/client-ip.utility.ts)
- [apps/claw-payment-service/src/modules/display-fx/service.utilities/country-code.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/service.utilities/country-code.utility.ts)
- [apps/claw-payment-service/src/modules/display-fx/services/display-currency.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/services/display-currency.service.ts)
- [apps/claw-payment-service/src/modules/display-fx/services/display-fx.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/services/display-fx.service.ts)
- [apps/claw-payment-service/src/modules/display-fx/services/geo-country.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/services/geo-country.service.ts)
- [apps/claw-payment-service/src/modules/display-fx/types/display-currency-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/types/display-currency-request.type.ts)
- [apps/claw-payment-service/src/modules/display-fx/types/display-fx.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/display-fx/types/display-fx.types.ts)
- [apps/claw-payment-service/src/modules/fx/__tests__/fx.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/fx/__tests__/fx.service.spec.ts)
- [apps/claw-payment-service/src/modules/fx/fx.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/fx/fx.module.ts)
- [apps/claw-payment-service/src/modules/fx/repositories/fx-quote.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/fx/repositories/fx-quote.repository.ts)
- [apps/claw-payment-service/src/modules/fx/services/fx.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/fx/services/fx.service.ts)
- [apps/claw-payment-service/src/modules/fx/types/fx.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/fx/types/fx.types.ts)
- [apps/claw-payment-service/src/modules/gateway-config/constants/gateway-config.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/constants/gateway-config.constants.ts)
- [apps/claw-payment-service/src/modules/gateway-config/controllers/__tests__/gateway-config.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/__tests__/gateway-config.controller.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/admin-gateway-config.controller.ts)
- [apps/claw-payment-service/src/modules/gateway-config/controllers/checkout-gateways.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/controllers/checkout-gateways.controller.ts)
- [apps/claw-payment-service/src/modules/gateway-config/dto/__tests__/gateway-config.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/dto/__tests__/gateway-config.dto.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/dto/gateway-config.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/dto/gateway-config.dto.ts)
- [apps/claw-payment-service/src/modules/gateway-config/enums/gateway-config-error-code.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/enums/gateway-config-error-code.enum.ts)
- [apps/claw-payment-service/src/modules/gateway-config/enums/gateway-credential-field.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/enums/gateway-credential-field.enum.ts)
- [apps/claw-payment-service/src/modules/gateway-config/enums/gateway-mode.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/enums/gateway-mode.enum.ts)
- [apps/claw-payment-service/src/modules/gateway-config/gateway-config.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/gateway-config.module.ts)
- [apps/claw-payment-service/src/modules/gateway-config/repositories/__tests__/gateway-config.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/repositories/__tests__/gateway-config.repository.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/repositories/gateway-config.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/repositories/gateway-config.repository.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-config-bootstrap.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-config-bootstrap.service.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-config.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-config.service.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-runtime-config.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/__tests__/gateway-runtime-config.service.spec.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/gateway-config-bootstrap.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/gateway-config-bootstrap.service.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/gateway-config.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/gateway-config.service.ts)
- [apps/claw-payment-service/src/modules/gateway-config/services/gateway-runtime-config.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/services/gateway-runtime-config.service.ts)
- [apps/claw-payment-service/src/modules/gateway-config/types/gateway-config.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/types/gateway-config.types.ts)
- [apps/claw-payment-service/src/modules/gateway-config/utilities/gateway-config-json.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateway-config/utilities/gateway-config-json.utility.ts)
- [apps/claw-payment-service/src/modules/gateways/gateways.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/gateways.module.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob-hmac.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob-hmac.utility.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob-token.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob-token.manager.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/__tests__/paymob.adapter.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/constants/paymob.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/constants/paymob.constants.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/managers/paymob-token.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/managers/paymob-token.manager.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/paymob.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/paymob.adapter.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/schemas/paymob-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/schemas/paymob-response.schema.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/types/paymob.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/types/paymob.types.ts)
- [apps/claw-payment-service/src/modules/gateways/paymob/utilities/paymob-hmac.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paymob/utilities/paymob-hmac.utility.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal-amount.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal-amount.utility.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal-token.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal-token.manager.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/__tests__/paypal.adapter.spec.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/constants/paypal.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/constants/paypal.constants.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/managers/paypal-token.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/managers/paypal-token.manager.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/paypal.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/paypal.adapter.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/schemas/paypal-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/schemas/paypal-response.schema.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/types/paypal.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/types/paypal.types.ts)
- [apps/claw-payment-service/src/modules/gateways/paypal/utilities/paypal-amount.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/gateways/paypal/utilities/paypal-amount.utility.ts)
- [apps/claw-payment-service/src/modules/health/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/__tests__/health.controller.spec.ts)
- [apps/claw-payment-service/src/modules/health/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/__tests__/health.service.spec.ts)
- [apps/claw-payment-service/src/modules/health/constants/health.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/constants/health.constants.ts)
- [apps/claw-payment-service/src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/health.controller.ts)
- [apps/claw-payment-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/health.module.ts)
- [apps/claw-payment-service/src/modules/health/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/health.service.ts)
- [apps/claw-payment-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/types/health.types.ts)
- [apps/claw-payment-service/src/modules/health/utilities/__tests__/gateway-readiness.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/utilities/__tests__/gateway-readiness.utility.spec.ts)
- [apps/claw-payment-service/src/modules/health/utilities/gateway-readiness.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/health/utilities/gateway-readiness.utility.ts)
- [apps/claw-payment-service/src/modules/idempotency/constants/idempotency.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/idempotency/constants/idempotency.constants.ts)
- [apps/claw-payment-service/src/modules/idempotency/repositories/__tests__/idempotency.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/idempotency/repositories/__tests__/idempotency.repository.spec.ts)
- [apps/claw-payment-service/src/modules/idempotency/repositories/idempotency.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/idempotency/repositories/idempotency.repository.ts)
- [apps/claw-payment-service/src/modules/idempotency/types/idempotency-repository.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/idempotency/types/idempotency-repository.types.ts)
- [apps/claw-payment-service/src/modules/internal-payments/constants/internal-payments.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/constants/internal-payments.constants.ts)
- [apps/claw-payment-service/src/modules/internal-payments/controllers/__tests__/internal-payments.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/__tests__/internal-payments.controller.spec.ts)
- [apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/controllers/internal-payments.controller.ts)
- [apps/claw-payment-service/src/modules/internal-payments/dto/internal-payments.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/dto/internal-payments.dto.ts)
- [apps/claw-payment-service/src/modules/internal-payments/internal-payments.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/internal-payments.module.ts)
- [apps/claw-payment-service/src/modules/internal-payments/repositories/__tests__/internal-payments.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/repositories/__tests__/internal-payments.repository.spec.ts)
- [apps/claw-payment-service/src/modules/internal-payments/repositories/internal-payments.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/repositories/internal-payments.repository.ts)
- [apps/claw-payment-service/src/modules/internal-payments/schemas/internal-payments-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/schemas/internal-payments-response.schema.ts)
- [apps/claw-payment-service/src/modules/internal-payments/services/__tests__/internal-payments.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/services/__tests__/internal-payments.service.spec.ts)
- [apps/claw-payment-service/src/modules/internal-payments/services/internal-payments.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/internal-payments/services/internal-payments.service.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/constants/invoice-delivery.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/constants/invoice-delivery.constants.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/invoice-documents.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/invoice-documents.module.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/repositories/__tests__/invoice-immutability-migration.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/repositories/__tests__/invoice-immutability-migration.spec.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/repositories/invoice-document.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/repositories/invoice-document.repository.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/services/__tests__/invoice-delivery.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/services/__tests__/invoice-delivery.service.spec.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/services/__tests__/invoice-document.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/services/__tests__/invoice-document.service.spec.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/services/invoice-delivery.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/services/invoice-delivery.service.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/services/invoice-document.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/services/invoice-document.service.ts)
- [apps/claw-payment-service/src/modules/invoice-documents/types/invoice-document.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/invoice-documents/types/invoice-document.types.ts)
- [apps/claw-payment-service/src/modules/outbox/constants/outbox.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/constants/outbox.constants.ts)
- [apps/claw-payment-service/src/modules/outbox/outbox.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/outbox.module.ts)
- [apps/claw-payment-service/src/modules/outbox/repositories/__tests__/outbox.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/repositories/__tests__/outbox.repository.spec.ts)
- [apps/claw-payment-service/src/modules/outbox/repositories/outbox.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/repositories/outbox.repository.ts)
- [apps/claw-payment-service/src/modules/outbox/services/__tests__/outbox-publisher.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/services/__tests__/outbox-publisher.service.spec.ts)
- [apps/claw-payment-service/src/modules/outbox/services/outbox-publisher.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/services/outbox-publisher.service.ts)
- [apps/claw-payment-service/src/modules/outbox/types/outbox-publisher.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/types/outbox-publisher.types.ts)
- [apps/claw-payment-service/src/modules/outbox/types/outbox-repository.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/types/outbox-repository.types.ts)
- [apps/claw-payment-service/src/modules/outbox/utilities/__tests__/outbox-envelope.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/utilities/__tests__/outbox-envelope.utility.spec.ts)
- [apps/claw-payment-service/src/modules/outbox/utilities/outbox-envelope.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/outbox/utilities/outbox-envelope.utility.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/constants/plan-catalog.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/constants/plan-catalog.constants.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/plan-catalog.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/plan-catalog.client.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/plan-catalog.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/plan-catalog.module.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/schemas/__tests__/plan-catalog.schema.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/schemas/__tests__/plan-catalog.schema.spec.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/schemas/plan-catalog.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/schemas/plan-catalog.schema.ts)
- [apps/claw-payment-service/src/modules/plan-catalog/types/plan-catalog.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/plan-catalog/types/plan-catalog.types.ts)
- [apps/claw-payment-service/src/modules/reconciliation/clients/__tests__/plan-retirement.client.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/clients/__tests__/plan-retirement.client.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/clients/plan-retirement.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/clients/plan-retirement.client.ts)
- [apps/claw-payment-service/src/modules/reconciliation/constants/reconciliation.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/constants/reconciliation.constants.ts)
- [apps/claw-payment-service/src/modules/reconciliation/controllers/__tests__/reconciliation-admin.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/controllers/__tests__/reconciliation-admin.controller.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/controllers/reconciliation-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/controllers/reconciliation-admin.controller.ts)
- [apps/claw-payment-service/src/modules/reconciliation/enums/plan-retirement-migration-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/enums/plan-retirement-migration-status.enum.ts)
- [apps/claw-payment-service/src/modules/reconciliation/managers/__tests__/reconciliation.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/managers/__tests__/reconciliation.manager.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/managers/reconciliation.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/managers/reconciliation.manager.ts)
- [apps/claw-payment-service/src/modules/reconciliation/reconciliation.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/reconciliation.module.ts)
- [apps/claw-payment-service/src/modules/reconciliation/repositories/__tests__/reconciliation.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/repositories/__tests__/reconciliation.repository.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/repositories/reconciliation.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/repositories/reconciliation.repository.ts)
- [apps/claw-payment-service/src/modules/reconciliation/schemas/__tests__/plan-retirement.schema.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/schemas/__tests__/plan-retirement.schema.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/schemas/plan-retirement.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/schemas/plan-retirement.schema.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/gateway-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/gateway-reconciliation.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/gateway-subscription-vault.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/gateway-subscription-vault.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/lifecycle-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/lifecycle-reconciliation.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/plan-retirement-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/plan-retirement-reconciliation.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/provider-subscription-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/provider-subscription-reconciliation.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/reconciliation.fixture.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/reconciliation.fixture.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/__tests__/transaction-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/__tests__/transaction-reconciliation.service.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/gateway-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/gateway-reconciliation.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/gateway-subscription-vault.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/gateway-subscription-vault.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/lifecycle-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/lifecycle-reconciliation.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/plan-retirement-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/plan-retirement-reconciliation.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/provider-subscription-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/provider-subscription-reconciliation.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/services/transaction-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/services/transaction-reconciliation.service.ts)
- [apps/claw-payment-service/src/modules/reconciliation/types/plan-retirement.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/types/plan-retirement.types.ts)
- [apps/claw-payment-service/src/modules/reconciliation/types/reconciliation.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/types/reconciliation.types.ts)
- [apps/claw-payment-service/src/modules/reconciliation/utilities/__tests__/gateway-classification.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/utilities/__tests__/gateway-classification.utility.spec.ts)
- [apps/claw-payment-service/src/modules/reconciliation/utilities/gateway-classification.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/reconciliation/utilities/gateway-classification.utility.ts)
- [apps/claw-payment-service/src/modules/refunds/constants/payment-compensation.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/constants/payment-compensation.constants.ts)
- [apps/claw-payment-service/src/modules/refunds/constants/refundable-charge.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/constants/refundable-charge.constants.ts)
- [apps/claw-payment-service/src/modules/refunds/controllers/__tests__/refund.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/__tests__/refund.controller.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/controllers/refund.controller.ts)
- [apps/claw-payment-service/src/modules/refunds/dto/__tests__/refund.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/dto/__tests__/refund.dto.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/dto/refund.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/dto/refund.dto.ts)
- [apps/claw-payment-service/src/modules/refunds/managers/__tests__/automatic-compensation.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/managers/__tests__/automatic-compensation.manager.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/managers/__tests__/refund.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/managers/__tests__/refund.manager.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/managers/automatic-compensation.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/managers/automatic-compensation.manager.ts)
- [apps/claw-payment-service/src/modules/refunds/managers/refund.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/managers/refund.manager.ts)
- [apps/claw-payment-service/src/modules/refunds/refunds.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/refunds.module.ts)
- [apps/claw-payment-service/src/modules/refunds/repositories/__tests__/refund-migration.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/repositories/__tests__/refund-migration.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/repositories/__tests__/refund.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/repositories/__tests__/refund.repository.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/repositories/refund.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/repositories/refund.repository.ts)
- [apps/claw-payment-service/src/modules/refunds/services/__tests__/payment-compensation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/__tests__/payment-compensation.service.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-completion.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-completion.service.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-query.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-query.service.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-webhook.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/__tests__/refund-webhook.service.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/services/payment-compensation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/payment-compensation.service.ts)
- [apps/claw-payment-service/src/modules/refunds/services/refund-completion.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/refund-completion.service.ts)
- [apps/claw-payment-service/src/modules/refunds/services/refund-query.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/refund-query.service.ts)
- [apps/claw-payment-service/src/modules/refunds/services/refund-webhook.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/services/refund-webhook.service.ts)
- [apps/claw-payment-service/src/modules/refunds/types/refund.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/types/refund.types.ts)
- [apps/claw-payment-service/src/modules/refunds/utilities/__tests__/refund-balance.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/utilities/__tests__/refund-balance.utility.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/utilities/__tests__/refund-view.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/utilities/__tests__/refund-view.utility.spec.ts)
- [apps/claw-payment-service/src/modules/refunds/utilities/refund-balance.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/utilities/refund-balance.utility.ts)
- [apps/claw-payment-service/src/modules/refunds/utilities/refund-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/utilities/refund-view.utility.ts)
- [apps/claw-payment-service/src/modules/refunds/utilities/refundable-charge-type.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/refunds/utilities/refundable-charge-type.utility.ts)
- [apps/claw-payment-service/src/modules/scheduled-jobs/scheduled-jobs.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/scheduled-jobs/scheduled-jobs.module.ts)
- [apps/claw-payment-service/src/modules/scheduled-jobs/services/__tests__/scheduled-job-runner.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/scheduled-jobs/services/__tests__/scheduled-job-runner.service.spec.ts)
- [apps/claw-payment-service/src/modules/scheduled-jobs/services/scheduled-job-runner.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/scheduled-jobs/services/scheduled-job-runner.service.ts)
- [apps/claw-payment-service/src/modules/scheduled-jobs/types/scheduled-job.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/scheduled-jobs/types/scheduled-job.types.ts)
- [apps/claw-payment-service/src/modules/subscriptions/constants/subscriptions.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/constants/subscriptions.constants.ts)
- [apps/claw-payment-service/src/modules/subscriptions/controllers/__tests__/subscriptions.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/__tests__/subscriptions.controller.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/controllers/subscriptions.controller.ts)
- [apps/claw-payment-service/src/modules/subscriptions/dto/subscriptions.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/dto/subscriptions.dto.ts)
- [apps/claw-payment-service/src/modules/subscriptions/enums/scheduled-plan-change-reason.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/enums/scheduled-plan-change-reason.enum.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/invoice.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/invoice.repository.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/scheduled-plan-change-reason-migration.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/scheduled-plan-change-reason-migration.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/subscription.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/__tests__/subscription.repository.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/invoice.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/invoice.repository.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/payment-method.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/payment-method.repository.ts)
- [apps/claw-payment-service/src/modules/subscriptions/repositories/subscription.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/repositories/subscription.repository.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/__tests__/plan-change.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/__tests__/plan-change.service.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/__tests__/scheduled-downgrade.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/__tests__/scheduled-downgrade.service.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/__tests__/subscription-cancel.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/__tests__/subscription-cancel.service.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/payment-method-vault.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/payment-method-vault.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/payment-method.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/payment-method.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/plan-change.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/plan-change.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/scheduled-downgrade.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/scheduled-downgrade.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/subscription-cancel.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/subscription-cancel.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/services/subscription-query.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/services/subscription-query.service.ts)
- [apps/claw-payment-service/src/modules/subscriptions/subscriptions.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/subscriptions.module.ts)
- [apps/claw-payment-service/src/modules/subscriptions/types/payment-method-vault.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/types/payment-method-vault.types.ts)
- [apps/claw-payment-service/src/modules/subscriptions/types/plan-change.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/types/plan-change.types.ts)
- [apps/claw-payment-service/src/modules/subscriptions/types/subscription-repository.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/types/subscription-repository.types.ts)
- [apps/claw-payment-service/src/modules/subscriptions/types/subscription-view.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/types/subscription-view.types.ts)
- [apps/claw-payment-service/src/modules/subscriptions/utilities/__tests__/subscription-view.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/utilities/__tests__/subscription-view.utility.spec.ts)
- [apps/claw-payment-service/src/modules/subscriptions/utilities/subscription-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/subscriptions/utilities/subscription-view.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/constants/billing-period.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/constants/billing-period.constants.ts)
- [apps/claw-payment-service/src/modules/webhooks/constants/webhook.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/constants/webhook.constants.ts)
- [apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paymob-webhook.controller.ts)
- [apps/claw-payment-service/src/modules/webhooks/controllers/paypal-webhook.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/controllers/paypal-webhook.controller.ts)
- [apps/claw-payment-service/src/modules/webhooks/repositories/__tests__/webhook-event.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/repositories/__tests__/webhook-event.repository.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/repositories/billing-customer.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/repositories/billing-customer.repository.ts)
- [apps/claw-payment-service/src/modules/webhooks/repositories/webhook-event.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/repositories/webhook-event.repository.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/payment-activation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/payment-activation.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/payment-reversal.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/payment-reversal.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-callback-router.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-callback-router.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-card-token.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-card-token.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-webhook.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/paymob-webhook.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/paypal-webhook-dispatch.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/paypal-webhook-dispatch.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/__tests__/paypal-webhook.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/__tests__/paypal-webhook.service.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/payment-activation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/payment-activation.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/payment-reversal.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/payment-reversal.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/paymob-callback-router.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/paymob-callback-router.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/paymob-card-token.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/paymob-card-token.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/paymob-webhook.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/paymob-webhook.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/services/paypal-webhook.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/services/paypal-webhook.service.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/paymob-card.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/paymob-card.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/reversal.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/reversal.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/verified-payment.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/verified-payment.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/webhook-ack.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/webhook-ack.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/webhook-repository.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/webhook-repository.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/types/webhook.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/types/webhook.types.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/__tests__/billing-period.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/__tests__/billing-period.utility.spec.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/billing-period.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/billing-period.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/gateway-subscription-hash.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/gateway-subscription-hash.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/paymob-card.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/paymob-card.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/paymob-payload.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/paymob-payload.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/paypal-reversal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/paypal-reversal.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/utilities/webhook-payload.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/utilities/webhook-payload.utility.ts)
- [apps/claw-payment-service/src/modules/webhooks/webhooks.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/modules/webhooks/webhooks.module.ts)
- [apps/claw-payment-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/src/vitest-globals.d.ts)
- [apps/claw-payment-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/tsconfig.build.json)
- [apps/claw-payment-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/tsconfig.json)
- [apps/claw-payment-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-payment-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
