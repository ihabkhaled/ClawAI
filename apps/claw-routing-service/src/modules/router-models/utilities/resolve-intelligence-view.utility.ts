import {
  INTELLIGENCE_ARRAY_VIEW_FIELDS,
  INTELLIGENCE_NULLABLE_VIEW_FIELDS,
} from '../constants/model-intelligence.constants';
import {
  type ModelIntelligenceEnrichment,
  type ResolvedModelIntelligence,
} from '../types/model-intelligence.types';
import { type RouterModelRegistryRecord } from '../types/router-model-registry.types';

/// Phase 3: builds the resolved `ResolvedModelIntelligence` view from a
/// stored row. Lifted out of `ModelIntelligenceService` to keep the service
/// method under the complexity ceiling and to give the view a single
/// canonical assembly point that admin endpoints can reuse.
export function resolveModelIntelligenceView(
  row: RouterModelRegistryRecord,
): ResolvedModelIntelligence {
  const rowMap = row as unknown as Record<string, unknown>;
  const nullableMap: Record<string, unknown> = {};
  for (const key of INTELLIGENCE_NULLABLE_VIEW_FIELDS) {
    const value = rowMap[key];
    nullableMap[key] = value === null ? undefined : value;
  }
  const arrayMap: Record<string, unknown> = {};
  for (const key of INTELLIGENCE_ARRAY_VIEW_FIELDS) {
    arrayMap[key] = rowMap[key];
  }
  const enrichment = { ...nullableMap, ...arrayMap } as ModelIntelligenceEnrichment;
  return {
    provider: row.provider,
    modelKey: row.modelKey,
    displayName: row.displayName,
    lastEnrichedAt: row.lastEnrichedAt,
    adminOverrideJson: row.adminOverrideJson,
    ...enrichment,
  };
}
