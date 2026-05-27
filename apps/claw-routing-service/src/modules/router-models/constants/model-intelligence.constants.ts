/// Phase 3: enums + label catalogs for the Model Intelligence Registry.
/// Values are STRING constants (not Prisma enums) because the planner
/// vocabulary in §6.1 is slightly different from the canonical
/// `QualityTier`/`CostClass`/`LatencyClass` enums and we want the planner
/// to evolve independently of schema migrations.

export const QUALITY_TIER_LABELS: ReadonlyArray<string> = Object.freeze([
  'BASIC',
  'STANDARD',
  'PRO',
  'FRONTIER',
]);

export const COST_CLASS_LABELS: ReadonlyArray<string> = Object.freeze([
  'FREE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'PREMIUM',
]);

export const COST_CONFIDENCE_LABELS: ReadonlyArray<string> = Object.freeze([
  'EXACT',
  'ESTIMATED',
  'UNKNOWN',
]);

export const LATENCY_CLASS_LABELS: ReadonlyArray<string> = Object.freeze([
  'FAST',
  'MEDIUM',
  'SLOW',
]);

export const PRIVACY_CLASS_LABELS: ReadonlyArray<string> = Object.freeze(['local', 'cloud']);

/// Nullable enrichment fields on `RouterModelRegistryRecord` that should
/// be projected as `undefined` (not `null`) in the resolved view sent to
/// admin endpoints, so the planner can do `intel.qualityTierLabel ??
/// 'STANDARD'` without ceremony.
export const INTELLIGENCE_NULLABLE_VIEW_FIELDS: ReadonlyArray<string> = Object.freeze([
  'supportsStreaming',
  'supportsTools',
  'supportsStructuredOutput',
  'supportsVision',
  'supportsAudioInput',
  'supportsAudioOutput',
  'supportsVideoInput',
  'supportsFileInput',
  'supportsEmbeddings',
  'supportsLongContext',
  'maxContextTokens',
  'maxOutputTokensIntel',
  'qualityTierLabel',
  'costClassLabel',
  'costConfidenceLabel',
  'estimatedInputCostPer1M',
  'estimatedOutputCostPer1M',
  'latencyClassLabel',
  'privacyClassLabel',
]);

/// Pass-through array fields on `RouterModelRegistryRecord` that should
/// be projected as the stored array (defaults to `[]`) in the resolved
/// view.
export const INTELLIGENCE_ARRAY_VIEW_FIELDS: ReadonlyArray<string> = Object.freeze([
  'domainStrengths',
  'roleStrengths',
  'weakDomains',
  'bestFor',
  'avoidFor',
  'languageStrengths',
]);

/// Field names of `RouterModelIntelligence` that an admin can pin via
/// `PATCH /router-models/intelligence/:provider/:model`. Anything in this
/// list lands in `adminOverrideJson` AND on the row itself; sync will skip
/// the corresponding row column.
export const INTELLIGENCE_OVERRIDE_FIELDS: ReadonlyArray<string> = Object.freeze([
  'supportsStreaming',
  'supportsTools',
  'supportsStructuredOutput',
  'supportsVision',
  'supportsAudioInput',
  'supportsAudioOutput',
  'supportsVideoInput',
  'supportsFileInput',
  'supportsEmbeddings',
  'supportsLongContext',
  'maxContextTokens',
  'maxOutputTokensIntel',
  'domainStrengths',
  'roleStrengths',
  'weakDomains',
  'bestFor',
  'avoidFor',
  'languageStrengths',
  'qualityTierLabel',
  'costClassLabel',
  'costConfidenceLabel',
  'estimatedInputCostPer1M',
  'estimatedOutputCostPer1M',
  'latencyClassLabel',
  'privacyClassLabel',
]);
