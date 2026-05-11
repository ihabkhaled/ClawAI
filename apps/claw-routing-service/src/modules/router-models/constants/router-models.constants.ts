/// Field names that, when modified via PATCH /routing/models/:id, also create
/// a `RouterAdminOverride` row so the change survives upstream syncs.
export const OVERRIDE_MANAGED_FIELDS: ReadonlyArray<string> = Object.freeze([
  'displayName',
  'family',
  'isRouterOnly',
  'isExecutionCapable',
  'lifecycle',
  'modalitiesIn',
  'modalitiesOut',
  'contextWindowTokens',
  'maxOutputTokens',
  'domainTags',
  'notRecommendedFor',
  'inputCostPer1M',
  'outputCostPer1M',
  'costConfidence',
  'costClass',
  'qualityTier',
  'hallucinationRisk',
  'judgeSuitability',
  'searchSuitability',
  'fallbackSuitability',
  'privacySupport',
  'externalCardUrl',
  'notes',
]);

/// Default page size for the registry list endpoint.
export const REGISTRY_LIST_DEFAULT_LIMIT = 50;

/// Field names mapped 1:1 between UpdateRouterModelDto and the Prisma update
/// input. `overrideReason` is intentionally excluded — the manager records it
/// in the override audit row, never on the registry row itself.
export const REGISTRY_UPDATE_FIELDS: ReadonlyArray<string> = Object.freeze([
  'provider',
  'modelKey',
  'displayName',
  'family',
  'connectorId',
  'runtimeId',
  'isLocal',
  'isRouterOnly',
  'isExecutionCapable',
  'lifecycle',
  'modalitiesIn',
  'modalitiesOut',
  'contextWindowTokens',
  'maxOutputTokens',
  'domainTags',
  'notRecommendedFor',
  'inputCostPer1M',
  'outputCostPer1M',
  'costConfidence',
  'costClass',
  'latencyP50Ms',
  'latencyP95Ms',
  'latencyClass',
  'qualityTier',
  'hallucinationRisk',
  'judgeSuitability',
  'searchSuitability',
  'fallbackSuitability',
  'privacySupport',
  'metadataSource',
  'externalCardUrl',
  'notes',
]);
