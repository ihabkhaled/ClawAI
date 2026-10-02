import { Injectable, Logger } from '@nestjs/common';
import { PAYG_MIN_VIABLE_OUTPUT_TOKENS } from '@claw/shared-constants';
import { type PaygFreeAllowanceView } from '@claw/shared-types';
import { clampOutputTokensToBalance } from '@claw/shared-utilities';

import { utcMonthKey } from '../../../common/utilities/period-key.utility';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { FREE_ALLOWANCE_TOTAL_COUNTER_KEY } from '../constants/credit-free-allowance.constants';
import { CreditFreeAllowanceRepository } from '../repositories/credit-free-allowance.repository';
import {
  type CreditFreeAllowanceAttempt,
  type CreditFreeAllowanceCounterKey,
  type CreditFreeAllowancePolicy,
  type CreditReserveInput,
  type PaygRateSnapshot,
} from '../types/credit.types';
import { toSafeBalanceNumber } from '../utilities/credit-bucket.utility';
import {
  computeFreeRequestCeilingMicroUsd,
  isCappedAllowance,
  isFreeAllowanceEligible,
  isFreeAllowanceEnabled,
  nextUtcMonthStart,
  toCounterLimit,
  toFreeAllowanceView,
} from '../utilities/credit-free-allowance.utility';

/**
 * The plan's free requests on credit connectors (ADR-142).
 *
 * Owns the policy half (what the plan allows, what one free request may cost, the
 * atomic counter). It never touches the wallet: whether to fall back to the
 * allowance at all, and the reservation record that backs it, belong to
 * `CreditReservationManager`: a CAPPED plan without purchased credit is counted
 * first, everything else stays credit-first (ADR-142 update 2026-10-02).
 */
@Injectable()
export class CreditFreeAllowanceService {
  private readonly logger = new Logger(CreditFreeAllowanceService.name);

  constructor(
    private readonly plans: PlansRepository,
    private readonly counters: CreditFreeAllowanceRepository,
  ) {}

  /**
   * Tries to admit one request on the allowance the caller already resolved.
   *
   * The counter is taken LAST, after every check that can say no without a write,
   * so a refused request never burns a slot. A caller that then fails to record
   * the admission must call {@link giveBack}.
   *
   * `rate` is `null` when the metering kill switch is off: nothing is priced then,
   * so the call is only COUNTED (no per-request ceiling clamp) and the provider
   * gets the ceiling it asked for. The plan's cap still holds (ADR-142 update).
   */
  async tryAdmit(
    input: CreditReserveInput,
    rate: PaygRateSnapshot | null,
    allowance: CreditFreeAllowancePolicy,
    now: Date,
  ): Promise<CreditFreeAllowanceAttempt> {
    if (!isFreeAllowanceEligible(input)) {
      return { status: 'INELIGIBLE' };
    }
    const ceiling = rate === null ? null : this.clampToCeiling(input, rate, allowance);
    if (ceiling !== null && ceiling.status !== 'AFFORDABLE') {
      this.logger.warn(
        `tryAdmit: ${ceiling.status} against the free-request ceiling provider=${input.provider}`,
      );
      return { status: 'PROMPT_TOO_LARGE' };
    }
    const counter: CreditFreeAllowanceCounterKey = {
      userId: input.userId,
      provider: FREE_ALLOWANCE_TOTAL_COUNTER_KEY,
      periodKey: utcMonthKey(now),
    };
    const limit = toCounterLimit(allowance.limit);
    if (!(await this.counters.tryConsume(counter, limit))) {
      this.logger.log(`tryAdmit: allowance spent (total) provider=${input.provider}`);
      return { status: 'SPENT', limit };
    }
    return {
      status: 'ADMITTED',
      admission:
        ceiling === null
          ? {
              counter,
              maxOutputTokens: input.requestedMaxOutputTokens,
              clamped: false,
              worstCaseCostMicroUsd: 0n,
            }
          : {
              counter,
              maxOutputTokens: ceiling.maxOutputTokens,
              clamped: ceiling.clamped,
              worstCaseCostMicroUsd: BigInt(ceiling.worstCaseCostMicroUsd),
            },
    };
  }

  private clampToCeiling(
    input: CreditReserveInput,
    rate: PaygRateSnapshot,
    allowance: CreditFreeAllowancePolicy,
  ): ReturnType<typeof clampOutputTokensToBalance> {
    return clampOutputTokensToBalance({
      rates: rate.rates,
      balanceMicroUsd: toSafeBalanceNumber(allowance.requestCeilingMicroUsd),
      promptTokens: input.promptTokens,
      cachedPromptTokens: input.cachedPromptTokens,
      requestedMaxOutputTokens: input.requestedMaxOutputTokens,
      minViableOutputTokens: PAYG_MIN_VIABLE_OUTPUT_TOKENS,
    });
  }

  /**
   * Gives a taken slot back. Idempotence is the caller's job (the release row
   * count). The slot always lives on the user's TOTAL counter, whatever provider
   * the released call used.
   */
  async giveBack(counter: CreditFreeAllowanceCounterKey): Promise<void> {
    await this.counters.giveBack({ ...counter, provider: FREE_ALLOWANCE_TOTAL_COUNTER_KEY });
  }

  /**
   * The user's free credit-model requests for the current UTC month, for
   * `GET /credit/me`: ONE total across every credit connector. `null` when the
   * plan gives none. With metering off only a CAPPED allowance is enforced (an
   * unlimited one is plain unmetered use), so only that is shown.
   */
  async getView(
    userId: string,
    now: Date,
    meteringEnabled: boolean,
  ): Promise<PaygFreeAllowanceView | null> {
    const allowance = await this.resolvePolicy(userId);
    if (allowance === null || (!meteringEnabled && !isCappedAllowance(allowance))) {
      return null;
    }
    const used = await this.counters.findTotalUsed(userId, utcMonthKey(now));
    return toFreeAllowanceView(allowance.limit, used, nextUtcMonthStart(now));
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
