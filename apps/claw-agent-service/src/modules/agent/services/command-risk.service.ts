import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CapabilityBlastRadius } from '../../../common/enums/capability-blast-radius.enum';
import { CapabilityClass } from '../../../common/enums/capability-class.enum';
import { CapabilityInvocationStatus } from '../../../common/enums/capability-invocation-status.enum';
import { CapabilityOperation } from '../../../common/enums/capability-operation.enum';
import { CapabilityReversibility } from '../../../common/enums/capability-reversibility.enum';
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
import {
  CAPABILITY_DUAL_WRITE_FLAG_ENV,
  DUAL_WRITE_COMMAND_PREVIEW_LENGTH,
} from '../../../common/constants/capability.constants';
import { compilePolicyPattern } from '../../../common/utilities/policy-regex.utility';
import { CapabilityDualWriteMetricsService } from './capability-dual-write-metrics.service';
import { CapabilityRiskService } from './capability-risk.service';
import { PolicyRepository } from '../repositories/policy.repository';
import type { AccessPolicy } from '../../../generated/prisma';
import type { EvaluationAccumulator, RiskAssessment } from '../types/policy.types';

@Injectable()
export class CommandRiskService implements OnModuleInit {
  private readonly logger = new Logger(CommandRiskService.name);

  constructor(
    private readonly repo: PolicyRepository,
    private readonly capabilityRiskService: CapabilityRiskService,
    private readonly metrics: CapabilityDualWriteMetricsService,
  ) {}

  onModuleInit(): void {
    if (this.dualWriteEnabled()) {
      this.logger.warn(
        `[deprecation] ${CAPABILITY_DUAL_WRITE_FLAG_ENV}=true — legacy CommandRiskService dual-writes to CapabilityRiskService for soak. Monitor GET /api/v1/agent/capability/dual-write-status; flip to false once retirementReady=true on every replica for 7 consecutive days. See docs/15-ai-context/desktop-agent-dual-write-retirement.md.`,
      );
    } else {
      this.logger.log(
        `[deprecation] ${CAPABILITY_DUAL_WRITE_FLAG_ENV}=false — legacy dual-write retired; capability framework is authoritative.`,
      );
    }
  }

  async assess(command: string): Promise<RiskAssessment> {
    const policies = await this.repo.findActive();
    const legacyResult = this.evaluate(command, policies);
    if (this.dualWriteEnabled()) {
      // Fire-and-forget parallel call; never block the legacy path on
      // capability service errors. Divergence is logged for soak.
      void this.compareAgainstCapabilityPath(command, legacyResult);
    }
    return legacyResult;
  }

  private legacyToCapabilityStatus(legacy: RiskAssessment): CapabilityInvocationStatus {
    if (legacy.blockedByPolicy) {
      return CapabilityInvocationStatus.DENIED;
    }
    if (legacy.autoApproved) {
      return CapabilityInvocationStatus.AUTO_APPROVED;
    }
    return CapabilityInvocationStatus.PENDING_APPROVAL;
  }

  private dualWriteEnabled(): boolean {
    const entry = Object.entries(process.env).find(([k]) => k === CAPABILITY_DUAL_WRITE_FLAG_ENV);
    const raw = entry?.[1];
    if (raw === undefined || raw === '') {
      return true; // default-on per CLAUDE.md
    }
    return raw.toLowerCase() !== 'false';
  }

  private async compareAgainstCapabilityPath(
    command: string,
    legacy: RiskAssessment,
  ): Promise<void> {
    const commandPreview = command.slice(0, DUAL_WRITE_COMMAND_PREVIEW_LENGTH);
    try {
      const capabilityResult = await this.capabilityRiskService.assess({
        capabilityClass: CapabilityClass.TERMINAL,
        capabilityOperation: CapabilityOperation.SPAWN,
        targetDescriptor: { command },
        payload: {},
        blastRadius: CapabilityBlastRadius.USER_SCOPE,
        reversibility: CapabilityReversibility.IRREVERSIBLE,
        userId: 'dual-write-comparison',
        deviceId: 'dual-write-comparison',
      });
      this.metrics.recordDecision({
        commandPreview,
        legacyDecision: this.legacyToCapabilityStatus(legacy),
        capabilityDecision: capabilityResult.status,
        legacyPolicyName: legacy.matchedPolicyName ?? null,
        capabilityPolicyName: capabilityResult.matchedPolicyName ?? null,
      });
    } catch (error) {
      this.metrics.recordCapabilityPathError(
        commandPreview,
        error instanceof Error ? error.message : 'unknown',
      );
    }
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
