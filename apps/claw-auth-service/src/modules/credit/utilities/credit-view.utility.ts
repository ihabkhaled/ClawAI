import {
  type CreditPackageView,
  type PaygLedgerEntryView,
  PaygSurface,
  type PaygWalletSnapshot,
} from '@claw/shared-types';

import type {
  CreditLedgerEntry,
  CreditPackage,
  CreditPackageVersion,
  UserCreditWallet,
} from '../../../generated/prisma';
import { PRISMA_TO_SHARED_LEDGER_KIND } from '../constants/credit-enum-mapping.constants';
import { availableMicroUsd, toSafeBalanceNumber } from './credit-bucket.utility';

/**
 * Narrows the free-text `surface` column back to the enum.
 *
 * The column is text so a new spend surface does not need a migration to become
 * spendable. The cost of that choice is exactly here: a row written by a NEWER
 * replica can name a surface this build has never heard of, and the honest
 * answer for the UI is `null` — "we cannot label this" — rather than a crash or
 * an invented label.
 */
export function toPaygSurface(value: string | null): PaygSurface | null {
  if (value === null) {
    return null;
  }
  const match = Object.values(PaygSurface).find((surface) => surface === value);
  return match ?? null;
}

/**
 * Maps the wallet row onto the wire shape.
 *
 * Every figure is narrowed from BigInt to `number` HERE and nowhere else, so
 * there is exactly one place where the conversion can be reviewed. JSON has no
 * BigInt, and `JSON.stringify` throws on one rather than degrading — a wallet
 * endpoint that serialised a raw row would 500 the first time it was called.
 */
export function toWalletSnapshot(
  wallet: UserCreditWallet,
  flags: { adminBypass: boolean; meteringEnabled: boolean },
): PaygWalletSnapshot {
  return {
    grantMicroUsd: toSafeBalanceNumber(wallet.grantMicroUsd),
    purchasedMicroUsd: toSafeBalanceNumber(wallet.purchasedMicroUsd),
    reservedMicroUsd: toSafeBalanceNumber(wallet.reservedMicroUsd),
    availableMicroUsd: toSafeBalanceNumber(
      availableMicroUsd(wallet.grantMicroUsd, wallet.purchasedMicroUsd, wallet.reservedMicroUsd),
    ),
    periodGrantMicroUsd: toSafeBalanceNumber(wallet.periodGrantMicroUsd),
    periodKey: wallet.periodKey,
    grantResetsAt: wallet.grantResetsAt.toISOString(),
    adminBypass: flags.adminBypass,
    meteringEnabled: flags.meteringEnabled,
  };
}

/**
 * One ledger row as the account UI sees it.
 *
 * Deliberately drops `walletId`, `sourceEventId` and `actorUserId`: this is
 * rendered in a page the customer controls, and a ledger line is not a place to
 * hand out internal identifiers or the id of the administrator who made a
 * correction.
 */
export function toLedgerEntryView(entry: CreditLedgerEntry): PaygLedgerEntryView {
  return {
    id: entry.id,
    kind: PRISMA_TO_SHARED_LEDGER_KIND[entry.kind],
    amountMicroUsd: Number(entry.amountMicroUsd),
    grantDeltaMicroUsd: Number(entry.grantDeltaMicroUsd),
    purchasedDeltaMicroUsd: Number(entry.purchasedDeltaMicroUsd),
    balanceAfterMicroUsd: Number(entry.balanceAfterMicroUsd),
    surface: toPaygSurface(entry.surface),
    provider: entry.provider,
    model: entry.model,
    occurredAt: entry.occurredAt.toISOString(),
  };
}

/**
 * A package plus its active price version.
 *
 * `versionId` is carried into checkout so payment-service charges the exact
 * immutable row the user was shown. Sending the package id alone would let a
 * price change between the page render and the click decide what the customer
 * pays.
 */
export function toPackageView(
  pkg: CreditPackage,
  version: CreditPackageVersion,
): CreditPackageView {
  return {
    id: pkg.id,
    slug: pkg.slug,
    priceMinor: version.priceMinor,
    currency: version.currency,
    creditMicroUsd: toSafeBalanceNumber(version.creditMicroUsd),
    displayOrder: pkg.displayOrder,
    versionId: version.id,
  };
}
