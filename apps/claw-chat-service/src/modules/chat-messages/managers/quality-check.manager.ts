import { Injectable, Logger } from '@nestjs/common';

import {
  MIN_WORDS_FOR_REPETITION_CHECK,
  QUALITY_SCORE_PENALTIES,
  QUALITY_THRESHOLDS,
} from '../constants/quality-thresholds.constants';
import type { QualityCheckResult, ReRoutingDecision } from '../types/quality-check.types';
import type { ThreadSettings } from '../types/execution.types';

const CRITICAL_WEAK_REASONS = new Set(['prior_answer_bleed']);

@Injectable()
export class QualityCheckManager {
  private readonly logger = new Logger(QualityCheckManager.name);

  checkResponseQuality(
    content: string,
    userPrompt: string,
    threadSettings?: ThreadSettings,
    recentAssistantContents: string[] = [],
  ): QualityCheckResult {
    if (this.shouldBypassQualityChecks(userPrompt, content)) {
      this.logger.debug('checkResponseQuality: bypassing reroute checks for short/trivial prompt');
      return {
        isWeak: false,
        reasons: [],
        score: 1,
      };
    }

    const reasons: string[] = [];
    let score = 1.0;
    const minLength = this.getMinimumLength(userPrompt);

    score = this.checkLength(content, reasons, score, minLength);
    score = this.checkWordCount(content, reasons, score, userPrompt);
    score = this.checkErrorPatterns(content, reasons, score);
    score = this.checkRepetition(content, reasons, score);
    score = this.checkEchoResponse(content, userPrompt, reasons, score);
    score = this.checkPriorAnswerBleed(
      content,
      userPrompt,
      recentAssistantContents,
      reasons,
      score,
    );

    score = Math.max(0, Math.min(1, score));

    const threshold = threadSettings?.qualityThreshold ?? QUALITY_THRESHOLDS.WEAK_SCORE_THRESHOLD;

    const hasCriticalWeakReason = reasons.some((reason) => CRITICAL_WEAK_REASONS.has(reason));

    const result: QualityCheckResult = {
      isWeak: hasCriticalWeakReason || score < threshold,
      reasons,
      score,
    };

    this.logger.debug(
      `checkResponseQuality: score=${String(score.toFixed(2))} threshold=${String(threshold)} critical=${String(hasCriticalWeakReason)} isWeak=${String(result.isWeak)} reasons=[${reasons.join(', ')}]`,
    );

    return result;
  }

  shouldReRoute(
    qualityResult: QualityCheckResult,
    attemptCount: number,
    threadSettings?: ThreadSettings,
  ): ReRoutingDecision {
    if (!qualityResult.isWeak) {
      return this.buildDecision(false, 'quality_acceptable', qualityResult.score);
    }

    const maxAttempts =
      threadSettings?.maxReRouteAttempts ?? QUALITY_THRESHOLDS.MAX_REROUTE_ATTEMPTS;

    if (attemptCount >= maxAttempts) {
      this.logger.warn(
        `shouldReRoute: max re-route attempts (${String(attemptCount)}/${String(maxAttempts)}) reached — accepting weak response`,
      );
      return this.buildDecision(false, 'max_attempts_reached', qualityResult.score);
    }

    this.logger.log(
      `shouldReRoute: recommending re-route — score=${String(qualityResult.score.toFixed(2))} reasons=[${qualityResult.reasons.join(', ')}]`,
    );

    return this.buildDecision(true, qualityResult.reasons.join(', '), qualityResult.score);
  }

  private checkLength(
    content: string,
    reasons: string[],
    score: number,
    minLength: number,
  ): number {
    if (content.length < minLength) {
      reasons.push('response_too_short');
      return score - QUALITY_SCORE_PENALTIES.TOO_SHORT;
    }
    return score;
  }

