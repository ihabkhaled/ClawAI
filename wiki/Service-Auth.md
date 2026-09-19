# Auth Service

**Workspace:** [`apps/claw-auth-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-auth-service)  
**Port:** 4001  
**Database:** postgresql  
**Test runner:** vitest · **96 test files**  
**API endpoints:** 99

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `CreditLedgerEntry`
- `CreditPackage`
- `CreditPackageVersion`
- `DeploymentCredential`
- `DeviceAuthorizationGrant`
- `EmailChangeRequest`
- `EmailVerificationToken`
- `EntitlementInboxEvent`
- `FeatureUsageRecord`
- `PasswordResetToken`
- `Plan`
- `PlanFeatureRule`
- `PlanModelAccess`
- `PlanPriceVersion`
- `PlanRetirementMigration`
- `PlanTrialRedemption`
- `Role`
- `RolePermission`
- `SeedExecution`
- `Session`
- `SystemSetting`
- `TokenUsageLedger`
- `User`
- `UserCreditWallet`
- `UserPlanAssignment`
- `WeightedUsageRecord`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/admin/credit/packages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| `POST` | `/admin/credit/packages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| `POST` | `/admin/credit/packages/:id/versions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| `GET` | `/admin/credit/wallets/:userId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| `POST` | `/admin/credit/wallets/:userId/adjust` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| `GET` | `/admin/deployment` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `POST` | `/admin/deployment/automation` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `DELETE` | `/admin/deployment/credentials` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `PUT` | `/admin/deployment/credentials` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `POST` | `/admin/deployment/reset` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `GET` | `/admin/deployment/run` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `POST` | `/admin/deployment/trigger` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| `GET` | `/admin/plans` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `DELETE` | `/admin/plans/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `DELETE` | `/admin/plans/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `GET` | `/admin/plans/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `PATCH` | `/admin/plans/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/:id/activate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/:id/deactivate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `PUT` | `/admin/plans/:id/model-access` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `GET` | `/admin/plans/:id/price-versions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/:id/price-versions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/:id/set-default` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/:id/set-popular` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `GET` | `/admin/plans/:id/users` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `DELETE` | `/admin/plans/popular` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/reorder` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `POST` | `/admin/plans/users/:userId/assign` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| `GET` | `/admin/roles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `POST` | `/admin/roles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `DELETE` | `/admin/roles/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `GET` | `/admin/roles/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `PATCH` | `/admin/roles/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `PUT` | `/admin/roles/:id/permissions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `GET` | `/admin/roles/permissions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| `GET` | `/admin/settings` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| `GET` | `/admin/settings/:key` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| `PUT` | `/admin/settings/:key` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| `GET` | `/admin/users/:userId/plan-overview` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts) |
| `GET` | `/admin/users/:userId/usage-statistics` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts) |
| `POST` | `/auth/email-change/confirm` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/email-verification/confirm` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/email-verification/resend` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/login` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/logout` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `GET` | `/auth/me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `GET` | `/auth/me/entitlements` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts) |
| `GET` | `/auth/me/usage` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts) |
| `POST` | `/auth/password-reset/confirm` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/password-reset/request` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/register` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| `POST` | `/auth/vscode/authorize/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| `POST` | `/auth/vscode/authorize/details` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| `POST` | `/auth/vscode/authorize/exchange` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| `POST` | `/auth/vscode/authorize/init` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| `GET` | `/credit/me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| `GET` | `/credit/me/ledger` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| `GET` | `/credit/packages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/billing-metrics/provider-costs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/provider-cost-metrics-internal.controller.ts) |
| `POST` | `/internal/credit/finalize` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `GET` | `/internal/credit/packages` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `GET` | `/internal/credit/packages/:id/active-version` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `POST` | `/internal/credit/release` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `POST` | `/internal/credit/reserve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `GET` | `/internal/credit/wallet/:userId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| `POST` | `/internal/deployment/notify` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-internal.controller.ts) |
| `GET` | `/internal/plans/catalog` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| `GET` | `/internal/plans/price` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| `GET` | `/internal/plans/price-versions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| `POST` | `/internal/plans/retirement-migrations/:id/outcome` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| `GET` | `/internal/plans/retirement-migrations/pending` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| `POST` | `/internal/quota/features/consume` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| `POST` | `/internal/quota/finalize` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| `POST` | `/internal/quota/release` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| `POST` | `/internal/quota/reserve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| `POST` | `/internal/runtime/admissions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts) |
| `POST` | `/internal/runtime/admissions/release` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts) |
| `GET` | `/internal/users/:id/entitlements` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/entitlements-internal.controller.ts) |
| `GET` | `/users` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `POST` | `/users` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `DELETE` | `/users/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `GET` | `/users/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/:id/activate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/:id/reactivate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/:id/role` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `POST` | `/users/:id/temporary-password` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `DELETE` | `/users/me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/me` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `DELETE` | `/users/me/email-change` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `GET` | `/users/me/email-change` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `POST` | `/users/me/email-change` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `POST` | `/users/me/email-change/resend` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `POST` | `/users/me/email-change/verify-current` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/me/password` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| `PATCH` | `/users/me/preferences` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `credit.balance.exhausted` | — |
| `credit.balance.low` | — |
| `credit.grant.renewed` | — |
| `log.server` | — |
| `user.activated` | `claw-audit-service` |
| `user.created` | — |
| `user.deactivated` | — |
| `user.login` | `claw-audit-service` |
| `user.logout` | `claw-audit-service` |
| `user.reactivated` | — |
| `user.role_changed` | — |
| `user.temporary_password_issued` | `claw-audit-service` |
| `user.updated` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `billing.credit.topup_reversed` | — |
| `billing.credit.topup_succeeded` | — |
| `billing.entitlement.reconcile_requested` | — |
| `billing.payment.chargeback` | — |
| `billing.payment.refunded` | — |
| `billing.subscription.activated` | — |
| `billing.subscription.cancelled` | — |
| `billing.subscription.downgraded` | — |
| `billing.subscription.expired` | — |
| `billing.subscription.renewed` | — |
| `billing.subscription.suspended` | — |
| `billing.subscription.upgraded` | — |
| `routing.model_cost.published` | `claw-routing-service` |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/AGENTS.md) for generated, service-local agent context.
