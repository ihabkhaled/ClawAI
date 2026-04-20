/**
 * Canonical error codes emitted by the workspace service. Every
 * BusinessException thrown from this service should use one of these
 * codes so callers (chat, agent, frontend) can switch on a stable
 * taxonomy instead of parsing strings.
 *
 * Grouped by failure domain:
 *   - CONFIG_*:    provider app-config problems (credentials, shape, state)
 *   - OAUTH_*:     OAuth flow problems (init, state, callback, refresh)
 *   - CONNECTOR_*: connector lifecycle problems (auth, duplicate, not-found)
 *   - SYNC_*:      sync orchestration problems (already running, failed, not supported)
 *   - PROVIDER_*:  upstream provider problems (rate-limited, unavailable, unauthorized by them)
 *   - ACTION_*:    write-action problems (state, adapter, expired)
 *   - SECURITY_*:  URL/webhook/idempotency problems
 */
export enum WorkspaceErrorCode {
  // Provider app-config
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_NOT_READY = 'CONFIG_NOT_READY',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_PROVIDER_MISMATCH = 'CONFIG_PROVIDER_MISMATCH',

  // OAuth
  OAUTH_NOT_SUPPORTED = 'OAUTH_NOT_SUPPORTED',
  OAUTH_INVALID_STATE = 'OAUTH_INVALID_STATE',
  OAUTH_REQUIRED = 'OAUTH_PROVIDER_REQUIRES_OAUTH_FLOW',
  OAUTH_EXCHANGE_FAILED = 'OAUTH_EXCHANGE_FAILED',
  OAUTH_REFRESH_FAILED = 'OAUTH_REFRESH_FAILED',

  // Connector lifecycle
  CONNECTOR_NOT_FOUND = 'CONNECTOR_NOT_FOUND',
  CONNECTOR_FORBIDDEN = 'CONNECTOR_FORBIDDEN',
  CONNECTOR_PENDING_AUTH = 'CONNECTOR_PENDING_AUTH',
  CONNECTOR_DISCONNECTED = 'CONNECTOR_DISCONNECTED',
  CONNECTOR_TOKEN_EXPIRED = 'CONNECTOR_TOKEN_EXPIRED',

  // Sync
  SYNC_ALREADY_RUNNING = 'SYNC_ALREADY_RUNNING',
  SYNC_NOT_SUPPORTED = 'SYNC_NOT_SUPPORTED',
  SYNC_FAILED = 'SYNC_FAILED',

  // Upstream provider
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_UNAUTHORIZED = 'PROVIDER_UNAUTHORIZED',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PAT_NOT_SUPPORTED = 'PAT_NOT_SUPPORTED',
  ADAPTER_NOT_IMPLEMENTED = 'ADAPTER_NOT_IMPLEMENTED',

  // Actions
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  ACTION_INVALID_STATE = 'ACTION_INVALID_STATE',
  ACTION_EXPIRED = 'ACTION_EXPIRED',
  ACTION_EXECUTION_FAILED = 'ACTION_EXECUTION_FAILED',

  // Security
  UNSAFE_BASE_URL = 'UNSAFE_BASE_URL',
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  IDEMPOTENCY_KEY_REUSED = 'IDEMPOTENCY_KEY_REUSED',
}
