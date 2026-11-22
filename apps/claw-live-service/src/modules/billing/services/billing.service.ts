import { Injectable } from '@nestjs/common';

import { LiveSettleOutcome } from '../../../common/enums/live-settle-outcome.enum';
import type { LiveSessionState } from '../../../generated/prisma';
import { LivePolicyService } from '../../policy/services/live-policy.service';
import { LiveBlockSettlementManager } from '../managers/live-block-settlement.manager';
import { LivePlanResolverManager } from '../managers/live-plan-resolver.manager';
import { LiveBillingRepository } from '../repositories/live-billing.repository';
import type {
  LiveBillableSession,
  LiveSettleOptions,
  LiveSettleResult,
  LiveUsageView,
} from '../types/live-billing.types';
import { liveBlockKey, liveUsageMonth } from '../utilities/live-billing.utility';

/** Hybrid Live billing (architecture doc section 6). The only writer of LiveUsageCharge. */
@Injectable()
export class BillingService {
  constructor(
    private readonly policies: LivePolicyService,
    private readonly plans: LivePlanResolverManager,
    private readonly repository: LiveBillingRepository,
    private readonly settlement: LiveBlockSettlementManager,
  ) {}

  /**
   * Settles `seconds` of delivered AI viewing as the session's next block
   * (60 for a full block, the remainder at per-second proration on close).
   * Idempotent: the block key `live:<sessionId>:<blockIndex>` is unique.
   */
  async settleBlock(
    session: LiveBillableSession,
    seconds: number,
    options: LiveSettleOptions = {},
  ): Promise<LiveSettleResult> {
    if (seconds <= 0) return { outcome: LiveSettleOutcome.SKIPPED, state: session.state };
    const key = liveBlockKey(session.id, session.nextBlockIndex);
    if (await this.repository.findCharge(key)) {
      return { outcome: LiveSettleOutcome.SKIPPED, state: session.state };
    }
    const policy = await this.policies.active();
    const now = new Date();
    return this.settlement.settle(
      { session, blockIndex: session.nextBlockIndex, seconds, key },
      {
        policyVersion: policy.version,
        plan: await this.plans.planPolicy(policy, session.userId),
        graceSeconds: policy.config.graceSeconds,
        month: liveUsageMonth(now),
        now,
        final: options.final === true,
      },
    );
  }

  /** Moves a GRACE session to EXHAUSTED once the grace window has elapsed. */
  async expireGraceIfDue(session: LiveBillableSession): Promise<LiveSessionState> {
    const policy = await this.policies.active();
    return this.settlement.expireGraceIfDue(session, policy.config.graceSeconds, new Date());
  }

  async usage(userId: string): Promise<LiveUsageView> {
    const policy = await this.policies.active();
    const plan = await this.plans.planPolicy(policy, userId);
    const month = liveUsageMonth(new Date());
    const row = await this.repository.findMonth(userId, month);
    return {
      month,
      freeSecondsTotal: plan.freeSecondsPerMonth,
      freeSecondsUsed: Math.min(row?.freeSecondsUsed ?? 0, plan.freeSecondsPerMonth),
      paidMicroUsdPerMinute: plan.paidMicroUsdPerMinute,
      graceSeconds: policy.config.graceSeconds,
      policyVersion: policy.version,
    };
  }
}
