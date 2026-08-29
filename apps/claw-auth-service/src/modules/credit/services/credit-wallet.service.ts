import { Injectable, Logger } from '@nestjs/common';
import { type PaygWalletSnapshot } from '@claw/shared-types';

import { EntityNotFoundException } from '../../../common/errors';
import { CreditLedgerKind, type UserCreditWallet } from '../../../generated/prisma';
import { CreditWalletRepository } from '../repositories/credit-wallet.repository';
import {
  type CreditBalances,
  type CreditBucketSplit,
  type CreditLedgerAttribution,
  type CreditMovementStep,
  type CreditReservationWrite,
  type CreditSettlement,
  type CreditTopupReversalOutcome,
} from '../types/credit.types';
import {
  availableMicroUsd,
  splitDebitAcrossBuckets,
  splitRefundAcrossBuckets,
} from '../utilities/credit-bucket.utility';
import { currentGrantPeriodKey, nextGrantResetAt } from '../utilities/credit-period.utility';
import { toWalletSnapshot } from '../utilities/credit-view.utility';

/**
 * The durable half of the wallet: every balance change and the ledger row that
 * explains it, always in one transaction.
 *
 * This service owns NO policy. It does not decide whether a request is metered,
 * what a model costs, or whether a user may spend — those belong to
 * `CreditReservationManager`. It only guarantees that whatever is decided lands
 * atomically and keeps `wallet == SUM(ledger)` true.
 *
 * A balance is never logged next to a user id above debug level. A support log
 * that pairs the two is a list of who is worth targeting.
 */
@Injectable()
export class CreditWalletService {
  private readonly logger = new Logger(CreditWalletService.name);

  constructor(private readonly wallets: CreditWalletRepository) {}

  async ensure(userId: string): Promise<UserCreditWallet> {
    const now = new Date();
    return this.wallets.ensure({
      userId,
      periodKey: currentGrantPeriodKey(now),
      grantResetsAt: nextGrantResetAt(now),
    });
  }

  async getBalances(userId: string): Promise<CreditBalances> {
    const wallet = await this.ensure(userId);
    return {
      wallet,
      availableMicroUsd: availableMicroUsd(
        wallet.grantMicroUsd,
        wallet.purchasedMicroUsd,
        wallet.reservedMicroUsd,
      ),
    };
  }

  async getSnapshot(
    userId: string,
    flags: { adminBypass: boolean; meteringEnabled: boolean },
  ): Promise<PaygWalletSnapshot> {
    this.logger.debug(`getSnapshot: user=${userId}`);
    return toWalletSnapshot(await this.ensure(userId), flags);
  }

  /**
   * Takes a hold: `reserved` grows, the buckets do NOT move.
   *
   * The RESERVATION row carries a negative `amountMicroUsd` and ZERO bucket
   * deltas, which is what keeps both ledger identities true at once —
   * `grant == SUM(grantDelta)` stays exact while an open hold shows up as
   * exactly `-reserved` in `SUM(amountMicroUsd)`. Debiting the buckets here
   * instead would make every reconciliation a second, compensating row.
   */
  async applyHold(write: CreditReservationWrite): Promise<UserCreditWallet> {
    const held = write.split.grantMicroUsd + write.split.purchasedMicroUsd;
    this.logger.debug(`applyHold: reservation=${write.reservationId}`);
    return this.commit(write.walletId, [
      {
        walletUpdate: { reservedMicroUsd: { increment: held } },
        ledger: {
          ...CreditWalletService.baseLedger(write.userId, write.walletId),
          kind: CreditLedgerKind.RESERVATION,
          amountMicroUsd: -held,
          reservationId: write.reservationId,
          requestId: write.requestId,
          provider: write.provider,
          model: write.model,
          surface: write.surface,
          workflow: write.workflow,
        },
      },
    ]);
  }

