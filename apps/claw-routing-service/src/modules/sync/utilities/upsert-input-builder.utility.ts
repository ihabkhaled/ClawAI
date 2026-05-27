import { ModelLifecycle, type Prisma } from '../../../generated/prisma';
import { type ModelIntelligenceEnrichment } from '../../router-models/types/model-intelligence.types';
import { SYNC_BASE_FIELDS, SYNC_OPTIONAL_TYPED_FIELDS } from '../constants/sync.constants';
import { type UpstreamModelSnapshot } from '../types/sync.types';

/// Builds the `create` half of the upsert input — everything we know about
/// the upstream model plus the enrichment block.
export function buildCreateInput(
  upstream: UpstreamModelSnapshot,
  enrichmentEntriesMap: Record<string, unknown>,
): Prisma.RouterModelRegistryCreateInput {
  return {
    provider: upstream.provider,
    modelKey: upstream.modelKey,
    displayName: upstream.displayName,
    family: upstream.family ?? null,
    isLocal: upstream.isLocal ?? false,
    lifecycle: ModelLifecycle.ACTIVE,
    modalitiesIn: upstream.modalitiesIn ?? [],
    modalitiesOut: upstream.modalitiesOut ?? [],
    contextWindowTokens: upstream.contextWindowTokens ?? null,
    maxOutputTokens: upstream.maxOutputTokens ?? null,
    inputCostPer1M: upstream.inputCostPer1M ?? null,
    outputCostPer1M: upstream.outputCostPer1M ?? null,
    ...(upstream.qualityTier !== undefined ? { qualityTier: upstream.qualityTier } : {}),
    ...(upstream.privacySupport !== undefined ? { privacySupport: upstream.privacySupport } : {}),
    ...enrichmentEntriesMap,
  };
}

/// Builds the `update` half of the upsert input. Honors `protectedFields`
/// (per-field admin pins) and applies the enrichment block. Caller is
/// expected to have already stripped override-protected enrichment keys
/// via `mergeEnrichmentRespectingOverrides`.
export function buildUpdateInput(
  upstream: UpstreamModelSnapshot,
  protectedFields: ReadonlySet<string>,
  enrichmentEntriesMap: Record<string, unknown>,
): Prisma.RouterModelRegistryUpdateInput {
  const upstreamMap = upstream as unknown as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const spec of SYNC_BASE_FIELDS) {
    if (protectedFields.has(spec.key)) continue;
    update[spec.key] = applyFallback(spec.key, upstreamMap[spec.key], spec.nullable);
  }
  for (const key of SYNC_OPTIONAL_TYPED_FIELDS) {
    const value = upstreamMap[key];
    if (value === undefined) continue;
    if (protectedFields.has(key)) continue;
    update[key] = value;
  }
  Object.assign(update, enrichmentEntriesMap);
  if (Object.keys(enrichmentEntriesMap).length > 0) update.lastEnrichedAt = new Date();
  return update as Prisma.RouterModelRegistryUpdateInput;
}

/// Picks the keys of a `ModelIntelligenceEnrichment` block that have
/// defined values. Caller is expected to have already stripped
/// override-protected keys.
export function enrichmentEntries(
  enrichment: ModelIntelligenceEnrichment,
): Record<string, unknown> {
  const map = enrichment as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(map)) {
    const value = map[key];
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function applyFallback(key: string, value: unknown, nullable: boolean): unknown {
  if (value !== undefined) return value;
  if (key === 'modalitiesIn' || key === 'modalitiesOut') return [];
  return nullable ? null : value;
}