  private checkWordCount(
    content: string,
    reasons: string[],
    score: number,
    userPrompt: string,
  ): number {
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const minWords = this.getMinimumWordCount(userPrompt);
    if (wordCount < minWords) {
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

  private checkPriorAnswerBleed(
    content: string,
    userPrompt: string,
    recentAssistantContents: string[],
    reasons: string[],
    score: number,
  ): number {
    if (recentAssistantContents.length === 0) {
      return score;
    }

    const promptAlignment = this.calculateTokenOverlap(
      content,
      this.normalizeIntentText(userPrompt),
    );
    const strongestPriorSimilarity = recentAssistantContents.reduce((best, candidate) => {
      return Math.max(best, this.calculateContainmentSimilarity(content, candidate));
    }, 0);

    if (
      strongestPriorSimilarity >= QUALITY_THRESHOLDS.PRIOR_ANSWER_SIMILARITY_THRESHOLD &&
      promptAlignment <= QUALITY_THRESHOLDS.PRIOR_ANSWER_MAX_PROMPT_ALIGNMENT
    ) {
      reasons.push('prior_answer_bleed');
      return score - QUALITY_SCORE_PENALTIES.PRIOR_ANSWER_BLEED;
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

  private calculateContainmentSimilarity(a: string, b: string): number {
    return this.calculateSimilarity(a.toLowerCase(), b.toLowerCase());
  }

  private calculateTokenOverlap(a: string, b: string): number {
    const aTokens = new Set(this.tokenize(this.normalizeIntentText(a)));
    const bTokens = new Set(this.tokenize(this.normalizeIntentText(b)));
    if (aTokens.size === 0 || bTokens.size === 0) {
      return 0;
    }

    let hits = 0;
    for (const token of aTokens) {
      if (bTokens.has(token)) {
        hits += 1;
      }
    }

    return hits / Math.max(Math.min(aTokens.size, bTokens.size), 1);
  }

  private tokenize(value: string): string[] {
    const ignoredTokens = new Set([
      'associate',
      'senior',
      'lead',
      'principal',
      'engineer',
      'advisor',
      'director',
      'manager',
      'analyst',
      'strategist',
      'consultant',
      'support',
      'backend',
      'frontend',
      'product',
      'customer',
      'security',
      'operations',
      'research',
      'scientist',
      'architect',
      'designer',
      'artist',
      'legal',
      'medical',
      'finance',
      'procurement',
      'executive',
    ]);
    return value
      .toLowerCase()
      .replaceAll(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !ignoredTokens.has(token));
  }

  private normalizeIntentText(value: string): string {
    const trimmed = value.trim();
    const commaIndex = trimmed.indexOf(',');
    if (trimmed.startsWith('As ') && commaIndex > 0) {
      return trimmed.slice(commaIndex + 1).trim();
    }
    return trimmed;
  }

  private getMinimumLength(userPrompt: string): number {
    const prompt = this.normalizeIntentText(userPrompt).toLowerCase();
    if (
      /\b(file|pdf|csv|docx|spreadsheet|report|memo|brief|checklist|slides|deck)\b/.test(prompt)
    ) {
      return QUALITY_THRESHOLDS.MIN_RESPONSE_LENGTH;
    }
    if (
      /\b(reason|reasoning|tradeoff|compare|evaluate|recommend|decide|next step|summary|summarize)\b/.test(
        prompt,
      )
    ) {
      return 12;
    }
    if (
      /\b(explain|help me decide|what is|what should|give me|answer in plain english)\b/.test(
        prompt,
      )
    ) {
      return 12;
    }
    return QUALITY_THRESHOLDS.MIN_RESPONSE_LENGTH;
  }

  private getMinimumWordCount(userPrompt: string): number {
    const prompt = this.normalizeIntentText(userPrompt).toLowerCase();
    if (
      /\b(reason|reasoning|tradeoff|compare|evaluate|recommend|decide|summary|summarize)\b/.test(
        prompt,
      )
    ) {
      return 3;
    }
    if (
      /\b(explain|help me decide|what is|what should|give me|answer in plain english)\b/.test(
        prompt,
      )
    ) {
      return 3;
    }
    return QUALITY_THRESHOLDS.MIN_WORD_COUNT;
  }

  private buildDecision(
    shouldReRoute: boolean,
    reason: string,
    originalScore: number,
  ): ReRoutingDecision {
    return {
      shouldReRoute,
      reason,
      originalScore,
    };
  }

  private shouldBypassQualityChecks(userPrompt: string, content: string): boolean {
    if (content.trim().length === 0) {
      return false;
    }

    const prompt = userPrompt.trim().toLowerCase();
    if (prompt.length === 0) {
      return false;
    }

    const promptWords = prompt.split(/\s+/).filter((word) => word.length > 0);
    if (promptWords.length <= 3) {
      return true;
    }

    return /^(hi|hello|hey|yo|thanks|thank you|good (morning|afternoon|evening))(?:[!.?]*)$/.test(
      prompt,
    );
  }
}
