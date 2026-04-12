import { Injectable, Logger } from '@nestjs/common';

import {
  MIN_WORDS_FOR_REPETITION_CHECK,
  QUALITY_SCORE_PENALTIES,
  QUALITY_THRESHOLDS,
} from '../constants/quality-thresholds.constants';
import type { QualityCheckResult, ReRoutingDecision } from '../types/quality-check.types';

@Injectable()
export class QualityCheckManager {
  private readonly logger = new Logger(QualityCheckManager.name);

  checkResponseQuality(content: string, userPrompt: string): QualityCheckResult {
    const reasons: string[] = [];
    let score = 1.0;

    score = this.checkLength(content, reasons, score);
    score = this.checkWordCount(content, reasons, score);
    score = this.checkErrorPatterns(content, reasons, score);
    score = this.checkRepetition(content, reasons, score);
    score = this.checkEchoResponse(content, userPrompt, reasons, score);

    score = Math.max(0, Math.min(1, score));

    const result: QualityCheckResult = {
      isWeak: score < QUALITY_THRESHOLDS.WEAK_SCORE_THRESHOLD,
      reasons,
      score,
    };

    this.logger.debug(
      `checkResponseQuality: score=${String(score.toFixed(2))} isWeak=${String(result.isWeak)} reasons=[${reasons.join(', ')}]`,
    );

    return result;
  }

  shouldReRoute(qualityResult: QualityCheckResult, attemptCount: number): ReRoutingDecision {
    if (!qualityResult.isWeak) {
      return this.buildDecision(false, 'quality_acceptable', qualityResult.score);
    }

    if (attemptCount >= QUALITY_THRESHOLDS.MAX_REROUTE_ATTEMPTS) {
      this.logger.warn(
        `shouldReRoute: max re-route attempts (${String(attemptCount)}) reached — accepting weak response`,
      );
      return this.buildDecision(false, 'max_attempts_reached', qualityResult.score);
    }

    this.logger.log(
      `shouldReRoute: recommending re-route — score=${String(qualityResult.score.toFixed(2))} reasons=[${qualityResult.reasons.join(', ')}]`,
    );

    return this.buildDecision(true, qualityResult.reasons.join(', '), qualityResult.score);
  }

  private checkLength(content: string, reasons: string[], score: number): number {
    if (content.length < QUALITY_THRESHOLDS.MIN_RESPONSE_LENGTH) {
      reasons.push('response_too_short');
      return score - QUALITY_SCORE_PENALTIES.TOO_SHORT;
    }
    return score;
  }

  private checkWordCount(content: string, reasons: string[], score: number): number {
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < QUALITY_THRESHOLDS.MIN_WORD_COUNT) {
      reasons.push('too_few_words');
      return score - QUALITY_SCORE_PENALTIES.TOO_FEW_WORDS;
    }
    return score;
  }

  private checkErrorPatterns(content: string, reasons: string[], score: number): number {
    const lowerContent = content.toLowerCase();
    const hasErrorPattern = QUALITY_THRESHOLDS.ERROR_PATTERNS.some((pattern) =>
      lowerContent.includes(pattern.toLowerCase()),
    );
    if (hasErrorPattern) {
      reasons.push('error_or_refusal_detected');
      return score - QUALITY_SCORE_PENALTIES.ERROR_PATTERN;
    }
    return score;
  }

  private checkRepetition(content: string, reasons: string[], score: number): number {
    const repetitionScore = this.detectRepetition(content);
    if (repetitionScore > QUALITY_THRESHOLDS.REPETITION_THRESHOLD) {
      reasons.push('excessive_repetition');
      return score - QUALITY_SCORE_PENALTIES.EXCESSIVE_REPETITION;
    }
    return score;
  }

  private checkEchoResponse(
    content: string,
    userPrompt: string,
    reasons: string[],
    score: number,
  ): number {
    if (this.isEchoResponse(content, userPrompt)) {
      reasons.push('echo_response');
      return score - QUALITY_SCORE_PENALTIES.ECHO_RESPONSE;
    }
    return score;
  }

  private detectRepetition(content: string): number {
    const words = content.toLowerCase().split(/\s+/);
    if (words.length < MIN_WORDS_FOR_REPETITION_CHECK) {
      return 0;
    }

    const trigrams = new Set<string>();
    let repeated = 0;

    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i] ?? ''} ${words[i + 1] ?? ''} ${words[i + 2] ?? ''}`;
      if (trigrams.has(trigram)) {
        repeated++;
      }
      trigrams.add(trigram);
    }

    return repeated / Math.max(1, words.length - 2);
  }

  private isEchoResponse(content: string, userPrompt: string): boolean {
    const similarity = this.calculateSimilarity(content.toLowerCase(), userPrompt.toLowerCase());
    return similarity > QUALITY_THRESHOLDS.ECHO_SIMILARITY_THRESHOLD;
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a.length === 0 || b.length === 0) {
      return 0;
    }
    const shorter = a.length < b.length ? a : b;
    const longer = a.length >= b.length ? a : b;
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    return 0;
  }

  private buildDecision(
    shouldReRoute: boolean,
    reason: string,
    originalScore: number,
  ): ReRoutingDecision {
    return {
      shouldReRoute,
      reason,
      escalationProvider: null,
      escalationModel: null,
      originalScore,
    };
  }
}
