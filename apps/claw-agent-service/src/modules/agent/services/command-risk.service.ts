import { Injectable, Logger } from '@nestjs/common';
import { PolicyKind } from '../../../common/enums/policy-kind.enum';
import { RiskLabel } from '../../../common/enums/risk-label.enum';
import {
  HEURISTIC_BASE_SCORE,
  HEURISTIC_LONG_COMMAND_SCORE,
  HEURISTIC_LONG_COMMAND_THRESHOLD,
  HEURISTIC_MAX_SCORE,
  HEURISTIC_NEGATIVE_FLAG_SCORE,
  HEURISTIC_PRIVILEGED_WRITE_SCORE,
  HEURISTIC_SHELL_CHAIN_SCORE,
  RISK_SCORE_CRITICAL_THRESHOLD,
  RISK_SCORE_HIGH_THRESHOLD,
  RISK_SCORE_MEDIUM_THRESHOLD,
} from '../../../common/constants/policy.constants';
import { compilePolicyPattern } from '../../../common/utilities/policy-regex.utility';
import { PolicyRepository } from '../repositories/policy.repository';
import type { AccessPolicy } from '../../../generated/prisma';
import type { EvaluationAccumulator, RiskAssessment } from '../types/policy.types';

@Injectable()
export class CommandRiskService {
  private readonly logger = new Logger(CommandRiskService.name);

  constructor(private readonly repo: PolicyRepository) {}

  async assess(command: string): Promise<RiskAssessment> {
    const policies = await this.repo.findActive();
    return this.evaluate(command, policies);
  }

  private evaluate(command: string, policies: AccessPolicy[]): RiskAssessment {
    const reasons: string[] = [];
    const baseScore = this.heuristicBaseScore(command, reasons);
    const acc: EvaluationAccumulator = {
      matchedPolicy: null,
      riskScore: baseScore,
      riskLabel: this.labelFromScore(baseScore),
      reasons,
    };
    for (const policy of policies) {
      if (!this.safeMatch(policy.pattern, command)) continue;
      this.applyMatch(acc, policy);
      if ((policy.kind as PolicyKind) === PolicyKind.DENY) break;
    }
    return this.finalize(acc);
  }

  private applyMatch(acc: EvaluationAccumulator, policy: AccessPolicy): void {
    acc.reasons.push(`Policy "${policy.name}" matched (${policy.kind})`);
    acc.matchedPolicy ??= policy;
    if (policy.riskScore > acc.riskScore) acc.riskScore = policy.riskScore;
    const policyLabel = policy.riskLabel as RiskLabel;
    if (this.rankOf(policyLabel) > this.rankOf(acc.riskLabel)) {
      acc.riskLabel = policyLabel;
    }
  }

  private rankOf(label: RiskLabel): number {
    switch (label) {
      case RiskLabel.LOW:
        return 0;
      case RiskLabel.MEDIUM:
        return 1;
      case RiskLabel.HIGH:
        return 2;
      case RiskLabel.CRITICAL:
        return 3;
    }
  }

  private finalize(acc: EvaluationAccumulator): RiskAssessment {
    const matchedKind = acc.matchedPolicy === null ? null : (acc.matchedPolicy.kind as PolicyKind);
    return {
      riskScore: acc.riskScore,
      riskLabel: acc.riskLabel,
      matchedPolicyId: acc.matchedPolicy?.id ?? null,
      matchedPolicyName: acc.matchedPolicy?.name ?? null,
      matchedPolicyKind: matchedKind,
      blockedByPolicy: matchedKind === PolicyKind.DENY,
      autoApproved: matchedKind === PolicyKind.AUTO_APPROVE,
      reasons: acc.reasons,
    };
  }

  private heuristicBaseScore(command: string, reasons: string[]): number {
    let score = HEURISTIC_BASE_SCORE;
    if (/[;&]{1,2}|\|{1,2}|\$\(/.test(command)) {
      score += HEURISTIC_SHELL_CHAIN_SCORE;
      reasons.push('Command chains or subshells detected');
    }
    if (/>\s*\/(etc|boot|usr|var)/.test(command)) {
      score += HEURISTIC_PRIVILEGED_WRITE_SCORE;
      reasons.push('Write to a privileged system path detected');
    }
    if (command.length > HEURISTIC_LONG_COMMAND_THRESHOLD) {
      score += HEURISTIC_LONG_COMMAND_SCORE;
      reasons.push('Very long command string');
    }
    if (/\s--no-[\w-]+/.test(command)) {
      score += HEURISTIC_NEGATIVE_FLAG_SCORE;
      reasons.push('Negative-option flag detected');
    }
    return Math.min(score, HEURISTIC_MAX_SCORE);
  }

  private labelFromScore(score: number): RiskLabel {
    if (score >= RISK_SCORE_CRITICAL_THRESHOLD) return RiskLabel.CRITICAL;
    if (score >= RISK_SCORE_HIGH_THRESHOLD) return RiskLabel.HIGH;
    if (score >= RISK_SCORE_MEDIUM_THRESHOLD) return RiskLabel.MEDIUM;
    return RiskLabel.LOW;
  }

  private safeMatch(pattern: string, command: string): boolean {
    try {
      return compilePolicyPattern(pattern).test(command);
    } catch (error) {
      this.logger.warn(
        `Invalid policy regex "${pattern}": ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return false;
    }
  }
}
