export const SYNC_TIMEOUT_MS = 30_000;

/// Endpoint paths that the routing sync manager calls on upstream services.
/// Each returns `{ models: UpstreamModelSnapshot[] }`. If the endpoint is
/// not yet implemented upstream, the sync manager treats a 404 as "no data
/// to sync from this source" rather than a hard error.
export const UPSTREAM_SNAPSHOT_ENDPOINTS = Object.freeze({
  CONNECTOR: '/api/v1/internal/connectors/models-snapshot',
  OLLAMA: '/api/v1/internal/ollama/installed-snapshot',
  LLAMACPP: '/api/v1/internal/llamacpp/loaded-snapshot',
});

export const UPSTREAM_SERVICE_URLS = Object.freeze({
  CONNECTOR: 'CONNECTOR_SERVICE_URL',
  OLLAMA: 'OLLAMA_SERVICE_URL',
  LLAMACPP: 'LLAMACPP_SERVICE_URL',
});

/// Phase 3: scalar (non-enum) fields on `UpstreamModelSnapshot` that map
/// 1:1 to columns on `router_model_registry`. The sync manager copies each
/// of these into the update payload unless the column is admin-pinned.
/// `nullable=true` means "if upstream omitted, store NULL"; `false` means
/// the upsert builder substitutes an empty-array fallback (modalities).
export const SYNC_BASE_FIELDS: ReadonlyArray<{
  readonly key: 'displayName' | 'family' | 'modalitiesIn' | 'modalitiesOut' | 'contextWindowTokens' | 'maxOutputTokens' | 'inputCostPer1M' | 'outputCostPer1M';
  readonly nullable: boolean;
}> = Object.freeze([
  { key: 'displayName', nullable: false },
  { key: 'family', nullable: true },
  { key: 'modalitiesIn', nullable: false },
  { key: 'modalitiesOut', nullable: false },
  { key: 'contextWindowTokens', nullable: true },
  { key: 'maxOutputTokens', nullable: true },
  { key: 'inputCostPer1M', nullable: true },
  { key: 'outputCostPer1M', nullable: true },
]);

/// Phase 3: optional typed enum fields on `UpstreamModelSnapshot`. They
/// only flow into the update payload when the upstream snapshot provided
/// a value AND the column isn't admin-pinned.
export const SYNC_OPTIONAL_TYPED_FIELDS: ReadonlyArray<'qualityTier' | 'privacySupport'> =
  Object.freeze(['qualityTier', 'privacySupport']);
