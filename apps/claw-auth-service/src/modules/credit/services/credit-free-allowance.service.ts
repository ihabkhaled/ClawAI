import { Injectable, Logger } from '@nestjs/common';
import { PAYG_MIN_VIABLE_OUTPUT_TOKENS } from '@claw/shared-constants';
import { type PaygFreeAllowanceView } from '@claw/shared-types';
import { clampOutputTokensToBalance } from '@claw/shared-utilities';

import { utcMonthKey } from '../../../common/utilities/period-key.utility';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { ConnectorPolicyClient } from '../clients/connector-policy.client';
import { CreditFreeAllowanceRepository } from '../repositories/credit-free-allowance.repository';
import {
  type CreditFreeAllowanceAdmission,
  type CreditFreeAllowanceCounterKey,
  type CreditFreeAllowancePolicy,
  type CreditReserveInput,
  type PaygRateSnapshot,
} from '../types/credit.types';
import { toSafeBalanceNumber } from '../utilities/credit-bucket.utility';
import {
  computeFreeRequestCeilingMicroUsd,
  isFreeAllowanceEligible,
  isFreeAllowanceEnabled,
  normalizeAllowanceProvider,
  toCounterLimit,
  toFreeAllowanceView,
} from '../utilities/credit-free-allowance.utility';
import { isMeteredProvider } from '../utilities/payg-classification.utility';

/**
 * The plan's free requests on credit connectors (ADR-142).
 *
 * Owns the policy half (what the plan allows, what one free request may cost, the
 * atomic counter). It never touches the wallet: whether to fall back to the
 * allowance at all, and the reservation record that backs it, belong to
 * `CreditReservationManager`, which keeps the order credit-first.
 */
@Injectable()
export class CreditFreeAllowanceService {
  private readonly logger = new Logger(CreditFreeAllowanceService.name);

  constructor(
    private readonly plans: PlansRepository,
    private readonly counters: CreditFreeAllowanceRepository,
    private readonly policy: ConnectorPolicyClient,
  ) {}

  /**
   * Tries to admit one request on the allowance. Returns `null` when it cannot:
   * not an eligible (token-priced) surface, the plan gives none, the clamp finds
   * the per-request ceiling too small for this prompt, or the month's slots on
   * this provider are spent.
   *
   * The counter is taken LAST, after every check that can say no without a write,
   * so a refused request never burns a slot. A caller that then fails to record
   * the admission must call {@link giveBack}.
   */
  async tryAdmit(
    input: CreditReserveInput,
    rate: PaygRateSnapshot,
    now: Date,
  ): Promise<CreditFreeAllowanceAdmission | null> {
    if (!isFreeAllowanceEligible(input)) {
      return null;
    }
    const allowance = await this.resolvePolicy(input.userId);
    if (allowance === null) {
      return null;
    }
    const clamp = clampOutputTokensToBalance({
      rates: rate.rates,
      balanceMicroUsd: toSafeBalanceNumber(allowance.requestCeilingMicroUsd),
      promptTokens: input.promptTokens,
      cachedPromptTokens: input.cachedPromptTokens,
      requestedMaxOutputTokens: input.requestedMaxOutputTokens,
      minViableOutputTokens: PAYG_MIN_VIABLE_OUTPUT_TOKENS,
    });
    if (clamp.status !== 'AFFORDABLE') {
      this.logger.warn(
        `tryAdmit: ${clamp.status} against the free-request ceiling provider=${input.provider}`,
      );
      return null;
    }
    const counter: CreditFreeAllowanceCounterKey = {
      userId: input.userId,
      provider: normalizeAllowanceProvider(input.provider),
      periodKey: utcMonthKey(now),
    };
    if (!(await this.counters.tryConsume(counter, toCounterLimit(allowance.limit)))) {
      this.logger.log(`tryAdmit: allowance spent provider=${counter.provider}`);
      return null;
    }
    return {
      counter,
      maxOutputTokens: clamp.maxOutputTokens,
      clamped: clamp.clamped,
      worstCaseCostMicroUsd: BigInt(clamp.worstCaseCostMicroUsd),
    };
  }

  /** Gives a taken slot back. Idempotence is the caller's job (the release row count). */
  async giveBack(counter: CreditFreeAllowanceCounterKey): Promise<void> {
    await this.counters.giveBack({
      ...counter,
      provider: normalizeAllowanceProvider(counter.provider),
    });
  }

  /**
   * The user's allowance per credit connector for the current UTC month, for
   * `GET /credit/me`. Empty when the plan gives none. Only providers the
   * connector policy meters are listed: an exempt local provider has no allowance
   * to show because it never needed one.
   */
  async getViews(userId: string, now: Date): Promise<PaygFreeAllowanceView[]> {
    const allowance = await this.resolvePolicy(userId);
    if (allowance === null) {
      return [];
    }
    const policyMap = await this.policy.getPolicy();
    const providers = Object.keys(policyMap)
      .filter((provider) =>
        isMeteredProvider(provider, policyMap, ConnectorPolicyClient.defaultForProvider(provider)),
      )
      .map((provider) => normalizeAllowanceProvider(provider));
    const used = new Map(
      (await this.counters.findForUserPeriod(userId, utcMonthKey(now))).map((row) => [
        normalizeAllowanceProvider(row.provider),
        row.usedCount,
      ]),
    );
    return [...new Set(providers)]
      .sort()
      .map((provider) => toFreeAllowanceView(provider, allowance.limit, used.get(provider) ?? 0));
  }

  /** The plan's allowance for a user, or `null` when it is disabled or there is no plan. */
  async resolvePolicy(userId: string): Promise<CreditFreeAllowancePolicy | null> {
    const plan =
      (await this.plans.findEffectiveForUser(userId, new Date())) ??
      (await this.plans.findDefault());
    if (plan === null || !isFreeAllowanceEnabled(plan.creditConnectorFreeRequestsPerMonth)) {
      return null;
    }
    return {
      limit: plan.creditConnectorFreeRequestsPerMonth,
      requestCeilingMicroUsd: computeFreeRequestCeilingMicroUsd(
        plan.monthlyProviderCostCeilingMicroUsd,
        plan.creditConnectorFreeRequestsPerMonth,
      ),
    };
  }
}
