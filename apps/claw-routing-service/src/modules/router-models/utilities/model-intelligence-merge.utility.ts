import { CURATED_CLOUD_MODEL_INTELLIGENCE_BY_KEY } from '../constants/cloud-model-intelligence.constants';
import { LOCAL_FAMILY_HEURISTICS } from '../constants/local-model-family-heuristics.constants';
import { INTELLIGENCE_OVERRIDE_FIELDS } from '../constants/model-intelligence.constants';
import { type ModelIntelligenceEnrichment } from '../types/model-intelligence.types';

/// Returns the curated cloud-model enrichment block for `(provider, modelKey)`
/// or `undefined` if the model isn't in the curated table. The lookup is
/// case-sensitive on `provider` (matches the upstream value) and uses the
/// exact `modelKey` as stored in the registry.
export function lookupCuratedCloudEnrichment(
  provider: string,
  modelKey: string,
): ModelIntelligenceEnrichment | undefined {
  const entry = CURATED_CLOUD_MODEL_INTELLIGENCE_BY_KEY.get(`${provider}::${modelKey}`);
  return entry?.enrichment;
}

/// Returns the local-family heuristic enrichment block for a model name or
/// family fragment, or `undefined` if no family matches.
export function lookupLocalFamilyEnrichment(
  familyOrName: string | null | undefined,
): ModelIntelligenceEnrichment | undefined {
  if (familyOrName === null || familyOrName === undefined) return undefined;
  const haystack = familyOrName.toLowerCase();
  for (const heuristic of LOCAL_FAMILY_HEURISTICS) {
    if (haystack.includes(heuristic.match)) {
      return heuristic.enrichment;
    }
  }
  return undefined;
}

/// Merges a sync-derived enrichment block onto a base block, EXCLUDING any
/// field whose key is present in `protectedKeys`. Used by the sync manager
/// to apply curated/heuristic enrichments without clobbering admin pins.
///
/// Rules (§6.2 / §6.3 of the flagship prompt):
///   - admin override always wins over sync
///   - unknown capability stays as the existing value (do NOT downgrade to
///     `false` just because the sync source didn't say anything)
///   - empty arrays from sync DO replace existing arrays (treated as
///     "the source explicitly said 'no'"). Pass `undefined` to mean
///     "I have nothing to say".
export function mergeEnrichmentRespectingOverrides(
  base: ModelIntelligenceEnrichment,
  incoming: ModelIntelligenceEnrichment,
  protectedKeys: ReadonlySet<string>,
): ModelIntelligenceEnrichment {
  const out: Record<string, unknown> = { ...base };
  const incomingMap = incoming as Record<string, unknown>;
  for (const key of Object.keys(incomingMap)) {
    if (protectedKeys.has(key)) continue;
    const value = incomingMap[key];
    if (value === undefined) continue;
    out[key] = value;
  }
  return out as ModelIntelligenceEnrichment;
}

/// Picks the override-managed fields from a partial enrichment input. Used
/// when persisting `adminOverrideJson` so the freeze block contains only
/// the planner-facing intelligence keys, not arbitrary input.
export function pickOverrideFields(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of INTELLIGENCE_OVERRIDE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}
