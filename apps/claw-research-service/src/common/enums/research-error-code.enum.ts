/**
 * Canonical error codes emitted by the research service. Every
 * BusinessException thrown from this service should use one of these
 * codes so callers (chat, frontend, audit) can switch on a stable
 * taxonomy instead of parsing strings.
 *
 * Grouped by failure domain:
 *   - PROVIDER_*: search/scrape/clone provider registry problems
 *   - SEARCH_*:   search execution problems
 *   - FETCH_*:    web fetch problems
 *   - SCRAPE_*:   structured extraction problems
 *   - CLONE_*:    repo-clone/analysis problems
 *   - WORKFLOW_*: orchestration problems
 *   - CONTENT_*:  prompt-injection / secret-pattern flags
 *   - DOMAIN_*:   allowlist/blocklist enforcement
 *   - SECURITY_*: SSRF and related URL safety
 *   - CONFIG_*:   provider config validation / uniqueness
 */
export enum ResearchErrorCode {
  // Provider registry
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  PROVIDER_DISABLED = 'PROVIDER_DISABLED',
  PROVIDER_AUTH_FAILED = 'PROVIDER_AUTH_FAILED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  NO_ENABLED_PROVIDER = 'NO_ENABLED_PROVIDER',
  ADAPTER_NOT_IMPLEMENTED = 'ADAPTER_NOT_IMPLEMENTED',
  UNSUPPORTED_PROVIDER = 'UNSUPPORTED_PROVIDER',

  // Search
  SEARCH_FAILED = 'SEARCH_FAILED',
  SEARCH_TIMEOUT = 'SEARCH_TIMEOUT',

  // Fetch
  FETCH_FAILED = 'FETCH_FAILED',
  FETCH_TIMEOUT = 'FETCH_TIMEOUT',
  FETCH_URL_BLOCKED = 'FETCH_URL_BLOCKED',

  // Scrape
  SCRAPE_FAILED = 'SCRAPE_FAILED',
  SCRAPE_UNSUPPORTED_PROFILE = 'SCRAPE_UNSUPPORTED_PROFILE',

  // Clone (reserved for Session 2)
  CLONE_FAILED = 'CLONE_FAILED',
  CLONE_UNSUPPORTED_HOST = 'CLONE_UNSUPPORTED_HOST',

  // Workflow
  WORKFLOW_NOT_IMPLEMENTED = 'WORKFLOW_NOT_IMPLEMENTED',
  INVALID_INTENT = 'INVALID_INTENT',

  // Content safety
  CONTENT_INJECTION_DETECTED = 'CONTENT_INJECTION_DETECTED',
  SECRET_REDACTED = 'SECRET_REDACTED',

  // Domain policy
  DOMAIN_BLOCKED = 'DOMAIN_BLOCKED',
  DOMAIN_NOT_ALLOWED = 'DOMAIN_NOT_ALLOWED',

  // SSRF / URL safety
  UNSAFE_URL = 'UNSAFE_URL',

  // Provider config
  NAME_TAKEN = 'NAME_TAKEN',
  CONFIG_INVALID = 'CONFIG_INVALID',
}
