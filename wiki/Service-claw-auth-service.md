# claw-auth-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-auth-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service) |
| Port | 4001 |
| Database | postgresql |
| Endpoints | 99 |
| Tests | 96 |
| Runner | vitest |
| Internal packages | @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `admin-statistics`
- `auth`
- `credit`
- `deployment`
- `entitlements`
- `health`
- `plans`
- `quota`
- `roles`
- `system-settings`
- `users`

## Persistence models
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

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/admin/credit/packages` | [src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| POST | `/admin/credit/packages` | [src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| POST | `/admin/credit/packages/:id/versions` | [src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| GET | `/admin/credit/wallets/:userId` | [src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| POST | `/admin/credit/wallets/:userId/adjust` | [src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts) |
| GET | `/admin/deployment` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| POST | `/admin/deployment/automation` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| DELETE | `/admin/deployment/credentials` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| PUT | `/admin/deployment/credentials` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| POST | `/admin/deployment/reset` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| GET | `/admin/deployment/run` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| POST | `/admin/deployment/trigger` | [src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts) |
| GET | `/admin/plans` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| DELETE | `/admin/plans/:id` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| DELETE | `/admin/plans/:id` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| GET | `/admin/plans/:id` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| PATCH | `/admin/plans/:id` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/:id/activate` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/:id/deactivate` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| PUT | `/admin/plans/:id/model-access` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| GET | `/admin/plans/:id/price-versions` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/:id/price-versions` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/:id/set-default` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/:id/set-popular` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| GET | `/admin/plans/:id/users` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| DELETE | `/admin/plans/popular` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/reorder` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| POST | `/admin/plans/users/:userId/assign` | [src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts) |
| GET | `/admin/roles` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| POST | `/admin/roles` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| DELETE | `/admin/roles/:id` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| GET | `/admin/roles/:id` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| PATCH | `/admin/roles/:id` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| PUT | `/admin/roles/:id/permissions` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| GET | `/admin/roles/permissions` | [src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts) |
| GET | `/admin/settings` | [src/modules/system-settings/controllers/admin-system-setting.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| GET | `/admin/settings/:key` | [src/modules/system-settings/controllers/admin-system-setting.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| PUT | `/admin/settings/:key` | [src/modules/system-settings/controllers/admin-system-setting.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts) |
| GET | `/admin/users/:userId/plan-overview` | [src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts) |
| GET | `/admin/users/:userId/usage-statistics` | [src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts) |
| POST | `/auth/email-change/confirm` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/email-verification/confirm` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/email-verification/resend` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/login` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/logout` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| GET | `/auth/me` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| GET | `/auth/me/entitlements` | [src/modules/entitlements/controllers/me-entitlements.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts) |
| GET | `/auth/me/usage` | [src/modules/entitlements/controllers/me-entitlements.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts) |
| POST | `/auth/password-reset/confirm` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/password-reset/request` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/refresh` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/register` | [src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts) |
| POST | `/auth/vscode/authorize/approve` | [src/modules/auth/controllers/vscode-authorization.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| POST | `/auth/vscode/authorize/details` | [src/modules/auth/controllers/vscode-authorization.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| POST | `/auth/vscode/authorize/exchange` | [src/modules/auth/controllers/vscode-authorization.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| POST | `/auth/vscode/authorize/init` | [src/modules/auth/controllers/vscode-authorization.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts) |
| GET | `/credit/me` | [src/modules/credit/controllers/credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| GET | `/credit/me/ledger` | [src/modules/credit/controllers/credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| GET | `/credit/packages` | [src/modules/credit/controllers/credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts) |
| GET | `/health` | [src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/controllers/health.controller.ts) |
| GET | `/internal/billing-metrics/provider-costs` | [src/modules/quota/controllers/provider-cost-metrics-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/provider-cost-metrics-internal.controller.ts) |
| POST | `/internal/credit/finalize` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| GET | `/internal/credit/packages` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| GET | `/internal/credit/packages/:id/active-version` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| POST | `/internal/credit/release` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| POST | `/internal/credit/reserve` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| GET | `/internal/credit/wallet/:userId` | [src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts) |
| POST | `/internal/deployment/notify` | [src/modules/deployment/controllers/deployment-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-internal.controller.ts) |
| GET | `/internal/plans/catalog` | [src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| GET | `/internal/plans/price` | [src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| GET | `/internal/plans/price-versions/:id` | [src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| POST | `/internal/plans/retirement-migrations/:id/outcome` | [src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| GET | `/internal/plans/retirement-migrations/pending` | [src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts) |
| POST | `/internal/quota/features/consume` | [src/modules/quota/controllers/quota-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| POST | `/internal/quota/finalize` | [src/modules/quota/controllers/quota-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| POST | `/internal/quota/release` | [src/modules/quota/controllers/quota-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| POST | `/internal/quota/reserve` | [src/modules/quota/controllers/quota-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts) |
| POST | `/internal/runtime/admissions` | [src/modules/entitlements/controllers/runtime-admission-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts) |
| POST | `/internal/runtime/admissions/release` | [src/modules/entitlements/controllers/runtime-admission-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts) |
| GET | `/internal/users/:id/entitlements` | [src/modules/entitlements/controllers/entitlements-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/entitlements-internal.controller.ts) |
| GET | `/users` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| POST | `/users` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| DELETE | `/users/:id` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| GET | `/users/:id` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/:id` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/:id/activate` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/:id/reactivate` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/:id/role` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| POST | `/users/:id/temporary-password` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| DELETE | `/users/me` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/me` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| DELETE | `/users/me/email-change` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| GET | `/users/me/email-change` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| POST | `/users/me/email-change` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| POST | `/users/me/email-change/resend` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| POST | `/users/me/email-change/verify-current` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/me/password` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |
| PATCH | `/users/me/preferences` | [src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts) |

## File inventory
<details>
<summary>459 tracked files</summary>

- [apps/claw-auth-service/.dockerignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/.dockerignore)
- [apps/claw-auth-service/.prettierignore](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/.prettierignore)
- [apps/claw-auth-service/.prettierrc](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/.prettierrc)
- [apps/claw-auth-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/AGENTS.md)
- [apps/claw-auth-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/CLAUDE.md)
- [apps/claw-auth-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/Dockerfile)
- [apps/claw-auth-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/Dockerfile.dev)
- [apps/claw-auth-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/docker-entrypoint.dev.sh)
- [apps/claw-auth-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/eslint.config.mjs)
- [apps/claw-auth-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/nest-cli.json)
- [apps/claw-auth-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/package.json)
- [apps/claw-auth-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma.config.ts)
- [apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260404145320_init/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260405011816_add_user_preferences/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260405011816_add_user_preferences/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260528181920_add_rbac_roles_permissions/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260528181920_add_rbac_roles_permissions/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260528193139_add_plans_quota/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260528193139_add_plans_quota/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260530000000_add_allow_research_mode_plan_feature/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260530000000_add_allow_research_mode_plan_feature/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260530100000_add_allow_critic_review_plan_feature/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260530100000_add_allow_critic_review_plan_feature/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260724000000_add_hi_language_preference/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260724000000_add_hi_language_preference/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260725120000_add_billing_quota_feature_rules/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260725120000_add_billing_quota_feature_rules/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260726010000_add_multilingual_preferences/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260726010000_add_multilingual_preferences/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260727020000_add_session_security_fields/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260727020000_add_session_security_fields/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260727020500_enforce_hashed_refresh_sessions/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260727020500_enforce_hashed_refresh_sessions/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260727021000_user_device_authorization/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260727021000_user_device_authorization/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260728204500_default_all_models_for_plans/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260728204500_default_all_models_for_plans/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260801160000_add_research_usage_features/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260801160000_add_research_usage_features/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260801193000_add_plan_retirement_lifecycle/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260801193000_add_plan_retirement_lifecycle/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260809120000_add_password_reset_tokens/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260809120000_add_password_reset_tokens/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260809120000_one_month_plan_trials/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260809120000_one_month_plan_trials/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260812230000_super_admin_email_verification/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260812230000_super_admin_email_verification/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260813181000_reconcile_existing_super_admin/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260813181000_reconcile_existing_super_admin/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260816101926_add_user_first_last_name_phone/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260816101926_add_user_first_last_name_phone/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260816140000_add_orchestration_lab_plan_gates/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260816140000_add_orchestration_lab_plan_gates/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260818140000_add_email_change_requests/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260820180000_apply_approved_free_plan_limits/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260820180000_apply_approved_free_plan_limits/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260822120000_apply_plan_feature_gate_tiers/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260822120000_apply_plan_feature_gate_tiers/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260822170000_add_deployment_credentials/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260822170000_add_deployment_credentials/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260827200000_split_plan_default_and_popular/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260827200000_split_plan_default_and_popular/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260829120000_add_payg_credit/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260829120000_add_payg_credit/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260829180000_payg_credit_from_payment/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260829180000_payg_credit_from_payment/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260901200431_add_quarterly_semiannual_billing_interval/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260901200431_add_quarterly_semiannual_billing_interval/migration.sql)
- [apps/claw-auth-service/prisma/migrations/20260912200000_add_currency_display_preference/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/20260912200000_add_currency_display_preference/migration.sql)
- [apps/claw-auth-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/migrations/migration_lock.toml)
- [apps/claw-auth-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/schema.prisma)
- [apps/claw-auth-service/prisma/seed-permissions.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seed-permissions.cjs)
- [apps/claw-auth-service/prisma/seed-runner.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seed-runner.cjs)
- [apps/claw-auth-service/prisma/seed-super-admin.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seed-super-admin.cjs)
- [apps/claw-auth-service/prisma/seed.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seed.cjs)
- [apps/claw-auth-service/prisma/seed.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seed.ts)
- [apps/claw-auth-service/prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/__tests__/plan-catalog-pricing.seeder.spec.ts)
- [apps/claw-auth-service/prisma/seeders/__tests__/plan-quarterly-semiannual-pricing.seeder.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/__tests__/plan-quarterly-semiannual-pricing.seeder.spec.ts)
- [apps/claw-auth-service/prisma/seeders/credit-package-repricing.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/credit-package-repricing.seeder.cjs)
- [apps/claw-auth-service/prisma/seeders/credit-packages.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/credit-packages.seeder.cjs)
- [apps/claw-auth-service/prisma/seeders/plan-catalog.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/plan-catalog.json)
- [apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/plan-catalog.seeder.cjs)
- [apps/claw-auth-service/prisma/seeders/plan-payg-allowance.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/plan-payg-allowance.seeder.cjs)
- [apps/claw-auth-service/prisma/seeders/plan-payg-percent.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/plan-payg-percent.seeder.cjs)
- [apps/claw-auth-service/prisma/seeders/plan-quarterly-semiannual-pricing.seeder.cjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/prisma/seeders/plan-quarterly-semiannual-pricing.seeder.cjs)
- [apps/claw-auth-service/src/__tests__/app.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/__tests__/app.spec.ts)
- [apps/claw-auth-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/app.module.ts)
- [apps/claw-auth-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/config/app.config.ts)
- [apps/claw-auth-service/src/app/decorators/current-user.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/decorators/current-user.decorator.ts)
- [apps/claw-auth-service/src/app/decorators/permissions.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/decorators/permissions.decorator.ts)
- [apps/claw-auth-service/src/app/decorators/public.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/decorators/public.decorator.ts)
- [apps/claw-auth-service/src/app/decorators/roles.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/decorators/roles.decorator.ts)
- [apps/claw-auth-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-auth-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-auth-service/src/app/guards/__tests__/auth.guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/__tests__/auth.guard.spec.ts)
- [apps/claw-auth-service/src/app/guards/__tests__/roles.guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/__tests__/roles.guard.spec.ts)
- [apps/claw-auth-service/src/app/guards/__tests__/service-token.guard.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/__tests__/service-token.guard.spec.ts)
- [apps/claw-auth-service/src/app/guards/auth.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/auth.guard.ts)
- [apps/claw-auth-service/src/app/guards/roles.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/roles.guard.ts)
- [apps/claw-auth-service/src/app/guards/service-token.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/guards/service-token.guard.ts)
- [apps/claw-auth-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-auth-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-auth-service/src/common/constants/__tests__/rbac-seed-sync.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/__tests__/rbac-seed-sync.spec.ts)
- [apps/claw-auth-service/src/common/constants/__tests__/rbac.constants.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/__tests__/rbac.constants.spec.ts)
- [apps/claw-auth-service/src/common/constants/crypto.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/crypto.constants.ts)
- [apps/claw-auth-service/src/common/constants/hashing.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/hashing.constants.ts)
- [apps/claw-auth-service/src/common/constants/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/index.ts)
- [apps/claw-auth-service/src/common/constants/jwt.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/jwt.constants.ts)
- [apps/claw-auth-service/src/common/constants/pagination.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/pagination.constants.ts)
- [apps/claw-auth-service/src/common/constants/rbac.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/rbac.constants.ts)
- [apps/claw-auth-service/src/common/constants/super-admin.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/super-admin.constants.ts)
- [apps/claw-auth-service/src/common/constants/user-status.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/constants/user-status.constants.ts)
- [apps/claw-auth-service/src/common/enums/health-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/health-status.enum.ts)
- [apps/claw-auth-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/index.ts)
- [apps/claw-auth-service/src/common/enums/quota-rejection-window.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/quota-rejection-window.enum.ts)
- [apps/claw-auth-service/src/common/enums/sort-order.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/sort-order.enum.ts)
- [apps/claw-auth-service/src/common/enums/super-admin-mutation-scope.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/super-admin-mutation-scope.enum.ts)
- [apps/claw-auth-service/src/common/enums/user-role.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/user-role.enum.ts)
- [apps/claw-auth-service/src/common/enums/user-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/user-status.enum.ts)
- [apps/claw-auth-service/src/common/enums/weighted-usage-period-field.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/enums/weighted-usage-period-field.enum.ts)
- [apps/claw-auth-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/errors/business.exception.ts)
- [apps/claw-auth-service/src/common/errors/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/errors/index.ts)
- [apps/claw-auth-service/src/common/types/authenticated-request.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/types/authenticated-request.type.ts)
- [apps/claw-auth-service/src/common/types/business-exception-details.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/types/business-exception-details.type.ts)
- [apps/claw-auth-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/types/index.ts)
- [apps/claw-auth-service/src/common/types/jwt-payload.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/types/jwt-payload.type.ts)
- [apps/claw-auth-service/src/common/types/pagination.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/types/pagination.type.ts)
- [apps/claw-auth-service/src/common/utilities/__tests__/hashing.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/__tests__/hashing.utility.spec.ts)
- [apps/claw-auth-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/__tests__/inter-service-auth.utility.spec.ts)
- [apps/claw-auth-service/src/common/utilities/__tests__/jwt.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/__tests__/jwt.utility.spec.ts)
- [apps/claw-auth-service/src/common/utilities/__tests__/period-key.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/__tests__/period-key.utility.spec.ts)
- [apps/claw-auth-service/src/common/utilities/constant-time-equal.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/constant-time-equal.utility.ts)
- [apps/claw-auth-service/src/common/utilities/crypto.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/crypto.utility.ts)
- [apps/claw-auth-service/src/common/utilities/hashing.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/hashing.utility.ts)
- [apps/claw-auth-service/src/common/utilities/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/index.ts)
- [apps/claw-auth-service/src/common/utilities/inter-service-auth.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/inter-service-auth.utility.ts)
- [apps/claw-auth-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-auth-service/src/common/utilities/period-key.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/common/utilities/period-key.utility.ts)
- [apps/claw-auth-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-auth-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-auth-service/src/infrastructure/redis/constants/redis-lock.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/redis/constants/redis-lock.constants.ts)
- [apps/claw-auth-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-auth-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-auth-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-auth-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/main.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/admin-statistics.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/admin-statistics.module.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/constants/admin-user-statistics-dto.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/constants/admin-user-statistics-dto.constants.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/constants/admin-user-statistics.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/constants/admin-user-statistics.constants.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/constants/trial-days.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/constants/trial-days.constants.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/controllers/admin-user-statistics.controller.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/dto/admin-user-statistics.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/dto/admin-user-statistics.dto.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/services/__tests__/admin-user-plan.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/services/__tests__/admin-user-plan.service.spec.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/services/__tests__/admin-user-statistics.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/services/__tests__/admin-user-statistics.service.spec.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/services/admin-user-plan.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/services/admin-user-plan.service.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/services/admin-user-statistics.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/services/admin-user-statistics.service.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/utilities/__tests__/credit-month-window.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/utilities/__tests__/credit-month-window.utility.spec.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/utilities/__tests__/trial-days-remaining.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/utilities/__tests__/trial-days-remaining.utility.spec.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/utilities/credit-month-window.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/utilities/credit-month-window.utility.ts)
- [apps/claw-auth-service/src/modules/admin-statistics/utilities/trial-days-remaining.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/admin-statistics/utilities/trial-days-remaining.utility.ts)
- [apps/claw-auth-service/src/modules/auth/adapters/__tests__/auth-email.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/adapters/__tests__/auth-email.adapter.spec.ts)
- [apps/claw-auth-service/src/modules/auth/adapters/auth-email.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/adapters/auth-email.adapter.ts)
- [apps/claw-auth-service/src/modules/auth/auth.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/auth.module.ts)
- [apps/claw-auth-service/src/modules/auth/constants/device-authorization.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/device-authorization.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/email-change.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/email-change.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/email-dispatch-cooldown.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/email-dispatch-cooldown.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/email-verification.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/email-verification.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/password-reset.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/password-reset.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/token-session.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/token-session.constants.ts)
- [apps/claw-auth-service/src/modules/auth/constants/vscode-authorization.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/constants/vscode-authorization.constants.ts)
- [apps/claw-auth-service/src/modules/auth/controllers/__tests__/auth.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/__tests__/auth.controller.spec.ts)
- [apps/claw-auth-service/src/modules/auth/controllers/__tests__/vscode-authorization.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/__tests__/vscode-authorization.controller.spec.ts)
- [apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/auth.controller.ts)
- [apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/controllers/vscode-authorization.controller.ts)
- [apps/claw-auth-service/src/modules/auth/dto/__tests__/email-change.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/__tests__/email-change.dto.spec.ts)
- [apps/claw-auth-service/src/modules/auth/dto/__tests__/login.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/__tests__/login.dto.spec.ts)
- [apps/claw-auth-service/src/modules/auth/dto/__tests__/register.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/__tests__/register.dto.spec.ts)
- [apps/claw-auth-service/src/modules/auth/dto/email-change.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/email-change.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/email-verification.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/email-verification.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/login.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/login.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/password-reset.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/password-reset.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/refresh-token.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/refresh-token.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/register.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/register.dto.ts)
- [apps/claw-auth-service/src/modules/auth/dto/vscode-authorization.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/dto/vscode-authorization.dto.ts)
- [apps/claw-auth-service/src/modules/auth/email/__tests__/auth-email-copy-completeness.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/__tests__/auth-email-copy-completeness.spec.ts)
- [apps/claw-auth-service/src/modules/auth/email/__tests__/auth-email-render.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/__tests__/auth-email-render.utility.spec.ts)
- [apps/claw-auth-service/src/modules/auth/email/constants/auth-email-expiry.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/constants/auth-email-expiry.constants.ts)
- [apps/claw-auth-service/src/modules/auth/email/constants/auth-email-theme.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/constants/auth-email-theme.constants.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/ar.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/ar.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/de.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/de.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/en.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/en.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/es.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/es.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/fa.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/fa.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/fr.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/fr.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/hi.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/hi.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/index.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/it.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/it.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/ja.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/ja.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/pt.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/pt.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/ru.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/ru.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/th.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/th.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/copy/zh.copy.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/copy/zh.copy.ts)
- [apps/claw-auth-service/src/modules/auth/email/types/auth-email-copy.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/types/auth-email-copy.type.ts)
- [apps/claw-auth-service/src/modules/auth/email/types/auth-email-recipient.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/types/auth-email-recipient.type.ts)
- [apps/claw-auth-service/src/modules/auth/email/types/auth-email-render.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/types/auth-email-render.type.ts)
- [apps/claw-auth-service/src/modules/auth/email/utilities/auth-email-render.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/email/utilities/auth-email-render.utility.ts)
- [apps/claw-auth-service/src/modules/auth/enums/auth-email-kind.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/enums/auth-email-kind.enum.ts)
- [apps/claw-auth-service/src/modules/auth/enums/device-authorization-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/enums/device-authorization-status.enum.ts)
- [apps/claw-auth-service/src/modules/auth/enums/email-change-stage.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/enums/email-change-stage.enum.ts)
- [apps/claw-auth-service/src/modules/auth/enums/email-dispatch-purpose.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/enums/email-dispatch-purpose.enum.ts)
- [apps/claw-auth-service/src/modules/auth/enums/session-client-kind.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/enums/session-client-kind.enum.ts)
- [apps/claw-auth-service/src/modules/auth/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/index.ts)
- [apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/__tests__/auth.manager.spec.ts)
- [apps/claw-auth-service/src/modules/auth/managers/__tests__/device-authorization.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/__tests__/device-authorization.manager.spec.ts)
- [apps/claw-auth-service/src/modules/auth/managers/__tests__/email-change.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/__tests__/email-change.manager.spec.ts)
- [apps/claw-auth-service/src/modules/auth/managers/__tests__/token-session.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/__tests__/token-session.manager.spec.ts)
- [apps/claw-auth-service/src/modules/auth/managers/auth.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/auth.manager.ts)
- [apps/claw-auth-service/src/modules/auth/managers/device-authorization.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/device-authorization.manager.ts)
- [apps/claw-auth-service/src/modules/auth/managers/email-change.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/email-change.manager.ts)
- [apps/claw-auth-service/src/modules/auth/managers/password-reset.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/password-reset.manager.ts)
- [apps/claw-auth-service/src/modules/auth/managers/token-session.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/managers/token-session.manager.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/__tests__/auth.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/__tests__/auth.repository.spec.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/__tests__/device-authorization.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/__tests__/device-authorization.repository.spec.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/__tests__/email-change.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/__tests__/email-change.repository.spec.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/auth.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/auth.repository.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/device-authorization.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/device-authorization.repository.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/email-change.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/email-change.repository.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/email-verification.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/email-verification.repository.ts)
- [apps/claw-auth-service/src/modules/auth/repositories/password-reset.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/repositories/password-reset.repository.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/auth-email-recipient.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/auth-email-recipient.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/auth.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/auth.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/email-change.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/email-change.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/email-dispatch-cooldown.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/email-dispatch-cooldown.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/email-verification.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/email-verification.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/password-reset.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/password-reset.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/__tests__/vscode-authorization.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/__tests__/vscode-authorization.service.spec.ts)
- [apps/claw-auth-service/src/modules/auth/services/auth-email-recipient.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/auth-email-recipient.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/auth.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/auth.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/email-change.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/email-change.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/email-dispatch-cooldown.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/email-dispatch-cooldown.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/email-verification.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/email-verification.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/password-reset.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/password-reset.service.ts)
- [apps/claw-auth-service/src/modules/auth/services/vscode-authorization.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/services/vscode-authorization.service.ts)
- [apps/claw-auth-service/src/modules/auth/types/auth.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/auth.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/device-authorization.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/device-authorization.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/email-change.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/email-change.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/email-verification.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/email-verification.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/password-reset.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/password-reset.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/session.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/session.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/token-session.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/token-session.types.ts)
- [apps/claw-auth-service/src/modules/auth/types/vscode-authorization.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/types/vscode-authorization.types.ts)
- [apps/claw-auth-service/src/modules/auth/utilities/__tests__/email-change-otp.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/utilities/__tests__/email-change-otp.utility.spec.ts)
- [apps/claw-auth-service/src/modules/auth/utilities/__tests__/vscode-authorization.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/utilities/__tests__/vscode-authorization.utility.spec.ts)
- [apps/claw-auth-service/src/modules/auth/utilities/email-change-otp.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/utilities/email-change-otp.utility.ts)
- [apps/claw-auth-service/src/modules/auth/utilities/vscode-authorization.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/auth/utilities/vscode-authorization.utility.ts)
- [apps/claw-auth-service/src/modules/credit/clients/connector-policy.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/clients/connector-policy.client.ts)
- [apps/claw-auth-service/src/modules/credit/clients/model-rate.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/clients/model-rate.client.ts)
- [apps/claw-auth-service/src/modules/credit/constants/credit-enum-mapping.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/constants/credit-enum-mapping.constants.ts)
- [apps/claw-auth-service/src/modules/credit/constants/credit-release-reason.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/constants/credit-release-reason.constants.ts)
- [apps/claw-auth-service/src/modules/credit/constants/credit-topup-inbox.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/constants/credit-topup-inbox.constants.ts)
- [apps/claw-auth-service/src/modules/credit/constants/credit-window.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/constants/credit-window.constants.ts)
- [apps/claw-auth-service/src/modules/credit/constants/credit.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/constants/credit.constants.ts)
- [apps/claw-auth-service/src/modules/credit/consumers/credit-topup.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/consumers/credit-topup.consumer.ts)
- [apps/claw-auth-service/src/modules/credit/consumers/model-cost-published.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/consumers/model-cost-published.consumer.ts)
- [apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/admin-credit.controller.ts)
- [apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit-internal.controller.ts)
- [apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/controllers/credit.controller.ts)
- [apps/claw-auth-service/src/modules/credit/credit.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/credit.module.ts)
- [apps/claw-auth-service/src/modules/credit/dto/credit-admin.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/dto/credit-admin.dto.ts)
- [apps/claw-auth-service/src/modules/credit/dto/credit-internal.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/dto/credit-internal.dto.ts)
- [apps/claw-auth-service/src/modules/credit/dto/credit-ledger-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/dto/credit-ledger-query.dto.ts)
- [apps/claw-auth-service/src/modules/credit/managers/__tests__/credit-reservation.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/managers/__tests__/credit-reservation.manager.spec.ts)
- [apps/claw-auth-service/src/modules/credit/managers/credit-reservation.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/managers/credit-reservation.manager.ts)
- [apps/claw-auth-service/src/modules/credit/repositories/credit-ledger.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/repositories/credit-ledger.repository.ts)
- [apps/claw-auth-service/src/modules/credit/repositories/credit-package.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/repositories/credit-package.repository.ts)
- [apps/claw-auth-service/src/modules/credit/repositories/credit-wallet.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/repositories/credit-wallet.repository.ts)
- [apps/claw-auth-service/src/modules/credit/schemas/connector-policy-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/schemas/connector-policy-response.schema.ts)
- [apps/claw-auth-service/src/modules/credit/schemas/credit-topup-event.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/schemas/credit-topup-event.schema.ts)
- [apps/claw-auth-service/src/modules/credit/schemas/model-cost-published-event.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/schemas/model-cost-published-event.schema.ts)
- [apps/claw-auth-service/src/modules/credit/schemas/model-cost-response.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/schemas/model-cost-response.schema.ts)
- [apps/claw-auth-service/src/modules/credit/services/__tests__/credit-grant.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/__tests__/credit-grant.service.spec.ts)
- [apps/claw-auth-service/src/modules/credit/services/__tests__/credit-topup-inbox.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/__tests__/credit-topup-inbox.service.spec.ts)
- [apps/claw-auth-service/src/modules/credit/services/__tests__/credit-wallet.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/__tests__/credit-wallet.service.spec.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-account.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-account.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-event.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-event.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-grant.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-grant.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-package.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-package.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-sweeper.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-sweeper.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-topup-inbox.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-topup-inbox.service.ts)
- [apps/claw-auth-service/src/modules/credit/services/credit-wallet.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/services/credit-wallet.service.ts)
- [apps/claw-auth-service/src/modules/credit/types/credit.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/types/credit.types.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-bucket.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-bucket.utility.spec.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-conversion.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-conversion.utility.spec.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-threshold.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/__tests__/credit-threshold.utility.spec.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/__tests__/payg-classification.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/__tests__/payg-classification.utility.spec.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-bucket.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-bucket.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-conversion.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-conversion.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-period.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-period.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-request.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-request.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-reservation.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-reservation.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-threshold.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-threshold.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/credit-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/credit-view.utility.ts)
- [apps/claw-auth-service/src/modules/credit/utilities/payg-classification.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/credit/utilities/payg-classification.utility.ts)
- [apps/claw-auth-service/src/modules/deployment/adapters/__tests__/deployment-status-file.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/adapters/__tests__/deployment-status-file.adapter.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/adapters/__tests__/github-actions.adapter.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/adapters/__tests__/github-actions.adapter.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/adapters/deployment-status-file.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/adapters/deployment-status-file.adapter.ts)
- [apps/claw-auth-service/src/modules/deployment/adapters/github-actions.adapter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/adapters/github-actions.adapter.ts)
- [apps/claw-auth-service/src/modules/deployment/constants/deployment-status.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/constants/deployment-status.constants.ts)
- [apps/claw-auth-service/src/modules/deployment/constants/deployment-trigger.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/constants/deployment-trigger.constants.ts)
- [apps/claw-auth-service/src/modules/deployment/controllers/__tests__/deployment-admin.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/__tests__/deployment-admin.controller.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/controllers/__tests__/deployment-internal.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/__tests__/deployment-internal.controller.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-admin.controller.ts)
- [apps/claw-auth-service/src/modules/deployment/controllers/deployment-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/controllers/deployment-internal.controller.ts)
- [apps/claw-auth-service/src/modules/deployment/deployment.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/deployment.module.ts)
- [apps/claw-auth-service/src/modules/deployment/dto/deployment-credential.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/dto/deployment-credential.dto.ts)
- [apps/claw-auth-service/src/modules/deployment/dto/deployment-trigger.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/dto/deployment-trigger.dto.ts)
- [apps/claw-auth-service/src/modules/deployment/repositories/deployment-credential.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/repositories/deployment-credential.repository.ts)
- [apps/claw-auth-service/src/modules/deployment/schemas/deployment-status.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/schemas/deployment-status.schema.ts)
- [apps/claw-auth-service/src/modules/deployment/schemas/github-run.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/schemas/github-run.schema.ts)
- [apps/claw-auth-service/src/modules/deployment/services/__tests__/deployment.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/services/__tests__/deployment.service.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/services/deployment.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/services/deployment.service.ts)
- [apps/claw-auth-service/src/modules/deployment/types/deployment-credential.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/types/deployment-credential.types.ts)
- [apps/claw-auth-service/src/modules/deployment/types/deployment-notification.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/types/deployment-notification.types.ts)
- [apps/claw-auth-service/src/modules/deployment/types/deployment-trigger.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/types/deployment-trigger.types.ts)
- [apps/claw-auth-service/src/modules/deployment/types/deployment-view.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/types/deployment-view.types.ts)
- [apps/claw-auth-service/src/modules/deployment/types/github-run.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/types/github-run.types.ts)
- [apps/claw-auth-service/src/modules/deployment/utilities/__tests__/deployment-status.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/utilities/__tests__/deployment-status.utility.spec.ts)
- [apps/claw-auth-service/src/modules/deployment/utilities/deployment-run.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/utilities/deployment-run.utility.ts)
- [apps/claw-auth-service/src/modules/deployment/utilities/deployment-status.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/deployment/utilities/deployment-status.utility.ts)
- [apps/claw-auth-service/src/modules/entitlements/__tests__/billing-entitlement.consumer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/__tests__/billing-entitlement.consumer.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/__tests__/entitlement-inbox.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/__tests__/entitlement-inbox.service.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/clients/__tests__/payment-entitlement.client.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/clients/__tests__/payment-entitlement.client.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/clients/payment-entitlement.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/clients/payment-entitlement.client.ts)
- [apps/claw-auth-service/src/modules/entitlements/constants/admin-entitlements.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/constants/admin-entitlements.constants.ts)
- [apps/claw-auth-service/src/modules/entitlements/constants/entitlement-inbox.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/constants/entitlement-inbox.constants.ts)
- [apps/claw-auth-service/src/modules/entitlements/constants/payment-entitlement.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/constants/payment-entitlement.constants.ts)
- [apps/claw-auth-service/src/modules/entitlements/constants/runtime-admission.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/constants/runtime-admission.constants.ts)
- [apps/claw-auth-service/src/modules/entitlements/consumers/__tests__/billing-entitlement-reconcile.consumer.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/consumers/__tests__/billing-entitlement-reconcile.consumer.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/consumers/billing-entitlement-reconcile.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/consumers/billing-entitlement-reconcile.consumer.ts)
- [apps/claw-auth-service/src/modules/entitlements/consumers/billing-entitlement.consumer.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/consumers/billing-entitlement.consumer.ts)
- [apps/claw-auth-service/src/modules/entitlements/controllers/__tests__/entitlements-internal.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/__tests__/entitlements-internal.controller.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/controllers/__tests__/me-entitlements.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/__tests__/me-entitlements.controller.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/controllers/entitlements-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/entitlements-internal.controller.ts)
- [apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/me-entitlements.controller.ts)
- [apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/controllers/runtime-admission-internal.controller.ts)
- [apps/claw-auth-service/src/modules/entitlements/dto/runtime-admission.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/dto/runtime-admission.dto.ts)
- [apps/claw-auth-service/src/modules/entitlements/entitlements.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/entitlements.module.ts)
- [apps/claw-auth-service/src/modules/entitlements/repositories/__tests__/entitlement-inbox.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/repositories/__tests__/entitlement-inbox.repository.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/repositories/entitlement-inbox.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/repositories/entitlement-inbox.repository.ts)
- [apps/claw-auth-service/src/modules/entitlements/schemas/billing-event.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/schemas/billing-event.schema.ts)
- [apps/claw-auth-service/src/modules/entitlements/schemas/payment-entitlement.schema.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/schemas/payment-entitlement.schema.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/__tests__/entitlement-reconciliation.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/__tests__/entitlement-reconciliation.service.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/__tests__/entitlements.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/__tests__/entitlements.service.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/__tests__/runtime-admission.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/__tests__/runtime-admission.service.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/__tests__/usage-view.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/__tests__/usage-view.service.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/entitlement-applier.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/entitlement-applier.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/entitlement-inbox.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/entitlement-inbox.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/entitlement-reconciliation.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/entitlement-reconciliation.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/runtime-admission.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/runtime-admission.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/services/usage-view.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/services/usage-view.service.ts)
- [apps/claw-auth-service/src/modules/entitlements/types/entitlement-inbox.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/types/entitlement-inbox.types.ts)
- [apps/claw-auth-service/src/modules/entitlements/types/entitlements.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/types/entitlements.types.ts)
- [apps/claw-auth-service/src/modules/entitlements/types/runtime-admission.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/types/runtime-admission.types.ts)
- [apps/claw-auth-service/src/modules/entitlements/types/usage-view.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/types/usage-view.types.ts)
- [apps/claw-auth-service/src/modules/entitlements/utilities/__tests__/usage-view.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/utilities/__tests__/usage-view.utility.spec.ts)
- [apps/claw-auth-service/src/modules/entitlements/utilities/runtime-admission.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/utilities/runtime-admission.utility.ts)
- [apps/claw-auth-service/src/modules/entitlements/utilities/usage-date-range.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/utilities/usage-date-range.utility.ts)
- [apps/claw-auth-service/src/modules/entitlements/utilities/usage-view.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/entitlements/utilities/usage-view.utility.ts)
- [apps/claw-auth-service/src/modules/health/controllers/__tests__/health.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/controllers/__tests__/health.controller.spec.ts)
- [apps/claw-auth-service/src/modules/health/controllers/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/controllers/health.controller.ts)
- [apps/claw-auth-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/health.module.ts)
- [apps/claw-auth-service/src/modules/health/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/index.ts)
- [apps/claw-auth-service/src/modules/health/services/__tests__/health.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/services/__tests__/health.service.spec.ts)
- [apps/claw-auth-service/src/modules/health/services/health.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/services/health.service.ts)
- [apps/claw-auth-service/src/modules/health/types/health.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/health/types/health.types.ts)
- [apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/__tests__/plan-catalog.spec.ts)
- [apps/claw-auth-service/src/modules/plans/clients/exposed-model.client.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/clients/exposed-model.client.ts)
- [apps/claw-auth-service/src/modules/plans/constants/exposed-model.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/constants/exposed-model.constants.ts)
- [apps/claw-auth-service/src/modules/plans/constants/plan-grant.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/constants/plan-grant.constants.ts)
- [apps/claw-auth-service/src/modules/plans/constants/popular-plan.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/constants/popular-plan.constants.ts)
- [apps/claw-auth-service/src/modules/plans/constants/quota-window.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/constants/quota-window.constants.ts)
- [apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans-internal.controller.ts)
- [apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/controllers/plans.controller.ts)
- [apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-misc.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-misc.dto.spec.ts)
- [apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-price.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-price.dto.spec.ts)
- [apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-quota.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-quota.dto.spec.ts)
- [apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-retirement.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-retirement.dto.spec.ts)
- [apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-trial.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/__tests__/plan-trial.dto.spec.ts)
- [apps/claw-auth-service/src/modules/plans/dto/create-plan.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/create-plan.dto.ts)
- [apps/claw-auth-service/src/modules/plans/dto/plan-catalog.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/plan-catalog.dto.ts)
- [apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/plan-misc.dto.ts)
- [apps/claw-auth-service/src/modules/plans/dto/plan-price.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/plan-price.dto.ts)
- [apps/claw-auth-service/src/modules/plans/dto/plan-retirement.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/plan-retirement.dto.ts)
- [apps/claw-auth-service/src/modules/plans/dto/update-plan.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/dto/update-plan.dto.ts)
- [apps/claw-auth-service/src/modules/plans/plans.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/plans.module.ts)
- [apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/repositories/__tests__/plans.repository.spec.ts)
- [apps/claw-auth-service/src/modules/plans/repositories/plan-billing.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/repositories/plan-billing.repository.ts)
- [apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/repositories/plans.repository.ts)
- [apps/claw-auth-service/src/modules/plans/services/__tests__/plan-catalog.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/services/__tests__/plan-catalog.service.spec.ts)
- [apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/services/__tests__/plans.service.spec.ts)
- [apps/claw-auth-service/src/modules/plans/services/plan-catalog.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/services/plan-catalog.service.ts)
- [apps/claw-auth-service/src/modules/plans/services/plans.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/services/plans.service.ts)
- [apps/claw-auth-service/src/modules/plans/types/plan-catalog-seeder.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/types/plan-catalog-seeder.types.ts)
- [apps/claw-auth-service/src/modules/plans/types/plan-catalog.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/types/plan-catalog.types.ts)
- [apps/claw-auth-service/src/modules/plans/types/plans.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/types/plans.types.ts)
- [apps/claw-auth-service/src/modules/plans/types/quota-window.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/types/quota-window.types.ts)
- [apps/claw-auth-service/src/modules/plans/utilities/__tests__/plan-catalog.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/utilities/__tests__/plan-catalog.utility.spec.ts)
- [apps/claw-auth-service/src/modules/plans/utilities/__tests__/quota-window-coherence.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/utilities/__tests__/quota-window-coherence.utility.spec.ts)
- [apps/claw-auth-service/src/modules/plans/utilities/plan-catalog.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/utilities/plan-catalog.utility.ts)
- [apps/claw-auth-service/src/modules/plans/utilities/prisma-error.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/utilities/prisma-error.utility.ts)
- [apps/claw-auth-service/src/modules/plans/utilities/quota-window-coherence.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/plans/utilities/quota-window-coherence.utility.ts)
- [apps/claw-auth-service/src/modules/quota/constants/quota-redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/constants/quota-redis.constants.ts)
- [apps/claw-auth-service/src/modules/quota/constants/quota-window.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/constants/quota-window.constants.ts)
- [apps/claw-auth-service/src/modules/quota/constants/quota.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/constants/quota.constants.ts)
- [apps/claw-auth-service/src/modules/quota/controllers/provider-cost-metrics-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/provider-cost-metrics-internal.controller.ts)
- [apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/controllers/quota-internal.controller.ts)
- [apps/claw-auth-service/src/modules/quota/dto/provider-cost-metrics.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/dto/provider-cost-metrics.dto.ts)
- [apps/claw-auth-service/src/modules/quota/dto/quota.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/dto/quota.dto.ts)
- [apps/claw-auth-service/src/modules/quota/quota.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/quota.module.ts)
- [apps/claw-auth-service/src/modules/quota/repositories/__tests__/token-ledger.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/repositories/__tests__/token-ledger.repository.spec.ts)
- [apps/claw-auth-service/src/modules/quota/repositories/feature-usage.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/repositories/feature-usage.repository.ts)
- [apps/claw-auth-service/src/modules/quota/repositories/token-ledger.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/repositories/token-ledger.repository.ts)
- [apps/claw-auth-service/src/modules/quota/repositories/weighted-usage.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/repositories/weighted-usage.repository.ts)
- [apps/claw-auth-service/src/modules/quota/services/__tests__/feature-policy.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/__tests__/feature-policy.service.spec.ts)
- [apps/claw-auth-service/src/modules/quota/services/__tests__/feature-usage-consumption.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/__tests__/feature-usage-consumption.service.spec.ts)
- [apps/claw-auth-service/src/modules/quota/services/__tests__/provider-cost-metrics.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/__tests__/provider-cost-metrics.service.spec.ts)
- [apps/claw-auth-service/src/modules/quota/services/__tests__/quota.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/__tests__/quota.service.spec.ts)
- [apps/claw-auth-service/src/modules/quota/services/feature-policy.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/feature-policy.service.ts)
- [apps/claw-auth-service/src/modules/quota/services/feature-usage-consumption.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/feature-usage-consumption.service.ts)
- [apps/claw-auth-service/src/modules/quota/services/provider-cost-metrics.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/provider-cost-metrics.service.ts)
- [apps/claw-auth-service/src/modules/quota/services/quota.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/services/quota.service.ts)
- [apps/claw-auth-service/src/modules/quota/types/provider-cost.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/types/provider-cost.types.ts)
- [apps/claw-auth-service/src/modules/quota/types/quota.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/types/quota.types.ts)
- [apps/claw-auth-service/src/modules/quota/utilities/feature-window.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/utilities/feature-window.utility.ts)
- [apps/claw-auth-service/src/modules/quota/utilities/quota-reservation.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/utilities/quota-reservation.utility.ts)
- [apps/claw-auth-service/src/modules/quota/utilities/quota-window.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/quota/utilities/quota-window.utility.ts)
- [apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/controllers/roles.controller.ts)
- [apps/claw-auth-service/src/modules/roles/dto/create-role.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/dto/create-role.dto.ts)
- [apps/claw-auth-service/src/modules/roles/dto/set-permissions.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/dto/set-permissions.dto.ts)
- [apps/claw-auth-service/src/modules/roles/dto/update-role.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/dto/update-role.dto.ts)
- [apps/claw-auth-service/src/modules/roles/repositories/roles.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/repositories/roles.repository.ts)
- [apps/claw-auth-service/src/modules/roles/roles.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/roles.module.ts)
- [apps/claw-auth-service/src/modules/roles/services/__tests__/permissions-seeder.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/services/__tests__/permissions-seeder.service.spec.ts)
- [apps/claw-auth-service/src/modules/roles/services/__tests__/roles.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/services/__tests__/roles.service.spec.ts)
- [apps/claw-auth-service/src/modules/roles/services/permissions-seeder.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/services/permissions-seeder.service.ts)
- [apps/claw-auth-service/src/modules/roles/services/roles.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/services/roles.service.ts)
- [apps/claw-auth-service/src/modules/roles/types/permissions-seeder.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/types/permissions-seeder.types.ts)
- [apps/claw-auth-service/src/modules/roles/types/roles.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/roles/types/roles.types.ts)
- [apps/claw-auth-service/src/modules/system-settings/constants/system-setting.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/constants/system-setting.constants.ts)
- [apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/controllers/admin-system-setting.controller.ts)
- [apps/claw-auth-service/src/modules/system-settings/dto/system-setting.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/dto/system-setting.dto.ts)
- [apps/claw-auth-service/src/modules/system-settings/repositories/system-setting.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/repositories/system-setting.repository.ts)
- [apps/claw-auth-service/src/modules/system-settings/services/__tests__/system-setting.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/services/__tests__/system-setting.service.spec.ts)
- [apps/claw-auth-service/src/modules/system-settings/services/system-setting.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/services/system-setting.service.ts)
- [apps/claw-auth-service/src/modules/system-settings/system-settings.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/system-settings.module.ts)
- [apps/claw-auth-service/src/modules/system-settings/types/system-setting.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/system-settings/types/system-setting.types.ts)
- [apps/claw-auth-service/src/modules/users/__tests__/users.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/__tests__/users.service.spec.ts)
- [apps/claw-auth-service/src/modules/users/controllers/__tests__/users.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/__tests__/users.controller.spec.ts)
- [apps/claw-auth-service/src/modules/users/controllers/users.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/controllers/users.controller.ts)
- [apps/claw-auth-service/src/modules/users/dto/__tests__/account-profile.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/__tests__/account-profile.dto.spec.ts)
- [apps/claw-auth-service/src/modules/users/dto/__tests__/create-user.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/__tests__/create-user.dto.spec.ts)
- [apps/claw-auth-service/src/modules/users/dto/__tests__/currency-preference.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/__tests__/currency-preference.dto.spec.ts)
- [apps/claw-auth-service/src/modules/users/dto/__tests__/update-preferences.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/__tests__/update-preferences.dto.spec.ts)
- [apps/claw-auth-service/src/modules/users/dto/__tests__/update-user.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/__tests__/update-user.dto.spec.ts)
- [apps/claw-auth-service/src/modules/users/dto/account-profile.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/account-profile.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/change-password.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/change-password.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/change-role.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/change-role.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/create-user.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/create-user.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/list-users-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/list-users-query.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/update-preferences.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/update-preferences.dto.ts)
- [apps/claw-auth-service/src/modules/users/dto/update-user.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/dto/update-user.dto.ts)
- [apps/claw-auth-service/src/modules/users/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/index.ts)
- [apps/claw-auth-service/src/modules/users/repositories/__tests__/users.repository.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/repositories/__tests__/users.repository.spec.ts)
- [apps/claw-auth-service/src/modules/users/repositories/users.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/repositories/users.repository.ts)
- [apps/claw-auth-service/src/modules/users/service.utilities/__tests__/super-admin-mutability.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/service.utilities/__tests__/super-admin-mutability.utility.spec.ts)
- [apps/claw-auth-service/src/modules/users/service.utilities/password-policy.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/service.utilities/password-policy.utility.ts)
- [apps/claw-auth-service/src/modules/users/service.utilities/super-admin-mutability.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/service.utilities/super-admin-mutability.utility.ts)
- [apps/claw-auth-service/src/modules/users/service.utilities/to-safe-user.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/service.utilities/to-safe-user.utility.ts)
- [apps/claw-auth-service/src/modules/users/services/users.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/services/users.service.ts)
- [apps/claw-auth-service/src/modules/users/types/super-admin-mutability.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/types/super-admin-mutability.types.ts)
- [apps/claw-auth-service/src/modules/users/types/users.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/types/users.types.ts)
- [apps/claw-auth-service/src/modules/users/users.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/modules/users/users.module.ts)
- [apps/claw-auth-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/src/vitest-globals.d.ts)
- [apps/claw-auth-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/tsconfig.build.json)
- [apps/claw-auth-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/tsconfig.json)
- [apps/claw-auth-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-auth-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
