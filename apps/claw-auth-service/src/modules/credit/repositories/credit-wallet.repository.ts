import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type CreditLedgerEntry, type UserCreditWallet } from '../../../generated/prisma';
import { type CreditMovementStep } from '../types/credit.types';
import { availableMicroUsd } from '../utilities/credit-bucket.utility';

/**
 * The wallet's data access, including the transactional pairing that makes the
 * ledger trustworthy.
 *
 * Every balance mutation goes through {@link applyMovements}: the wallet update
 * and its ledger row are written in ONE `$transaction`, so there is no window
 * in which a balance has moved and no row explains why. A partial write here is
 * not a glitch — it is a balance that no longer sums to its ledger, which is
 * the one property the whole feature rests on.
 *
 * Repositories never throw. A caller that needs a wallet to exist calls
 * {@link ensure} first, and reads the `null` this class returns rather than
 * being handed an exception to interpret.
 */
@Injectable()
export class CreditWalletRepository {
  private readonly logger = new Logger(CreditWalletRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserCreditWallet | null> {
    this.logger.debug(`findByUserId: user=${userId}`);
    return this.prisma.userCreditWallet.findUnique({ where: { userId } });
  }

  /**
   * Creates the wallet if it is missing, otherwise returns the existing row.
   *
   * `upsert` with an empty `update` rather than find-then-create: two concurrent
   * first requests from the same user would both see "no wallet" and both
   * insert, and the unique index would turn one of them into a 500 on the money
   * path. An empty update makes the second one a harmless no-op.
   */
  async ensure(params: {
    userId: string;
    periodKey: string;
    grantResetsAt: Date;
  }): Promise<UserCreditWallet> {
    this.logger.debug(`ensure: user=${params.userId} period=${params.periodKey}`);
    return this.prisma.userCreditWallet.upsert({
      where: { userId: params.userId },
      update: {},
      create: {
        userId: params.userId,
        periodKey: params.periodKey,
        grantResetsAt: params.grantResetsAt,
      },
    });
  }

  /**
   * A sequence of balance movements and their ledger rows, atomically.
   *
   * Every mutation on this table goes through here, and both halves of each
   * step land in ONE transaction — there is no window in which a balance has
   * moved and no row explains why. A partial write is not a glitch; it is a
   * balance that no longer sums to its ledger, which is the one property the
   * whole feature rests on.
   *
   * `balanceAfterMicroUsd` is taken from the row the UPDATE returns rather than
   * computed from a pre-read wallet, so the running balance stays exact even
   * when two requests settle at the same instant.
   *
   * Wallet columns move by RELATIVE `increment`, never by an absolute value, so
   * concurrent settlements cannot overwrite each other with a stale read —
   * which is also why the model has no `version` column to fight over.
   *
   * Takes a sequence rather than a single step because the period roll must
   * sweep the unused grant AND credit the new one as one event: a crash between
   * them would either bank an allowance meant to expire or take one away
   * without replacing it.
   */
  async applyMovements(
    walletId: string,
    steps: readonly CreditMovementStep[],
  ): Promise<UserCreditWallet | null> {
    this.logger.debug(`applyMovements: wallet=${walletId} steps=${String(steps.length)}`);
    return this.prisma.$transaction(async (tx) => {
      // `null` only survives an EMPTY sequence, which is a caller bug rather
      // than a runtime condition. Returning it beats throwing from a repository.
      let current: UserCreditWallet | null = null;
      for (const step of steps) {
        current = await tx.userCreditWallet.update({
          where: { id: walletId },
          data: step.walletUpdate,
        });
        const applied = current;
        await tx.creditLedgerEntry.create({
          data: {
            ...step.ledger,
            balanceAfterMicroUsd: availableMicroUsd(
              applied.grantMicroUsd,
              applied.purchasedMicroUsd,
              applied.reservedMicroUsd,
            ),
          },
        });
      }
      return current;
    });
  }

  /**
   * Wallets whose stored period no longer matches the current one.
   *
   * Driven by a MISMATCH rather than by a timestamp comparison so a renewal run
   * that was missed entirely — a node down over a month boundary — still
   * self-heals on the next tick instead of skipping the period forever.
   */
  async findStalePeriodWallets(
    currentPeriodKey: string,
    take: number,
  ): Promise<UserCreditWallet[]> {
    this.logger.debug(`findStalePeriodWallets: period=${currentPeriodKey}`);
    return this.prisma.userCreditWallet.findMany({
      where: { periodKey: { not: currentPeriodKey } },
      orderBy: { updatedAt: 'asc' },
      take,
    });
  }

  /**
   * The audit query behind "the wallet equals the sum of its ledger".
   *
   * Returns the ledger totals, not the wallet's own columns, so a caller can
   * compare the two and detect drift instead of reading the same number twice.
   */
  async sumLedgerDeltas(userId: string): Promise<{
    grantMicroUsd: bigint;
    purchasedMicroUsd: bigint;
    amountMicroUsd: bigint;
  }> {
    const result = await this.prisma.creditLedgerEntry.aggregate({
      where: { userId },
      _sum: {
        grantDeltaMicroUsd: true,
        purchasedDeltaMicroUsd: true,
        amountMicroUsd: true,
      },
    });
    return {
      grantMicroUsd: result._sum.grantDeltaMicroUsd ?? 0n,
      purchasedMicroUsd: result._sum.purchasedDeltaMicroUsd ?? 0n,
      amountMicroUsd: result._sum.amountMicroUsd ?? 0n,
    };
  }

  async findLedgerEntryBySourceEventId(sourceEventId: string): Promise<CreditLedgerEntry | null> {
    this.logger.debug('findLedgerEntryBySourceEventId: checking top-up idempotency');
    return this.prisma.creditLedgerEntry.findUnique({ where: { sourceEventId } });
  }
}
