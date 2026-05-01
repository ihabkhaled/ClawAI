import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import type { Prisma } from '../../../generated/prisma';
import { AiActionApprovalQueueRepository } from '../repositories/ai-action-approval-queue.repository';
import { AutomationPreferenceRepository } from '../repositories/automation-preference.repository';
import type {
  EnqueueSuggestionInput,
  EnqueueSuggestionResult,
  PolicyMatchResult,
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
    const status = await this.applyUserPreference(input, risk, baseStatus);
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
        input.generatedBy === undefined
          ? undefined
          : (input.generatedBy as Prisma.InputJsonValue),
      sourceObjectId: input.sourceObjectId ?? null,
      expiresAt,
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
   * Stream 32 — apply user-preference intersection (most-restrictive-wins):
   *  - Policy DENIED stays DENIED (admin policy is the floor).
   *  - User isEnabled=false → DENIED regardless of policy.
   *  - Policy AUTO_APPROVED but user.autoApproveBelowRiskScore < risk.riskScore → downgrade to PENDING_APPROVAL.
   */
  private async applyUserPreference(
    input: EnqueueSuggestionInput,
    risk: RiskAssessment,
    base: AiActionQueueStatus,
  ): Promise<AiActionQueueStatus> {
    if (base === AiActionQueueStatus.DENIED) {
      return base;
    }
    try {
      const pref = await this.preferenceRepo.findOne(input.userId, input.actionKind);
      if (pref === null) {
        return base;
      }
      if (!pref.isEnabled) {
        this.logger.debug(
          `applyUserPreference: user ${input.userId} disabled ${input.actionKind} → DENIED`,
        );
        return AiActionQueueStatus.DENIED;
      }
      if (
        base === AiActionQueueStatus.AUTO_APPROVED &&
        pref.autoApproveBelowRiskScore !== null &&
        risk.riskScore > pref.autoApproveBelowRiskScore
      ) {
        this.logger.debug(
          `applyUserPreference: risk ${String(risk.riskScore)} > user threshold ${String(pref.autoApproveBelowRiskScore)} → downgrade to PENDING_APPROVAL`,
        );
        return AiActionQueueStatus.PENDING_APPROVAL;
      }
      return base;
    } catch (error) {
      this.logger.warn(
        `applyUserPreference failed — falling back to policy-only status — ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return base;
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
