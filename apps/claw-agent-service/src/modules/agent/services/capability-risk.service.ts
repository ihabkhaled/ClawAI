import { Injectable, Logger } from '@nestjs/common';

import {
  RISK_LABEL_THRESHOLDS,
  RISK_NEW_DEVICE_AGE_DAYS_THRESHOLD,
  RISK_NEW_USER_THIS_CLASS_COUNT_THRESHOLD,
  RISK_WEIGHT_BLAST_SYSTEM,
  RISK_WEIGHT_BLAST_USER_OR_EXTERNAL,
  RISK_WEIGHT_NEW_DEVICE,
  RISK_WEIGHT_NEW_USER_THIS_CLASS,
  RISK_WEIGHT_PER_PII_PATTERN,
  RISK_WEIGHT_PER_SECRET_PATTERN,
  RISK_WEIGHT_REVERSIBILITY_COMPENSATABLE,
  RISK_WEIGHT_REVERSIBILITY_IRREVERSIBLE,
} from '../../../common/constants/capability.constants';
import { CapabilityBlastRadius } from '../../../common/enums/capability-blast-radius.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { CapabilityReversibility } from '../../../common/enums/capability-reversibility.enum';
import { PolicyKind } from '../../../common/enums/policy-kind.enum';
import { RiskLabel } from '../../../common/enums/risk-label.enum';
import { matchesCapabilityTarget } from '../../../common/utilities/policy-target-matcher.utility';
import { PolicyRepository } from '../repositories/policy.repository';
import type { AccessPolicy } from '../../../generated/prisma';
import type {
  RiskAssessmentInput,
  RiskAssessmentResult,
} from '../types/capability.types';

/**
 * Stream 10 — generalised risk + policy engine for ALL capability
 * classes. Mirrors `CommandRiskService` for back-compat: when invoked
 * with capabilityClass=TERMINAL the heuristics + policy match produce
 * the same outputs as the legacy service for the same fixture set.
 *
 * Method ceiling: 50 lines per public method, 80 lines per private
 * helper (per agent-service CLAUDE.md).
 */
@Injectable()
export class CapabilityRiskService {
  private readonly logger = new Logger(CapabilityRiskService.name);

  // Secret-pattern regex set — credit cards / common API keys / JWTs /
  // SSH private key headers. Kept here (not in policy table) so it
  // applies uniformly regardless of which policy matches.
  private static readonly SECRET_PATTERNS: ReadonlyArray<RegExp> = [
    /AKIA[0-9A-Z]{16}/, // AWS access key
    /sk_live_[0-9a-zA-Z]{24,}/, // Stripe live secret
    /ghp_[0-9a-zA-Z]{20,}/, // GitHub PAT
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/, // PEM private key block
    /xox[abp]-[0-9a-zA-Z-]{20,}/, // Slack token
  ];

