import { CreditLedgerKind as SharedCreditLedgerKind } from '@claw/shared-types';

import { CreditLedgerKind as PrismaCreditLedgerKind } from '../../../generated/prisma';

/**
 * Prisma → shared-types translation for the ledger kind.
 *
 * The string VALUES are identical, so the wire payload is unchanged — but
 * Prisma models a native enum as a string-literal union and TypeScript will not
 * assign a literal to a string enum. Following the same idiom
 * `PRISMA_TO_SHARED_COST_CLASS` already uses in routing-service keeps the whole
 * path cast-free, and the exhaustive `Record` means adding a member to one enum
 * and forgetting the other is a compile error rather than a runtime `undefined`
 * on a customer's billing page.
 */
export const PRISMA_TO_SHARED_LEDGER_KIND: Record<PrismaCreditLedgerKind, SharedCreditLedgerKind> =
  Object.freeze({
    [PrismaCreditLedgerKind.PLAN_GRANT]: SharedCreditLedgerKind.PLAN_GRANT,
    [PrismaCreditLedgerKind.GRANT_EXPIRY]: SharedCreditLedgerKind.GRANT_EXPIRY,
    [PrismaCreditLedgerKind.TOPUP]: SharedCreditLedgerKind.TOPUP,
    [PrismaCreditLedgerKind.TOPUP_REVERSAL]: SharedCreditLedgerKind.TOPUP_REVERSAL,
    [PrismaCreditLedgerKind.RESERVATION]: SharedCreditLedgerKind.RESERVATION,
    [PrismaCreditLedgerKind.RESERVATION_RELEASE]: SharedCreditLedgerKind.RESERVATION_RELEASE,
    [PrismaCreditLedgerKind.CONSUMPTION]: SharedCreditLedgerKind.CONSUMPTION,
    [PrismaCreditLedgerKind.ADMIN_ADJUSTMENT]: SharedCreditLedgerKind.ADMIN_ADJUSTMENT,
    [PrismaCreditLedgerKind.PROVIDER_FAILURE_REFUND]:
      SharedCreditLedgerKind.PROVIDER_FAILURE_REFUND,
  });
