import { Injectable, Logger } from '@nestjs/common';

import { type UserCreditWallet } from '../../../generated/prisma';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { CreditWalletRepository } from '../repositories/credit-wallet.repository';
import { CreditEventService } from './credit-event.service';
import { CreditWalletService } from './credit-wallet.service';
import { type CreditBalances } from '../types/credit.types';
import { availableMicroUsd } from '../utilities/credit-bucket.utility';
import { currentGrantPeriodKey, nextGrantResetAt } from '../utilities/credit-period.utility';
import { CREDIT_GRANT_RENEWAL_BATCH_SIZE } from '../constants/credit.constants';

/**
 * Owns the perishable half of the wallet: what a plan grants each period, and
 * what happens to whatever is left when the period ends.
 *
 * The allowance IS `Plan.monthlyProviderCostCeilingMicroUsd` — the same dollars
 * the platform already enforced as a hidden margin control, now visible to the
 * user (ADR-078). There is deliberately no second column: a third name for one
 * number is how a customer ends up reading "$1.50 credit, $1.20 left" and being
 * refused at $0.75 by a different subsystem.
 *
 * Unused grant does NOT roll over. The sweep is written as its own
 * GRANT_EXPIRY ledger row rather than a silent overwrite, so the balance still
 * sums to the ledger across a period boundary.
 */
@Injectable()
export class CreditGrantService {
  private readonly logger = new Logger(CreditGrantService.name);

  constructor(
    private readonly wallets: CreditWalletService,
    private readonly walletRepository: CreditWalletRepository,
    private readonly plans: PlansRepository,
    private readonly events: CreditEventService,
  ) {}

  /**
   * Brings one wallet up to date and returns its balances.
   *
   * Called on the reservation path, not only from the scheduler. A user who
   * signs up — or whose period rolls — one minute before their next message
   * must not be told they have no credit until a background job happens to run.
   * The scheduler remains the backstop for users who are not making requests,
   * so the balance on their billing page is right too.
   */
  async ensureCurrentPeriod(userId: string): Promise<CreditBalances> {
    const wallet = await this.wallets.ensure(userId);
    const now = new Date();
    const periodKey = currentGrantPeriodKey(now);
    const needsRoll = wallet.periodKey !== periodKey || CreditGrantService.isUngranted(wallet);
    if (!needsRoll) {
      return CreditGrantService.toBalances(wallet);
    }
    return CreditGrantService.toBalances(await this.roll(wallet, periodKey, now));
  }

  /**
   * The scheduled backstop. Bounded per tick; whatever is left is picked up on
   * the next one, because the work is idempotent by construction — a wallet
   * whose period already matches is not selected.
   */
  async renewStalePeriods(): Promise<number> {
    const now = new Date();
    const periodKey = currentGrantPeriodKey(now);
    const stale = await this.walletRepository.findStalePeriodWallets(
      periodKey,
      CREDIT_GRANT_RENEWAL_BATCH_SIZE,
    );
    this.logger.log(`renewStalePeriods: period=${periodKey} candidates=${String(stale.length)}`);
    let renewed = 0;
    for (const wallet of stale) {
      await this.roll(wallet, periodKey, now);
      renewed += 1;
    }
    return renewed;
  }

  /**
   * What this user's plan grants per period, in integer micro-USD.
   *
   * A `null` ceiling means the plan declares NO provider-cost limit. That is
   * read as "no PAYG allowance" rather than "unlimited", because a wallet
   * column cannot express infinity and guessing a large number would invent a
   * price nobody approved. It is logged loudly with the plan slug: the fix is
   * an operator setting a ceiling, not code picking one.
   */
  async resolvePeriodGrant(userId: string): Promise<bigint> {
    const plan =
      (await this.plans.findEffectiveForUser(userId, new Date())) ??
      (await this.plans.findDefault());
    if (plan === null) {
      this.logger.warn(`resolvePeriodGrant: no plan resolved for user=${userId}`);
      return 0n;
    }
    if (plan.monthlyProviderCostCeilingMicroUsd === null) {
      this.logger.warn(
        `resolvePeriodGrant: plan ${plan.slug} has no monthlyProviderCostCeilingMicroUsd — its users receive no PAYG grant`,
      );
      return 0n;
    }
    return plan.monthlyProviderCostCeilingMicroUsd;
  }

  private async roll(
    wallet: UserCreditWallet,
    periodKey: string,
    now: Date,
  ): Promise<UserCreditWallet> {
    const newGrant = await this.resolvePeriodGrant(wallet.userId);
    this.logger.log(`roll: user=${wallet.userId} period=${periodKey}`);
    const rolled = await this.wallets.applyPeriodRoll({
      userId: wallet.userId,
      walletId: wallet.id,
      expiringMicroUsd: wallet.grantMicroUsd,
      newGrantMicroUsd: newGrant,
      periodKey,
      grantResetsAt: nextGrantResetAt(now),
    });
    // Fire-and-forget, and deliberately AFTER the transaction: an event that
    // announced a grant the database had not committed would be a lie the
    // audit trail could not support.
    void this.events.publishGrantRenewed(wallet.userId, periodKey, newGrant);
    return rolled;
  }

  /**
   * A wallet that has never been granted anything.
   *
   * Distinguished from "granted and fully spent" by `lifetimeGrantedMicroUsd`,
   * which is monotonic — using the current balance would re-grant every time a
   * user hit zero, which is an unlimited plan by accident.
   */
  private static isUngranted(wallet: UserCreditWallet): boolean {
    return wallet.lifetimeGrantedMicroUsd === 0n && wallet.periodGrantMicroUsd === 0n;
  }

  private static toBalances(wallet: UserCreditWallet): CreditBalances {
    return {
      wallet,
      availableMicroUsd: availableMicroUsd(
        wallet.grantMicroUsd,
        wallet.purchasedMicroUsd,
        wallet.reservedMicroUsd,
      ),
    };
  }
}
