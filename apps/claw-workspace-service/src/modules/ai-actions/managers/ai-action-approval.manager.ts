import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
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

@Injectable()
export class AiActionApprovalManager {
  private readonly logger = new Logger(AiActionApprovalManager.name);

  constructor(
    private readonly riskScorer: AiActionRiskScorerManager,
    private readonly policyMatcher: AiActionPolicyMatcherManager,
    private readonly queueRepo: AiActionApprovalQueueRepository,
    private readonly preferenceRepo: AutomationPreferenceRepository,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async enqueueSuggestion(input: EnqueueSuggestionInput): Promise<EnqueueSuggestionResult> {
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
