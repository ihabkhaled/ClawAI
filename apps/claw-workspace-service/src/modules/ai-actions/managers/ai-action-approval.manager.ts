import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import type { Prisma } from '../../../generated/prisma';
import { AUTO_DENY_REASON } from '../constants/ai-action-policy.constants';
import { AiActionApprovalQueueRepository } from '../repositories/ai-action-approval-queue.repository';
import { AutomationPreferenceRepository } from '../repositories/automation-preference.repository';
import type {
  EnqueueSuggestionInput,
  EnqueueSuggestionResult,
  PolicyMatchResult,
  PreferenceOutcome,
  RiskAssessment,
} from '../types/ai-action-policy.types';

import { AiActionPolicyMatcherManager } from './ai-action-policy-matcher.manager';
import { AiActionRiskScorerManager } from './ai-action-risk-scorer.manager';
import { AiActionUserRateLimiterManager } from './ai-action-user-rate-limiter.manager';

@Injectable()
export class AiActionApprovalManager {
  private readonly logger = new Logger(AiActionApprovalManager.name);

  constructor(
    private readonly riskScorer: AiActionRiskScorerManager,
    private readonly policyMatcher: AiActionPolicyMatcherManager,
    private readonly queueRepo: AiActionApprovalQueueRepository,
    private readonly preferenceRepo: AutomationPreferenceRepository,
    private readonly rabbitmq: RabbitMQService,
    private readonly userRateLimiter: AiActionUserRateLimiterManager,
  ) {}

  async enqueueSuggestion(input: EnqueueSuggestionInput): Promise<EnqueueSuggestionResult> {
    // v3 round 2 — per-user burst rate limiter (Prompt 12). Runs FIRST so a
    // rate-limited user doesn't pay the cost of risk scoring + policy
    // matching. Returns a synthetic DENIED row so the UI can show the user
    // why their action was dropped.
    const gate = this.userRateLimiter.tryReserve(input.userId);
    if (!gate.allowed) {
      return this.persistRateLimitedRow(input, gate.reason);
    }

    const risk = this.riskScorer.assess(input.draftPayload);
    const policyMatch = await this.policyMatcher.match({
      provider: input.provider,
      actionKind: input.actionKind,
      risk,
    });
    const baseStatus = this.resolveStatus(policyMatch);
    const { status, autoDenyReason } = await this.applyUserPreference(input, risk, baseStatus);
    const expiresAt = this.computeExpiry(status);
    const row = await this.queueRepo.create({
      userId: input.userId,
      connectorId: input.connectorId,
      actionKind: input.actionKind,
      provider: input.provider,
      status,
      draftPayload: input.draftPayload as Prisma.InputJsonValue,
      riskLabel: risk.riskLabel,
      riskScore: risk.riskScore,
      riskReasons: risk.reasons as Prisma.InputJsonValue,
      matchedPolicyId: policyMatch.matchedPolicy?.id ?? null,
      matchedPolicyName: policyMatch.matchedPolicy?.name ?? null,
      generatedBy:
        input.generatedBy === undefined ? undefined : (input.generatedBy as Prisma.InputJsonValue),
      sourceObjectId: input.sourceObjectId ?? null,
      expiresAt,
      rejectionReason: autoDenyReason,
    });
    this.publishLifecycleEvents(row.id, status, input, risk, policyMatch);
    return {
      queueId: row.id,
      status,
      riskScore: risk.riskScore,
      riskLabel: risk.riskLabel,
      matchedPolicyId: row.matchedPolicyId,
      matchedPolicyName: row.matchedPolicyName,
    };
  }

  private resolveStatus(policyMatch: PolicyMatchResult): AiActionQueueStatus {
    if (policyMatch.decision === 'DENIED') return AiActionQueueStatus.DENIED;
    if (policyMatch.decision === 'AUTO_APPROVE') return AiActionQueueStatus.AUTO_APPROVED;
    return AiActionQueueStatus.PENDING_APPROVAL;
  }

