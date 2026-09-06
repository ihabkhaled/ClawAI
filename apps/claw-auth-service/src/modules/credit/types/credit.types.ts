import type { ModelCostRates, PaygLedgerEntryView, PaygSurface } from '@claw/shared-types';

import type { CreditLedgerKind, Prisma, UserCreditWallet } from '../../../generated/prisma';

/** Alias so the movement type below reads without a nested namespace lookup. */
export type PrismaUserCreditWalletUpdateInput = Prisma.UserCreditWalletUpdateInput;

/**
 * A model's price as auth-service sees it, after the routing-service lookup.
 *
 * `isPriced` is carried separately from the rates and is NOT the same question
 * as "are the rates zero". A model can legitimately cost nothing (local
 * compute the user owns) and a model can be unknown to the registry — those are
 * opposite outcomes for a metered provider, and collapsing them is how an
 * unpriced frontier model becomes free.
 */
export type PaygRateSnapshot = {
  rates: ModelCostRates;
  isPriced: boolean;
  /** Set when the registry answered from the LOCAL-compute zero-rate fallback. */
  isLocalComputeFallback: boolean;
};

/**
 * Whether one (provider, model) pair spends real money, and why.
 *
 * `reason` is only meaningful when `isPayg` is false — it is what the internal
 * contract returns as `{ metered: false, reason }`, and the caller renders a
 * different UI for "your model is local" than for "billing is switched off".
 */
export type PaygClassification =
  | { isPayg: true; rate: PaygRateSnapshot }
  | { isPayg: false; reason: 'NOT_PAYG' | 'METERING_DISABLED' | 'ADMIN_BYPASS' };

/** Everything the reservation gate needs about one request. */
export type CreditReserveInput = {
  userId: string;
  requestId: string;
  provider: string;
  model: string;
  surface: PaygSurface;
  workflow: string | null;
  promptTokens: number;
  cachedPromptTokens: number;
  requestedMaxOutputTokens: number;
};

export type CreditFinalizeInput = {
  reservationId: string;
  promptTokens: number;
  completionTokens: number;
  cachedPromptTokens: number;
  reasoningTokens: number;
  toolCalls: number;
  searchCalls: number;
};

/**
 * How an amount lands across the two buckets.
 *
 * Always produced by a pure utility rather than inline arithmetic, because the
 * ORDER is a customer commitment: debits take GRANT first so the perishable
 * half is spent before money someone paid for, and refunds return PURCHASED
 * first so cash is never handed back as an allowance that expires at month end.
 */
export type CreditBucketSplit = {
  grantMicroUsd: bigint;
  purchasedMicroUsd: bigint;
};

/** The durable half of a reservation, written in one transaction with its ledger row. */
export type CreditReservationWrite = {
  userId: string;
  walletId: string;
  reservationId: string;
  requestId: string;
  provider: string;
  model: string;
  surface: PaygSurface;
  workflow: string | null;
  split: CreditBucketSplit;
};

/** A ledger row about to be appended. `amountMicroUsd` is signed. */
/**
 * Everything a ledger row carries EXCEPT what it is and how much it moved.
 *
 * Split out so the two variable fields can be composed on rather than
 * `Omit`-ed off. `Omit<CreditLedgerDraft, 'kind' | 'amountMicroUsd'>` reads the
 * same but spells the property names as a string-literal union, which the
 * no-restricted-syntax rule rejects — and which would silently stop matching if
 * either field were ever renamed.
 */
export type CreditLedgerAttribution = {
  userId: string;
  walletId: string;
  grantDeltaMicroUsd: bigint;
  purchasedDeltaMicroUsd: bigint;
  reservationId: string | null;
  requestId: string | null;
  provider: string | null;
  model: string | null;
  surface: string | null;
  workflow: string | null;
  sourceEventId: string | null;
  actorUserId: string | null;
  reason: string | null;
};

/** A complete ledger row: what moved, how much, and everything about it. */
export type CreditLedgerDraft = CreditLedgerAttribution & {
  kind: CreditLedgerKind;
  amountMicroUsd: bigint;
};

/**
 * One wallet update paired with the ledger row that explains it.
 *
 * Always applied together and in order, because `balanceAfterMicroUsd` is
 * filled in from the row the update RETURNS — a running balance computed from a
 * pre-read wallet would be wrong the moment two requests settle at once, and a
 * ledger a customer cannot re-add is not an audit trail.
 */
export type CreditMovementStep = {
  walletUpdate: PrismaUserCreditWalletUpdateInput;
  ledger: CreditLedgerDraft;
};

/** The wallet plus the derived figures every caller needs, computed once. */
export type CreditBalances = {
  wallet: UserCreditWallet;
  availableMicroUsd: bigint;
};

/** What a settlement actually moved, so the caller can decide whether to warn. */
export type CreditSettlement = {
  chargedMicroUsd: bigint;
  refundedMicroUsd: bigint;
  availableAfterMicroUsd: bigint;
  periodGrantMicroUsd: bigint;
};

/**
 * What a top-up reversal actually moved.
 *
 * `shortfallMicroUsd` is the part of the reversal the wallet could NOT cover
 * because the credit had already been spent. It is recorded rather than
 * borrowed: spent credit is consumed irreversibly and is not refundable, and a
 * negative wallet would be the platform lending money to settle a chargeback
 * (ADR-083 edge case E5).
 */
export type CreditTopupReversalOutcome = {
  wallet: UserCreditWallet;
  reversedMicroUsd: bigint;
  shortfallMicroUsd: bigint;
};

/**
 * What the credit inbox did with one `billing.credit.*` envelope.
 *
 * `REVERSAL_CLAMPED` is an APPLIED outcome, not a failure: the reversal landed
 * for everything the wallet still held. Reporting it as failed would make the
 * reconciliation sweep retry a reversal that has already been applied as fully
 * as it ever can be.
 */
export type CreditInboxOutcome =
  | 'APPLIED'
  | 'REVERSAL_CLAMPED'
  | 'DUPLICATE'
  | 'REJECTED_SCHEMA'
  | 'REJECTED_PRODUCER'
  | 'REJECTED_VERSION'
  | 'FAILED';

/** One page of the user-facing ledger. */
export type CreditLedgerPageQuery = {
  userId: string;
  cursor: string | null;
  limit: number;
};

/** An operator adjustment. Both `actorUserId` and `reason` are mandatory. */
export type CreditAdjustmentInput = {
  userId: string;
  amountMicroUsd: bigint;
  reason: string;
  actorUserId: string;
};

/**
 * One page of the account ledger.
 *
 * `nextCursor` is `null` when this is the last page. It is an opaque row id, not
 * an offset: the ledger grows while a user reads it, and an offset would repeat
 * or skip a row every time a request settled mid-scroll.
 */
export type CreditLedgerPage = {
  entries: PaygLedgerEntryView[];
  nextCursor: string | null;
};

/**
 * One calendar month of settled spend, straight off the GROUP BY.
 *
 * `consumedMicroUsd` is already NEGATED into a positive figure by the query.
 * CONSUMPTION rows are written with a negative `amountMicroUsd` (spend leaves
 * the wallet), and an operator panel that renders "-$4.10 consumed" reads as a
 * refund. Both figures arrive as `bigint` because Postgres returns `SUM` and
 * `COUNT` over int8 as int8.
 */
export type CreditMonthConsumptionRow = {
  /** UTC `YYYY-MM`, from `to_char(occurred_at, 'YYYY-MM')`. */
  monthKey: string;
  consumedMicroUsd: bigint;
  entryCount: bigint;
};
