// HighRiskDetector — Phase 7 of the semantic router flagship.
// Lightweight, pure detector that flags messages where the judge should
// auto-run to vet the response before it reaches the user.
//
// Two signals are honored:
//   1. Keyword match against HIGH_RISK_KEYWORD_PATTERNS (always available).
//   2. SemanticIntentAnalysis.riskLevel ∈ HIGH_RISK_ANALYZER_LEVELS when
//      the analyzer was enabled and produced output.
//
// The detector is intentionally NOT a class — it's a pure function so it
// can be called inline from RoutingService without DI overhead.

import {
  HIGH_RISK_ANALYZER_LEVELS,
  HIGH_RISK_KEYWORD_PATTERNS,
} from '../constants/high-risk-detector.constants';
import type { HighRiskSignal } from '../types/high-risk-detector.types';

export function detectHighRisk(
  message: string,
  analyzerRiskLevel: string | null | undefined,
): HighRiskSignal {
  const matchedKeywords: string[] = [];
  for (const { keyword, pattern } of HIGH_RISK_KEYWORD_PATTERNS) {
    if (pattern.test(message)) {
      matchedKeywords.push(keyword);
    }
  }
  const analyzerFlagged =
    typeof analyzerRiskLevel === 'string' && HIGH_RISK_ANALYZER_LEVELS.has(analyzerRiskLevel);
  return {
    isHighRisk: matchedKeywords.length > 0 || analyzerFlagged,
    matchedKeywords,
    analyzerRiskLevel: analyzerRiskLevel ?? null,
  };
}
