import { Injectable } from '@nestjs/common';
import { ComplexityClass } from '../../../common/enums/complexity-class.enum';
import {
  COMPLEXITY_CONTEXT_REFERENCE_BOOST,
  COMPLEXITY_CONTEXT_REFERENCE_PATTERNS,
  COMPLEXITY_EXPERT_DOMAIN_BOOST,
  COMPLEXITY_EXPERT_INDICATORS,
  COMPLEXITY_MULTI_STEP_BOOST,
  COMPLEXITY_MULTI_STEP_PATTERNS,
  COMPLEXITY_THRESHOLD_COMPLEX,
  COMPLEXITY_THRESHOLD_MEDIUM,
  COMPLEXITY_THRESHOLD_SIMPLE,
  COMPLEXITY_WORD_COUNT_SCALE,
} from '../constants/complexity.constants';
import type { ComplexityClassification } from '../types/complexity.types';

@Injectable()
export class ComplexityClassifierManager {
  classify(message: string): ComplexityClassification {
    const trimmed = message.trim();
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const lower = trimmed.toLowerCase();
    const factors: string[] = [];

    // Base score from word count (0 → 1.0 at COMPLEXITY_WORD_COUNT_SCALE words)
    let score = Math.min(wordCount / COMPLEXITY_WORD_COUNT_SCALE, 1.0);

    // Boost for multi-step patterns
    if (COMPLEXITY_MULTI_STEP_PATTERNS.some((p) => lower.includes(p))) {
      score = Math.min(score + COMPLEXITY_MULTI_STEP_BOOST, 1.0);
      factors.push('multi_step');
    }

    // Boost for expert-domain vocabulary
    if (COMPLEXITY_EXPERT_INDICATORS.some((p) => lower.includes(p))) {
      score = Math.min(score + COMPLEXITY_EXPERT_DOMAIN_BOOST, 1.0);
      factors.push('expert_domain');
    }

    // Boost for context references (prior turn required)
    if (COMPLEXITY_CONTEXT_REFERENCE_PATTERNS.some((p) => lower.includes(p))) {
      score = Math.min(score + COMPLEXITY_CONTEXT_REFERENCE_BOOST, 1.0);
      factors.push('context_reference');
    }

    return { class: this.scoreToClass(score), score, wordCount, factors };
  }

  private scoreToClass(score: number): ComplexityClass {
    if (score < COMPLEXITY_THRESHOLD_SIMPLE) return ComplexityClass.SIMPLE;
    if (score < COMPLEXITY_THRESHOLD_MEDIUM) return ComplexityClass.MEDIUM;
    if (score < COMPLEXITY_THRESHOLD_COMPLEX) return ComplexityClass.COMPLEX;
    return ComplexityClass.EXPERT;
  }
}