  private static readonly PII_PATTERNS: ReadonlyArray<RegExp> = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b(?:\d[ -]*?){13,16}\b/, // Credit card-ish
  ];

  constructor(private readonly policyRepo: PolicyRepository) {}

  async assess(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
    const orgIds = input.orgIds ?? [];
    const policies = await this.policyRepo.findActiveForCapabilityClass(
      input.capabilityClass,
      orgIds,
    );
    return this.evaluate(input, policies);
  }

  private evaluate(
    input: RiskAssessmentInput,
    policies: AccessPolicy[],
  ): RiskAssessmentResult {
    const reasons: string[] = [];
    const baseScore = this.computeHeuristicRiskScore(input, reasons);
    const matched = this.matchFirstPolicy(input, policies, reasons);
    const finalScore = this.combineScore(baseScore, matched);
    const finalLabel = this.labelFromScore(finalScore);
    const status = this.decideStatus(matched, finalScore);
    return {
      riskScore: finalScore,
      riskLabel: finalLabel,
      matchedPolicyId: matched?.id ?? null,
      matchedPolicyName: matched?.name ?? null,
      status,
      reasons,
    };
  }

  /**
   * Heuristic 0–100 — per-capability adjustments using blast radius,
   * reversibility, secret/PII detection on stringified payload, and
   * device/user familiarity.
   */
  private computeHeuristicRiskScore(
    input: RiskAssessmentInput,
    reasons: string[],
  ): number {
    let score = 5; // base
    if (input.blastRadius === CapabilityBlastRadius.SYSTEM_SCOPE) {
      score += RISK_WEIGHT_BLAST_SYSTEM;
      reasons.push('blast=SYSTEM_SCOPE');
    } else if (
      input.blastRadius === CapabilityBlastRadius.USER_SCOPE ||
      input.blastRadius === CapabilityBlastRadius.EXTERNAL
    ) {
      score += RISK_WEIGHT_BLAST_USER_OR_EXTERNAL;
      reasons.push(`blast=${input.blastRadius}`);
    }
    if (input.reversibility === CapabilityReversibility.IRREVERSIBLE) {
      score += RISK_WEIGHT_REVERSIBILITY_IRREVERSIBLE;
      reasons.push('reversibility=IRREVERSIBLE');
    } else if (input.reversibility === CapabilityReversibility.COMPENSATABLE) {
      score += RISK_WEIGHT_REVERSIBILITY_COMPENSATABLE;
      reasons.push('reversibility=COMPENSATABLE');
    }
    const haystack = `${JSON.stringify(input.targetDescriptor)}${JSON.stringify(input.payload)}`;
    score += this.scanPatterns(
      haystack,
      CapabilityRiskService.SECRET_PATTERNS,
      RISK_WEIGHT_PER_SECRET_PATTERN,
      reasons,
      'secret_pattern',
    );
    score += this.scanPatterns(
      haystack,
      CapabilityRiskService.PII_PATTERNS,
      RISK_WEIGHT_PER_PII_PATTERN,
      reasons,
      'pii_pattern',
    );
    if (
      input.deviceAgeDays !== undefined &&
      input.deviceAgeDays < RISK_NEW_DEVICE_AGE_DAYS_THRESHOLD
    ) {
      score += RISK_WEIGHT_NEW_DEVICE;
      reasons.push('device<7d');
    }
    if (
      input.userInvocationsThisClassCount !== undefined &&
      input.userInvocationsThisClassCount < RISK_NEW_USER_THIS_CLASS_COUNT_THRESHOLD
    ) {
      score += RISK_WEIGHT_NEW_USER_THIS_CLASS;
      reasons.push('user_new_to_class');
    }
    return Math.min(score, 100);
  }

  private scanPatterns(
    haystack: string,
    patterns: ReadonlyArray<RegExp>,
    weight: number,
    reasons: string[],
    label: string,
  ): number {
    let extra = 0;
    for (const re of patterns) {
      if (re.test(haystack)) {
        extra += weight;
        reasons.push(label);
      }
    }
    return extra;
  }

  /**
   * Walks active policies in priority desc.
   *
   * Precedence: DENY (short-circuits) → AUTO_APPROVE (preferred over
   * ALLOW because it's the stricter, more specific signal — only fires
   * for subsets the operator pre-approved) → ALLOW (informational; falls
   * through to PENDING_APPROVAL with the policy's risk score).
   */
  private matchFirstPolicy(
    input: RiskAssessmentInput,
    policies: AccessPolicy[],
    reasons: string[],
  ): AccessPolicy | null {
    let firstAutoApprove: AccessPolicy | null = null;
    let firstAllow: AccessPolicy | null = null;
    for (const policy of policies) {
      if (!this.targetMatches(policy, input)) {
        continue;
      }
      reasons.push(`policy:${policy.name}:${policy.kind}`);
      if (policy.kind === PolicyKind.DENY) {
        return policy;
      }
      if (policy.kind === PolicyKind.AUTO_APPROVE && firstAutoApprove === null) {
        firstAutoApprove = policy;
      } else if (policy.kind === PolicyKind.ALLOW && firstAllow === null) {
        firstAllow = policy;
      }
    }
    return firstAutoApprove ?? firstAllow;
  }

  private targetMatches(policy: AccessPolicy, input: RiskAssessmentInput): boolean {
    // capabilityClass must match (or null = legacy/global)
    if (
      policy.capabilityClass !== null &&
      String(policy.capabilityClass) !== String(input.capabilityClass)
    ) {
      return false;
    }
    // capabilityOperation must match if set
    if (
      policy.capabilityOperation !== null &&
      String(policy.capabilityOperation) !== String(input.capabilityOperation)
    ) {
      return false;
    }
    // structured target matcher (per-class json)
    if (policy.targetMatcherJson !== null && policy.targetMatcherJson !== undefined) {
      const matcher = policy.targetMatcherJson as Record<string, unknown>;
      if (!matchesCapabilityTarget(matcher, input)) {
        return false;
      }
    }
    return true;
  }

  private combineScore(baseScore: number, matched: AccessPolicy | null): number {
    if (matched === null) {
      return baseScore;
    }
    return Math.max(baseScore, matched.riskScore);
  }

  private labelFromScore(score: number): RiskLabel {
    if (score <= RISK_LABEL_THRESHOLDS.LOW_MAX) return RiskLabel.LOW;
    if (score <= RISK_LABEL_THRESHOLDS.MEDIUM_MAX) return RiskLabel.MEDIUM;
    if (score <= RISK_LABEL_THRESHOLDS.HIGH_MAX) return RiskLabel.HIGH;
    return RiskLabel.CRITICAL;
  }

  private decideStatus(
    matched: AccessPolicy | null,
    score: number,
  ): CapabilityInvocationStatus {
    if (matched === null) {
      return CapabilityInvocationStatus.PENDING_APPROVAL;
    }
    if (matched.kind === PolicyKind.DENY) {
      return CapabilityInvocationStatus.DENIED;
    }
    if (matched.kind === PolicyKind.AUTO_APPROVE) {
      const cap = matched.autoApproveMaxRiskScore;
      if (cap !== null && cap !== undefined && score > cap) {
        this.logger.debug(
          `Auto-approve policy "${matched.name}" matched but riskScore=${String(score)} > cap=${String(cap)}; downgrading to PENDING_APPROVAL`,
        );
        return CapabilityInvocationStatus.PENDING_APPROVAL;
      }
      return CapabilityInvocationStatus.AUTO_APPROVED;
    }
    return CapabilityInvocationStatus.PENDING_APPROVAL;
  }
}
