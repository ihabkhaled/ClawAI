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
