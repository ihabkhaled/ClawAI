# Billing and Payments

Billing spans the payment service and the auth service's credit/plan/quota/entitlement ownership.

## Payment service modules
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

## Auth-service billing ownership
- `credit`
- `plans`
- `quota`
- `entitlements`

## Integrity rules
- [rules/28-billing-integrity-and-api-contracts.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/28-billing-integrity-and-api-contracts.md)
- [rules/37-payg-credit-integrity.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/37-payg-credit-integrity.md)
- [rules/45-display-currency-versus-settlement-currency.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/45-display-currency-versus-settlement-currency.md)
- [rules/46-token-quota-enforcement-and-window-integrity.md](https://github.com/ihabkhaled/ClawAI/blob/main/rules/46-token-quota-enforcement-and-window-integrity.md)
- [.ai/packs/billing-payments.md](https://github.com/ihabkhaled/ClawAI/blob/main/.ai/packs/billing-payments.md)

See [[Payment service|Service-claw-payment-service]] and [[Auth service|Service-claw-auth-service]].