  /**
   * Gives a hold back in full.
   *
   * The refund split is capped by what each bucket lent, so a full release
   * reproduces the original split exactly. Returning a grant-funded hold as
   * PURCHASED would mint permanent credit out of an allowance that was due to
   * expire.
   */
  async applyRelease(params: {
    userId: string;
    walletId: string;
    reservationId: string;
    held: CreditBucketSplit;
    kind: CreditLedgerKind;
    reason: string | null;
  }): Promise<UserCreditWallet> {
    const held = params.held.grantMicroUsd + params.held.purchasedMicroUsd;
    this.logger.debug(`applyRelease: reservation=${params.reservationId}`);
    return this.commit(params.walletId, [
      {
        walletUpdate: { reservedMicroUsd: { decrement: held } },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: params.kind,
          amountMicroUsd: held,
          grantDeltaMicroUsd: 0n,
          purchasedDeltaMicroUsd: 0n,
          reservationId: params.reservationId,
          reason: params.reason,
        },
      },
    ]);
  }

  /**
   * Settles a hold: the whole hold is returned and the buckets then pay the
   * ACTUAL cost.
   *
   * TWO ledger rows, deliberately, and in this order. A single CONSUMPTION row
   * would leave the RESERVATION's negative `amountMicroUsd` uncancelled, and
   * the identity `available == SUM(amountMicroUsd)` — the one that makes an
   * open hold auditable — would drift by the size of every settled hold. Making
   * the reconciliation explicit is also what lets a customer read their own
   * ledger and see "we held $0.05, we charged $0.03" rather than a single
   * number they have to take on trust.
   *
   * The charge is split GRANT first, capped by what the hold reserved from each
   * bucket, so a settlement can never reach past its own hold into money a
   * concurrent request is relying on.
   */
  async applySettlement(params: {
    userId: string;
    walletId: string;
    reservationId: string;
    held: CreditBucketSplit;
    actualMicroUsd: bigint;
    provider: string;
    model: string;
    surface: string | null;
    workflow: string | null;
  }): Promise<CreditSettlement> {
    const heldTotal = params.held.grantMicroUsd + params.held.purchasedMicroUsd;
    const charge = params.actualMicroUsd < heldTotal ? params.actualMicroUsd : heldTotal;
    const split = splitDebitAcrossBuckets(
      charge,
      params.held.grantMicroUsd,
      params.held.purchasedMicroUsd,
    );
    const wallet = await this.commit(params.walletId, [
      CreditWalletService.holdReturnStep(params.userId, params.walletId, {
        reservationId: params.reservationId,
        heldTotal,
      }),
      CreditWalletService.consumptionStep(params, split, charge),
    ]);
    return CreditWalletService.toSettlement(wallet, charge, heldTotal - charge);
  }

  /**
   * Adds money to one bucket — a plan grant, a paid top-up, or an operator
   * credit.
   *
   * `sourceEventId` is the idempotency key for money arriving from outside auth
   * -service. It is UNIQUE in the database, so a redelivered top-up event is
   * refused by Postgres rather than by a check two consumers can race.
   */
  async applyCredit(params: {
    userId: string;
    walletId: string;
    amountMicroUsd: bigint;
    kind: CreditLedgerKind;
    toGrant: boolean;
    sourceEventId: string | null;
    actorUserId: string | null;
    reason: string | null;
  }): Promise<UserCreditWallet> {
    const amount = params.amountMicroUsd;
    this.logger.log(`applyCredit: kind=${params.kind} user=${params.userId}`);
    return this.commit(params.walletId, [
      {
        walletUpdate: params.toGrant
          ? {
              grantMicroUsd: { increment: amount },
              lifetimeGrantedMicroUsd: { increment: amount },
            }
          : {
              purchasedMicroUsd: { increment: amount },
              lifetimePurchasedMicroUsd: { increment: amount },
            },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: params.kind,
          amountMicroUsd: amount,
          grantDeltaMicroUsd: params.toGrant ? amount : 0n,
          purchasedDeltaMicroUsd: params.toGrant ? 0n : amount,
          sourceEventId: params.sourceEventId,
          actorUserId: params.actorUserId,
          reason: params.reason,
        },
      },
    ]);
  }

  /**
   * Removes money — a grant sweep at the period roll, a charged-back top-up, or
   * an operator correction.
   *
   * Refunds and reversals take PURCHASED first; a grant sweep names its bucket
   * explicitly. Never drives a bucket negative: the split caps at what is there,
   * and a shortfall is reported rather than borrowed.
   */
  async applyDebit(params: {
    userId: string;
    walletId: string;
    amountMicroUsd: bigint;
    kind: CreditLedgerKind;
    grantOnly: boolean;
    sourceEventId: string | null;
    actorUserId: string | null;
    reason: string | null;
  }): Promise<UserCreditWallet> {
    const wallet = await this.requireWallet(params.walletId, params.userId);
    const split = params.grantOnly
      ? {
          grantMicroUsd: CreditWalletService.cap(params.amountMicroUsd, wallet.grantMicroUsd),
          purchasedMicroUsd: 0n,
        }
      : splitRefundAcrossBuckets(
          params.amountMicroUsd,
          wallet.purchasedMicroUsd,
          wallet.grantMicroUsd,
        );
    const total = split.grantMicroUsd + split.purchasedMicroUsd;
    this.logger.log(`applyDebit: kind=${params.kind} user=${params.userId}`);
    return this.commit(params.walletId, [
      {
        walletUpdate: {
          grantMicroUsd: { decrement: split.grantMicroUsd },
          purchasedMicroUsd: { decrement: split.purchasedMicroUsd },
        },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: params.kind,
          amountMicroUsd: -total,
          grantDeltaMicroUsd: -split.grantMicroUsd,
          purchasedDeltaMicroUsd: -split.purchasedMicroUsd,
          sourceEventId: params.sourceEventId,
          actorUserId: params.actorUserId,
          reason: params.reason,
        },
      },
    ]);
  }

  /**
   * Reverses a refunded or charged-back top-up against the PURCHASED bucket
   * ONLY, clamped to what is left.
   *
   * Three deliberate choices, each of which would be a real loss if made the
   * other way:
   *
   * 1. **PURCHASED only.** `applyDebit` falls through to GRANT once PURCHASED
   *    runs out, which is right for an operator correction and wrong here: the
   *    plan allowance was never part of this purchase, and taking it would
   *    punish a customer for a chargeback with credit they are separately
   *    entitled to.
   * 2. **Clamped, never negative.** Spent credit is consumed irreversibly and
   *    is not refundable. A negative wallet would be the platform lending money
   *    to settle a dispute, and the next request would spend a balance that
   *    does not exist.
   * 3. **The shortfall is RECORDED, not lost.** It goes on the ledger row's
   *    reason, so "we clawed back less than was refunded" is answerable months
   *    later without re-deriving it from a payment ledger in another service.
   *
   * A zero-coverage reversal still writes a ledger row. "Nothing was reclaimed"
   * is a fact worth having; an absent row is indistinguishable from an event
   * that never arrived.
   */
  async applyTopupReversal(params: {
    userId: string;
    walletId: string;
    amountMicroUsd: bigint;
    sourceEventId: string;
    reason: string;
  }): Promise<CreditTopupReversalOutcome> {
    const wallet = await this.requireWallet(params.walletId, params.userId);
    const wanted = params.amountMicroUsd > 0n ? params.amountMicroUsd : 0n;
    const reversed = CreditWalletService.cap(wanted, wallet.purchasedMicroUsd);
    const shortfall = wanted - reversed;
    this.logger.warn(`applyTopupReversal: user=${params.userId} clamped=${String(shortfall > 0n)}`);
    const updated = await this.commit(params.walletId, [
      {
        walletUpdate: { purchasedMicroUsd: { decrement: reversed } },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: CreditLedgerKind.TOPUP_REVERSAL,
          amountMicroUsd: -reversed,
          purchasedDeltaMicroUsd: -reversed,
          sourceEventId: params.sourceEventId,
          reason:
            shortfall > 0n
              ? `${params.reason} (unreclaimable ${shortfall.toString()} micro-USD already spent)`
              : params.reason,
        },
      },
    ]);
    return { wallet: updated, reversedMicroUsd: reversed, shortfallMicroUsd: shortfall };
  }

  /** Sweeps the unused grant and credits the new period in ONE transaction. */
  async applyPeriodRoll(params: {
    userId: string;
    walletId: string;
    expiringMicroUsd: bigint;
    newGrantMicroUsd: bigint;
    periodKey: string;
    grantResetsAt: Date;
  }): Promise<UserCreditWallet> {
    this.logger.log(`applyPeriodRoll: user=${params.userId} period=${params.periodKey}`);
    return this.commit(params.walletId, [
      ...CreditWalletService.expiryStep(params),
      ...CreditWalletService.grantStep(params),
    ]);
  }

  async sumLedger(userId: string): Promise<{ grantMicroUsd: bigint; purchasedMicroUsd: bigint }> {
    return this.wallets.sumLedgerDeltas(userId);
  }

  async findBySourceEventId(sourceEventId: string): Promise<boolean> {
    return (await this.wallets.findLedgerEntryBySourceEventId(sourceEventId)) !== null;
  }

  private async commit(
    walletId: string,
    steps: readonly CreditMovementStep[],
  ): Promise<UserCreditWallet> {
    const updated = await this.wallets.applyMovements(walletId, steps);
    if (updated === null) {
      // Only reachable from an EMPTY movement sequence, which is a caller bug.
      // Surfaced as not-found rather than swallowed: a balance change that
      // silently did nothing is the one outcome this class must never produce.
      throw new EntityNotFoundException('CreditWallet', walletId);
    }
    return updated;
  }

  private async requireWallet(walletId: string, userId: string): Promise<UserCreditWallet> {
    const wallet = await this.wallets.findByUserId(userId);
    if (wallet?.id !== walletId) {
      throw new EntityNotFoundException('CreditWallet', walletId);
    }
    return wallet;
  }

  private static cap(amount: bigint, ceiling: bigint): bigint {
    const wanted = amount > 0n ? amount : 0n;
    const cap = ceiling > 0n ? ceiling : 0n;
    return wanted < cap ? wanted : cap;
  }

  private static baseLedger(userId: string, walletId: string): CreditLedgerAttribution {
    return {
      userId,
      walletId,
      grantDeltaMicroUsd: 0n,
      purchasedDeltaMicroUsd: 0n,
      reservationId: null,
      requestId: null,
      provider: null,
      model: null,
      surface: null,
      workflow: null,
      sourceEventId: null,
      actorUserId: null,
      reason: null,
    };
  }

  /**
   * Returns the hold. Written as its own RESERVATION_RELEASE row rather than
   * folded into the CONSUMPTION so the ledger keeps summing to the balance.
   */
  private static holdReturnStep(
    userId: string,
    walletId: string,
    params: { reservationId: string; heldTotal: bigint },
  ): CreditMovementStep {
    return {
      walletUpdate: { reservedMicroUsd: { decrement: params.heldTotal } },
      ledger: {
        ...CreditWalletService.baseLedger(userId, walletId),
        kind: CreditLedgerKind.RESERVATION_RELEASE,
        amountMicroUsd: params.heldTotal,
        reservationId: params.reservationId,
        reason: 'Hold reconciled at settlement',
      },
    };
  }

  private static consumptionStep(
    params: {
      userId: string;
      walletId: string;
      reservationId: string;
      provider: string;
      model: string;
      surface: string | null;
      workflow: string | null;
    },
    split: CreditBucketSplit,
    charge: bigint,
  ): CreditMovementStep {
    return {
      walletUpdate: {
        grantMicroUsd: { decrement: split.grantMicroUsd },
        purchasedMicroUsd: { decrement: split.purchasedMicroUsd },
        lifetimeConsumedMicroUsd: { increment: charge },
      },
      ledger: {
        ...CreditWalletService.baseLedger(params.userId, params.walletId),
        kind: CreditLedgerKind.CONSUMPTION,
        amountMicroUsd: -charge,
        grantDeltaMicroUsd: -split.grantMicroUsd,
        purchasedDeltaMicroUsd: -split.purchasedMicroUsd,
        reservationId: params.reservationId,
        provider: params.provider,
        model: params.model,
        surface: params.surface,
        workflow: params.workflow,
      },
    };
  }

  private static expiryStep(params: {
    userId: string;
    walletId: string;
    expiringMicroUsd: bigint;
  }): CreditMovementStep[] {
    if (params.expiringMicroUsd <= 0n) {
      return [];
    }
    return [
      {
        walletUpdate: { grantMicroUsd: { decrement: params.expiringMicroUsd } },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: CreditLedgerKind.GRANT_EXPIRY,
          amountMicroUsd: -params.expiringMicroUsd,
          grantDeltaMicroUsd: -params.expiringMicroUsd,
          reason: 'Unused plan allowance swept at the period roll',
        },
      },
    ];
  }

  private static grantStep(params: {
    userId: string;
    walletId: string;
    newGrantMicroUsd: bigint;
    periodKey: string;
    grantResetsAt: Date;
  }): CreditMovementStep[] {
    return [
      {
        walletUpdate: {
          grantMicroUsd: { increment: params.newGrantMicroUsd },
          lifetimeGrantedMicroUsd: { increment: params.newGrantMicroUsd },
          periodGrantMicroUsd: params.newGrantMicroUsd,
          periodKey: params.periodKey,
          grantResetsAt: params.grantResetsAt,
        },
        ledger: {
          ...CreditWalletService.baseLedger(params.userId, params.walletId),
          kind: CreditLedgerKind.PLAN_GRANT,
          amountMicroUsd: params.newGrantMicroUsd,
          grantDeltaMicroUsd: params.newGrantMicroUsd,
          reason: `Plan allowance for ${params.periodKey}`,
        },
      },
    ];
  }

  private static toSettlement(
    wallet: UserCreditWallet,
    charged: bigint,
    refunded: bigint,
  ): CreditSettlement {
    return {
      chargedMicroUsd: charged,
      refundedMicroUsd: refunded,
      availableAfterMicroUsd: availableMicroUsd(
        wallet.grantMicroUsd,
        wallet.purchasedMicroUsd,
        wallet.reservedMicroUsd,
      ),
      periodGrantMicroUsd: wallet.periodGrantMicroUsd,
    };
  }
}
