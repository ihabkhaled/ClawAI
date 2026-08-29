import { Injectable, Logger } from '@nestjs/common';

import { BillingIntervalKind, type UserCreditWallet } from '../../../generated/prisma';
import { PlanBillingRepository } from '../../plans/repositories/plan-billing.repository';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { CreditWalletRepository } from '../repositories/credit-wallet.repository';
import { CreditEventService } from './credit-event.service';
import { CreditWalletService } from './credit-wallet.service';
import { type CreditBalances } from '../types/credit.types';
import { availableMicroUsd } from '../utilities/credit-bucket.utility';
import { creditFromPayment } from '../utilities/credit-conversion.utility';
import { currentGrantPeriodKey, nextGrantResetAt } from '../utilities/credit-period.utility';
import { CREDIT_GRANT_RENEWAL_BATCH_SIZE } from '../constants/credit.constants';

/**
 * Owns the perishable half of the wallet: what a plan grants each period, and
 * what happens to whatever is left when the period ends.
 *
 * The allowance is a SHARE OF WHAT THE USER PAYS:
 * `activeMonthlyPrice.amountMinor × Plan.paygCreditPercentBps / 10000`
 * (ADR-078, amended). Pay $20 on a 30% plan and $6 becomes connector credit.
 *
 * Derived, never stored. An absolute per-plan credit column would be a second
 * number tracking the price, and the two drift the first time somebody reprices
 * a plan and forgets the other column — which is exactly how a customer ends up
 * reading "$6.00 credit, $5.40 left" and being refused at $4.00 by a different
 * subsystem.
 *
 * `monthlyProviderCostCeilingMicroUsd` is NOT this number. It is the fair-use
 * bound on total weighted spend across every provider, local included, and a
 * PAYG reservation deliberately passes `null` for it so a user who bought
 * credit can actually spend it.
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
    private readonly planBilling: PlanBillingRepository,
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
   * `monthlyPrice × bps / 10000`, read from the ACTIVE immutable price version
   * so a repricing carries the grant with it and nobody has to remember a second
   * column.
   *
   * The monthly price is the basis even for a yearly subscriber. Their yearly
   * rate is ten months of it (two months free), so this grants them the same
   * credit per month as a monthly subscriber on the same plan rather than
   * penalising them for paying up front — a discount on the subscription is not
   * meant to be a discount on the allowance.
   *
   * A plan with no active monthly price, or a price of zero, grants nothing:
   * thirty percent of nothing is nothing. Logged with the slug, because the fix
   * is an operator publishing a price, not code inventing one.
   */
  async resolvePeriodGrant(userId: string): Promise<bigint> {
    const plan =
      (await this.plans.findEffectiveForUser(userId, new Date())) ??
      (await this.plans.findDefault());
    if (plan === null) {
      this.logger.warn(`resolvePeriodGrant: no plan resolved for user=${userId}`);
      return 0n;
    }
    const price = await this.planBilling.findActivePrice(plan.id, BillingIntervalKind.MONTHLY);
    if (price === null || price.amountMinor <= 0) {
      this.logger.log(
        `resolvePeriodGrant: plan ${plan.slug} has no priced monthly version — no PAYG grant`,
      );
      return 0n;
    }
    return creditFromPayment(price.amountMinor, plan.paygCreditPercentBps);
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
