import {
  SEARCH_BROWSER_ELIGIBILITY_THRESHOLD,
  SEARCH_BROWSER_FRIENDLY_CATEGORIES,
  SEARCH_BROWSER_HOSTILE_CATEGORIES,
  SEARCH_BROWSER_MIN_PARAMS_BILLIONS,
  SEARCH_BROWSER_SCORE_MAX,
  SEARCH_BROWSER_SCORE_MIN,
  SEARCH_BROWSER_TEXT_SIGNALS,
  SEARCH_BROWSER_TOOL_CAPABILITY_TOKENS,
  SEARCH_BROWSER_WEIGHTS,
} from '../constants/search-browser-classifier.constants';
import type {
  SearchBrowserClassifierInput,
  SearchBrowserClassifierResult,
} from '../types/search-browser-classifier.types';

function parseParameterBillions(parameterCount: string | null): number | null {
  if (parameterCount === null) return null;
  const trimmed = parameterCount.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)\s*([bm])?$/.exec(trimmed);
  if (match === null) return null;
  const raw = match[1];
  const unit = match[2];
  if (raw === undefined) return null;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return null;
  if (unit === 'm') return value / 1000;
  return value;
}

function hasToolCapability(capabilities: readonly string[]): boolean {
  const normalized = capabilities.map((c) => c.toLowerCase());
  return SEARCH_BROWSER_TOOL_CAPABILITY_TOKENS.some((token) =>
    normalized.some((cap) => cap === token || cap.includes(token)),
  );
}

function countTextSignals(input: SearchBrowserClassifierInput): number {
  const haystack = [input.name, input.displayName, input.description ?? ''].join(' ').toLowerCase();
  let count = 0;
  for (const signal of SEARCH_BROWSER_TEXT_SIGNALS) {
    if (haystack.includes(signal)) count += 1;
  }
  return count;
}

function clamp(score: number): number {
  if (score < SEARCH_BROWSER_SCORE_MIN) return SEARCH_BROWSER_SCORE_MIN;
  if (score > SEARCH_BROWSER_SCORE_MAX) return SEARCH_BROWSER_SCORE_MAX;
  return score;
}

export function classifySearchBrowser(
  input: SearchBrowserClassifierInput,
): SearchBrowserClassifierResult {
  const reasons: string[] = [];

  if (SEARCH_BROWSER_HOSTILE_CATEGORIES.has(input.category)) {
    reasons.push(`hostile_category:${input.category}`);
    return { score: 0, reasons, eligible: false };
  }

  let score = 0;

  if (SEARCH_BROWSER_FRIENDLY_CATEGORIES.has(input.category)) {
    score += SEARCH_BROWSER_WEIGHTS.categoryFriendly;
    reasons.push(`friendly_category:${input.category}`);
  }

  if (hasToolCapability(input.capabilities)) {
    score += SEARCH_BROWSER_WEIGHTS.toolCapability;
    reasons.push('tool_capability');
  }

  const params = parseParameterBillions(input.parameterCount);
  if (params !== null) {
    if (params >= SEARCH_BROWSER_MIN_PARAMS_BILLIONS) {
      score += SEARCH_BROWSER_WEIGHTS.paramsAdequate;
      reasons.push(`params_adequate:${params}B`);
    }
    if (params >= 3) {
      score += SEARCH_BROWSER_WEIGHTS.paramsStrong;
      reasons.push(`params_strong:${params}B`);
    }
    if (params < SEARCH_BROWSER_MIN_PARAMS_BILLIONS) {
      reasons.push(`params_too_small:${params}B`);
    }
  } else {
    reasons.push('params_unknown');
  }

  const signalCount = countTextSignals(input);
  if (signalCount >= 1) {
    score += SEARCH_BROWSER_WEIGHTS.textSignal;
    reasons.push(`text_signals:${signalCount}`);
  }
  if (signalCount >= 3) {
    score += SEARCH_BROWSER_WEIGHTS.multiTextSignal;
  }

  if (input.downloadStatus === 'AVAILABLE' || input.downloadStatus === 'UNKNOWN') {
    score += SEARCH_BROWSER_WEIGHTS.downloadableBonus;
    reasons.push(`download_status:${input.downloadStatus}`);
  }

  const finalScore = Math.round(clamp(score) * 100) / 100;
  const eligible = finalScore >= SEARCH_BROWSER_ELIGIBILITY_THRESHOLD;

  return { score: finalScore, reasons, eligible };
}
