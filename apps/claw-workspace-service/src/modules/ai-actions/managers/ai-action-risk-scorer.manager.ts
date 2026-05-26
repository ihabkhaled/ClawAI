import { Injectable, Logger } from '@nestjs/common';

import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import { compilePolicyPattern } from '../../../common/utilities/policy-regex.utility';
import {
  HEURISTIC_BASE_SCORE,
  HEURISTIC_EXTERNAL_DOMAIN_SCORE,
  HEURISTIC_HTML_BODY_SCORE,
  HEURISTIC_LONG_BODY_SCORE,
  HEURISTIC_LONG_BODY_THRESHOLD,
  HEURISTIC_MAX_SCORE,
  PII_PATTERNS,
  RISK_SCORE_CRITICAL_THRESHOLD,
  RISK_SCORE_HIGH_THRESHOLD,
  RISK_SCORE_MEDIUM_THRESHOLD,
} from '../constants/ai-action-policy.constants';
import type { RiskAssessment } from '../types/ai-action-policy.types';

@Injectable()
export class AiActionRiskScorerManager {
  private readonly logger = new Logger(AiActionRiskScorerManager.name);

  assess(payload: Record<string, unknown>): RiskAssessment {
    const reasons: string[] = [];
    const body = this.extractTextBody(payload);
    let score = HEURISTIC_BASE_SCORE;

    score = this.applyPiiChecks(body, score, reasons);
    score = this.applyExternalDomainCheck(payload, score, reasons);
    score = this.applyBodyLengthCheck(body, score, reasons);
    score = this.applyHtmlCheck(body, score, reasons);

    const finalScore = Math.min(score, HEURISTIC_MAX_SCORE);
    return {
      riskScore: finalScore,
      riskLabel: this.labelFromScore(finalScore),
      reasons,
    };
  }

  private extractTextBody(payload: Record<string, unknown>): string {
    const candidate = payload['body'] ?? payload['content'] ?? payload['text'];
    return typeof candidate === 'string' ? candidate : JSON.stringify(payload);
  }

  private applyPiiChecks(body: string, score: number, reasons: string[]): number {
    let acc = score;
    for (const def of PII_PATTERNS) {
      try {
        const re = compilePolicyPattern(def.pattern);
        if (re.test(body)) {
          acc += def.score;
          reasons.push(`PII pattern matched: ${def.name}`);
        }
      } catch (error) {
        this.logger.warn(
          `risk-scorer: pii pattern ${def.name} failed to compile — ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }
    return acc;
  }

  private applyExternalDomainCheck(
    payload: Record<string, unknown>,
    score: number,
    reasons: string[],
  ): number {
    const target = this.extractTargetEmail(payload);
    if (target === null) return score;
    if (!this.looksInternal(target)) {
      reasons.push(`Target recipient is external: ${target}`);
      return score + HEURISTIC_EXTERNAL_DOMAIN_SCORE;
    }
    return score;
  }

  private extractTargetEmail(payload: Record<string, unknown>): string | null {
    const direct = payload['to'] ?? payload['recipient'] ?? payload['emailTo'];
    if (typeof direct === 'string' && direct.includes('@')) return direct;
    if (Array.isArray(direct) && direct.length > 0 && typeof direct[0] === 'string') {
      return direct[0];
    }
    return null;
  }

  private looksInternal(email: string): boolean {
    const lower = email.toLowerCase();
    const configuredHost = (process.env['CLAW_HOSTNAME'] ?? 'claw.local').toLowerCase();
    const internalSuffixes = [`@${configuredHost}`, '@claw.local', '@claw.ai', '@internal'];
    return internalSuffixes.some((suffix) => lower.endsWith(suffix));
  }

  private applyBodyLengthCheck(body: string, score: number, reasons: string[]): number {
    if (body.length > HEURISTIC_LONG_BODY_THRESHOLD) {
      reasons.push(`Body length ${String(body.length)} exceeds ${String(HEURISTIC_LONG_BODY_THRESHOLD)}`);
      return score + HEURISTIC_LONG_BODY_SCORE;
    }
    return score;
  }

  private applyHtmlCheck(body: string, score: number, reasons: string[]): number {
    if (/<\w+[\s>]/.test(body)) {
      reasons.push('Body contains HTML tags');
      return score + HEURISTIC_HTML_BODY_SCORE;
    }
    return score;
  }

  private labelFromScore(score: number): AiActionRiskLabel {
    if (score >= RISK_SCORE_CRITICAL_THRESHOLD) return AiActionRiskLabel.CRITICAL;
    if (score >= RISK_SCORE_HIGH_THRESHOLD) return AiActionRiskLabel.HIGH;
    if (score >= RISK_SCORE_MEDIUM_THRESHOLD) return AiActionRiskLabel.MEDIUM;
    return AiActionRiskLabel.LOW;
  }
}
