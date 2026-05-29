import { KNOWN_JUDGE_PROVIDERS } from '../constants';
import type { ParsedJudgeModel } from '../types';

/**
 * Robustly parses a judge/critic model selection that may be either
 * `"PROVIDER:model"` (e.g. `"OPENAI:gpt-4o-mini"`, `"local-ollama:gemma3:4b"`)
 * or a plain model name (e.g. `"gemma3:4b"`, `"AUTO"`).
 *
 * The leading segment (before the first `:`) is treated as a provider ONLY when
 * it matches {@link KNOWN_JUDGE_PROVIDERS} case-insensitively. This avoids
 * mis-parsing tag suffixes such as `"gpt-4o:latest"` or `"gemma3:4b"` where the
 * leading segment is a model name, not a provider. When it matches, the
 * remainder (which itself may contain further `:` chars like an Ollama tag) is
 * kept verbatim as the model.
 *
 * Never throws. Returns `{ provider: null, model: '' }` for empty/whitespace
 * input so callers can fall back to their default judge behavior.
 */
export function parseJudgeModel(raw: string | null | undefined): ParsedJudgeModel {
  const trimmed = raw?.trim() ?? '';
  if (trimmed.length === 0) {
    return { provider: null, model: '' };
  }

  const separatorIndex = trimmed.indexOf(':');
  if (separatorIndex <= 0) {
    return { provider: null, model: trimmed };
  }

  const candidateProvider = trimmed.slice(0, separatorIndex);
  const remainder = trimmed.slice(separatorIndex + 1).trim();
  const matchedProvider = findKnownProvider(candidateProvider);
  if (matchedProvider !== null && remainder.length > 0) {
    return { provider: matchedProvider, model: remainder };
  }

  return { provider: null, model: trimmed };
}

/**
 * Returns the canonical provider token from {@link KNOWN_JUDGE_PROVIDERS} that
 * matches `candidate` case-insensitively, or null when none match.
 */
function findKnownProvider(candidate: string): string | null {
  const normalized = candidate.trim().toUpperCase();
  for (const known of KNOWN_JUDGE_PROVIDERS) {
    if (known.toUpperCase() === normalized) {
      return known;
    }
  }
  return null;
}
