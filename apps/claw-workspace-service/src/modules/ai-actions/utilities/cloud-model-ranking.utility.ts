import { CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN } from '@claw/shared-utilities';

import {
  AUTO_CLOUD_FALLBACK_LIMIT,
  LONG_CONTEXT_HINTS,
  LONG_CONTEXT_MIN_TOKENS,
  STRUCTURED_OUTPUT_HINTS,
  TOOL_HINTS,
  UNKNOWN_USAGE_TIER_RANK,
  USAGE_TIER_COST_RANK,
} from '../constants/model-catalog.constants';
import type { ModelChoice } from '../types/ai-action.types';
import type { ConnectedProvider, ConnectedProviderModel } from '../types/model-catalog.types';

type Candidate = { choice: ModelChoice; fit: number; costRank: number };

function hintFit(model: ConnectedProviderModel, hints: readonly string[]): number {
  let fit = 0;
  for (const hint of hints) {
    if (STRUCTURED_OUTPUT_HINTS.has(hint) && model.supportsStructuredOutput) fit += 1;
    else if (
      LONG_CONTEXT_HINTS.has(hint) &&
      (model.maxContextTokens ?? 0) >= LONG_CONTEXT_MIN_TOKENS
    )
      fit += 1;
    else if (TOOL_HINTS.has(hint) && model.supportsTools) fit += 1;
  }
  return fit;
}

function costRank(model: ConnectedProviderModel): number {
  return USAGE_TIER_COST_RANK.get(model.usageTier ?? '') ?? UNKNOWN_USAGE_TIER_RANK;
}

/** Better fit first, then the cheaper cost band. Array.sort is stable, so catalog order breaks ties. */
function byPreference(a: Candidate, b: Candidate): number {
  return b.fit - a.fit || a.costRank - b.costRank;
}

/**
 * The AUTO cloud chain: each provider's best model for the hints, best provider
 * first, capped at one primary plus AUTO_CLOUD_FALLBACK_LIMIT alternatives.
 *
 * Providers are whatever the catalog lists; nothing here knows a provider's
 * name. A model whose id marks it as image, speech, embedding or moderation is never a candidate. An empty catalog gives an empty chain, and the caller decides what that
 * means (a coded error), rather than this inventing a placeholder model.
 */
export function rankCloudModels(
  providers: readonly ConnectedProvider[],
  hints: readonly string[],
): ModelChoice[] {
  const bestPerProvider: Candidate[] = [];
  for (const provider of providers) {
    // The catalog also lists image, speech and embedding models; none of them can answer an action.
    const candidates = provider.models
      .filter((model) => !CONNECTOR_PRESET_NON_CHAT_MODEL_PATTERN.test(model.modelKey))
      .map((model): Candidate => ({
        choice: {
          provider: provider.provider,
          model: model.modelKey,
          displayName: model.displayName,
        },
        fit: hintFit(model, hints),
        costRank: costRank(model),
      }))
      .sort(byPreference);
    const best = candidates[0];
    if (best !== undefined) bestPerProvider.push(best);
  }
  return bestPerProvider
    .sort(byPreference)
    .slice(0, AUTO_CLOUD_FALLBACK_LIMIT + 1)
    .map((candidate) => candidate.choice);
}

/** Gemini-style ids arrive as `models/<id>`; the prefix names no different model. */
export function bareModelId(model: string): string {
  return model.replace(/^models\//u, '');
}
