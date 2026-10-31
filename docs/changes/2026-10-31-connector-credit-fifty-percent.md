# Monthly connector credit is 50% of the plan price (ADR-209)

Every paid plan now grants 50% of its monthly price as connector credit (was 30% Starter/Plus, 25% above). Free stays $0.

- Source of truth: `Plan.paygCreditPercentBps` = 5000. Catalog and `plan-payg-percent` seeder updated; migration `20261031150000_connector_credit_fifty_percent` moves existing rows still at 3000/2500 (edited rates are kept; re-run is a no-op).
- Per month: Starter $2.50, Plus $5, Pro $10, Team $25, Scale $50, Unlimited $100.
- Wallets keep their balance until their next UTC-month roll (2026-11-01 00:00 UTC). Plan cards show "50% of your plan price" immediately.
- Tests: `connector-credit-fifty-percent.spec.ts` (catalog per plan, migration SQL guard, idempotency), `credit-conversion.utility.spec.ts`.
- Margin flag: yearly Starter/Plus at full draw (credit + ceiling) reach 100% of revenue. See `docs/business/margin-model.md`.
- Deploy: auth-service migrates on start. No frontend change.