  /**
   * Stream 32 + 12.6 + 32.4 — apply user-preference intersection
   * (most-restrictive-wins):
   *  - Policy DENIED stays DENIED (admin policy is the floor).
   *  - User isEnabled=false → DENIED regardless of policy.
   *  - User providers[] non-empty AND input.provider not listed → DENIED (32.4 kill-switch).
   *  - User perDayBudget set AND today's count ≥ budget → DENIED (12.6 budget cap).
   *  - Policy AUTO_APPROVED but user.autoApproveBelowRiskScore < risk.riskScore → downgrade to PENDING_APPROVAL.
   */
  private async applyUserPreference(
    input: EnqueueSuggestionInput,
    risk: RiskAssessment,
    base: AiActionQueueStatus,
  ): Promise<PreferenceOutcome> {
    if (base === AiActionQueueStatus.DENIED) {
      return { status: base, autoDenyReason: null };
    }
    try {
      const pref = await this.preferenceRepo.findOne(input.userId, input.actionKind);
      if (pref === null) {
        return { status: base, autoDenyReason: null };
      }
      if (!pref.isEnabled) {
        this.logger.debug(
          `applyUserPreference: user ${input.userId} disabled ${input.actionKind} → DENIED`,
        );
        return {
          status: AiActionQueueStatus.DENIED,
          autoDenyReason: AUTO_DENY_REASON.USER_DISABLED,
        };
      }
      const providers = Array.isArray(pref.providers) ? (pref.providers as string[]) : [];
      if (providers.length > 0 && input.provider !== null && !providers.includes(input.provider)) {
        this.logger.debug(
          `applyUserPreference: provider ${input.provider} not in user's allowed list ${JSON.stringify(providers)} → DENIED`,
        );
        return {
          status: AiActionQueueStatus.DENIED,
          autoDenyReason: AUTO_DENY_REASON.PROVIDER_DISABLED,
        };
      }
      if (pref.perDayBudget !== null) {
        const todayCount = await this.preferenceRepo.countTodayForBudget(
          input.userId,
          input.actionKind,
        );
        if (todayCount >= pref.perDayBudget) {
          this.logger.debug(
            `applyUserPreference: today's count ${String(todayCount)} >= budget ${String(pref.perDayBudget)} → DENIED`,
          );
          return {
            status: AiActionQueueStatus.DENIED,
            autoDenyReason: AUTO_DENY_REASON.BUDGET_EXCEEDED,
          };
        }
      }
      if (
        base === AiActionQueueStatus.AUTO_APPROVED &&
        pref.autoApproveBelowRiskScore !== null &&
        risk.riskScore > pref.autoApproveBelowRiskScore
      ) {
        this.logger.debug(
          `applyUserPreference: risk ${String(risk.riskScore)} > user threshold ${String(pref.autoApproveBelowRiskScore)} → downgrade to PENDING_APPROVAL`,
        );
        return { status: AiActionQueueStatus.PENDING_APPROVAL, autoDenyReason: null };
      }
      return { status: base, autoDenyReason: null };
    } catch (error) {
      this.logger.warn(
        `applyUserPreference failed — falling back to policy-only status — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return { status: base, autoDenyReason: null };
    }
  }

  private computeExpiry(status: AiActionQueueStatus): Date | null {
    if (status !== AiActionQueueStatus.PENDING_APPROVAL) return null;
    const hours = AppConfig.get().AI_ACTION_QUEUE_EXPIRY_HOURS;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  // v3 round 2 — emit a DENIED row + event when the per-user rate limiter
  // refuses an enqueue. Bypasses risk scoring (we never looked at the
  // payload) and stores a zero risk score with the synthetic reason code.
  private async persistRateLimitedRow(
    input: EnqueueSuggestionInput,
    reason: string,
  ): Promise<EnqueueSuggestionResult> {
    const row = await this.queueRepo.create({
      userId: input.userId,
      connectorId: input.connectorId,
      actionKind: input.actionKind,
      provider: input.provider,
      status: AiActionQueueStatus.DENIED,
      draftPayload: input.draftPayload as Prisma.InputJsonValue,
      riskLabel: AiActionRiskLabel.LOW,
      riskScore: 0,
      riskReasons: [] as unknown as Prisma.InputJsonValue,
      matchedPolicyId: null,
      matchedPolicyName: null,
      generatedBy:
        input.generatedBy === undefined ? undefined : (input.generatedBy as Prisma.InputJsonValue),
      sourceObjectId: input.sourceObjectId ?? null,
      expiresAt: null,
      rejectionReason: AUTO_DENY_REASON.RATE_LIMITED_USER,
    });
    void this.publishOrLog(EventPattern.AI_ACTION_DENIED, {
      queueId: row.id,
      userId: input.userId,
      connectorId: input.connectorId,
      provider: input.provider,
      actionKind: input.actionKind,
      riskScore: 0,
      riskLabel: AiActionRiskLabel.LOW,
      matchedPolicyId: null,
      matchedPolicyName: null,
      sourceObjectId: input.sourceObjectId ?? null,
      reason: AUTO_DENY_REASON.RATE_LIMITED_USER,
      reasonCode: reason,
      occurredAt: new Date().toISOString(),
    });
    this.logger.warn(
      `enqueueSuggestion rate-limited user=${input.userId} reason=${reason} queueId=${row.id}`,
    );
    return {
      queueId: row.id,
      status: AiActionQueueStatus.DENIED,
      riskScore: 0,
      riskLabel: AiActionRiskLabel.LOW,
      matchedPolicyId: null,
      matchedPolicyName: null,
    };
  }

  private publishLifecycleEvents(
    queueId: string,
    status: AiActionQueueStatus,
    input: EnqueueSuggestionInput,
    risk: RiskAssessment,
    policyMatch: PolicyMatchResult,
  ): void {
    const payloadBase = {
      queueId,
      userId: input.userId,
      connectorId: input.connectorId,
      provider: input.provider,
      actionKind: input.actionKind,
      riskScore: risk.riskScore,
      riskLabel: risk.riskLabel,
      matchedPolicyId: policyMatch.matchedPolicy?.id ?? null,
      matchedPolicyName: policyMatch.matchedPolicy?.name ?? null,
      sourceObjectId: input.sourceObjectId ?? null,
      occurredAt: new Date().toISOString(),
    };
    void this.publishOrLog(EventPattern.AI_ACTION_SUGGESTION_CREATED, payloadBase);
    if (status === AiActionQueueStatus.PENDING_APPROVAL) {
      void this.publishOrLog(EventPattern.AI_ACTION_PENDING_APPROVAL, payloadBase);
    }
    if (status === AiActionQueueStatus.AUTO_APPROVED) {
      void this.publishOrLog(EventPattern.AI_ACTION_AUTO_APPROVED, payloadBase);
    }
    if (status === AiActionQueueStatus.DENIED) {
      void this.publishOrLog(EventPattern.AI_ACTION_DENIED, {
        ...payloadBase,
        reasonCode: policyMatch.matchedPolicy?.name ?? 'PII_DETECTED',
      });
    }
  }

  private async publishOrLog(pattern: EventPattern, payload: unknown): Promise<void> {
    try {
      await this.rabbitmq.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(
        `failed to publish ${pattern} — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
