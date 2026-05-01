import { Injectable, Logger } from '@nestjs/common';

import { AiActionPolicyKind } from '../../../common/enums/ai-action-policy-kind.enum';
import type { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import { compilePolicyPattern } from '../../../common/utilities/policy-regex.utility';
import { RISK_LEVEL_ORDER } from '../constants/ai-action-policy.constants';
import { AiActionPolicyRepository } from '../repositories/ai-action-policy.repository';
import type {
  AiActionPolicySnapshot,
  PolicyMatchResult,
  RiskAssessment,
} from '../types/ai-action-policy.types';
import type { AiActionPolicy } from '../../../generated/prisma';

@Injectable()
export class AiActionPolicyMatcherManager {
  private readonly logger = new Logger(AiActionPolicyMatcherManager.name);

  constructor(private readonly repo: AiActionPolicyRepository) {}

  async match(input: {
    provider: string | null;
    actionKind: string;
    risk: RiskAssessment;
  }): Promise<PolicyMatchResult> {
    const policies = await this.repo.findActive();
    return this.evaluate(policies, input);
  }

  private evaluate(
    policies: AiActionPolicy[],
    input: { provider: string | null; actionKind: string; risk: RiskAssessment },
  ): PolicyMatchResult {
    let firstAllow: AiActionPolicySnapshot | null = null;
    let firstAutoApprove: AiActionPolicySnapshot | null = null;
    for (const policy of policies) {
      if (!this.fieldMatches(policy.providerRegex, input.provider ?? '')) continue;
      if (!this.fieldMatches(policy.actionKindRegex, input.actionKind)) continue;
      if (policy.kind === AiActionPolicyKind.DENY) {
        return this.deniedResult(this.toSnapshot(policy));
      }
      if (
        policy.kind === AiActionPolicyKind.AUTO_APPROVE &&
        this.riskWithinPolicy(input.risk, policy)
      ) {
        firstAutoApprove ??= this.toSnapshot(policy);
      }
      if (policy.kind === AiActionPolicyKind.ALLOW) {
        firstAllow ??= this.toSnapshot(policy);
      }
    }
    return this.combineMatches(firstAutoApprove, firstAllow);
  }

  private combineMatches(
    autoApprove: AiActionPolicySnapshot | null,
    allow: AiActionPolicySnapshot | null,
  ): PolicyMatchResult {
    if (autoApprove !== null) {
      return {
        matchedPolicy: autoApprove,
        effectiveKind: AiActionPolicyKind.AUTO_APPROVE,
        decision: 'AUTO_APPROVE',
      };
    }
    return {
      matchedPolicy: allow,
      effectiveKind: allow === null ? null : AiActionPolicyKind.ALLOW,
      decision: 'PENDING_APPROVAL',
    };
  }

  private deniedResult(snapshot: AiActionPolicySnapshot): PolicyMatchResult {
    return {
      matchedPolicy: snapshot,
      effectiveKind: AiActionPolicyKind.DENY,
      decision: 'DENIED',
    };
  }

  private riskWithinPolicy(risk: RiskAssessment, policy: AiActionPolicy): boolean {
    const riskLabelOrder = RISK_LEVEL_ORDER[risk.riskLabel];
    const policyLabelOrder = RISK_LEVEL_ORDER[policy.riskMaxLabel as AiActionRiskLabel];
    if (riskLabelOrder > policyLabelOrder) return false;
    return risk.riskScore <= policy.riskMaxScore;
  }

  private fieldMatches(regexSource: string, candidate: string): boolean {
    try {
      return compilePolicyPattern(regexSource).test(candidate);
    } catch (error) {
      this.logger.warn(
        `policy-matcher: bad regex "${regexSource}" — ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return false;
    }
  }

  private toSnapshot(policy: AiActionPolicy): AiActionPolicySnapshot {
    return {
      id: policy.id,
      name: policy.name,
      kind: policy.kind as AiActionPolicyKind,
      description: policy.description,
      providerRegex: policy.providerRegex,
      actionKindRegex: policy.actionKindRegex,
      riskMaxLabel: policy.riskMaxLabel as AiActionRiskLabel,
      riskMaxScore: policy.riskMaxScore,
      priority: policy.priority,
      requireReason: policy.requireReason,
      isActive: policy.isActive,
      isSystemDefault: policy.isSystemDefault,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}
