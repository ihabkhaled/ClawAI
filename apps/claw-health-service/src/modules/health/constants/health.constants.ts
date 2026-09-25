import { type DependencyProbe } from '../types/health.types';

export const SERVICE_URLS: Record<string, string> = {
  'auth-service': 'https://auth-service:4001/api/v1/health',
  'chat-service': 'https://chat-service:4002/api/v1/health',
  'connector-service': 'https://connector-service:4003/api/v1/health',
  'routing-service': 'https://routing-service:4004/api/v1/health',
  'memory-service': 'https://memory-service:4005/api/v1/health',
  'file-service': 'https://file-service:4006/api/v1/health',
  'audit-service': 'https://audit-service:4007/api/v1/health',
  'ollama-service': 'https://ollama-service:4008/api/v1/health',
  'client-logs-service': 'https://client-logs-service:4010/api/v1/health',
  'server-logs-service': 'https://server-logs-service:4011/api/v1/health',
  'image-service': 'https://image-service:4012/api/v1/health',
  'file-generation-service': 'https://file-generation-service:4013/api/v1/health',
  'workspace-service': 'https://workspace-service:4014/api/v1/health',
  'agent-service': 'https://agent-service:4015/api/v1/health',
  'research-service': 'https://research-service:4016/api/v1/health',
  'llamacpp-service': 'https://llamacpp-service:4017/api/v1/health',
  'payment-service': 'https://payment-service:4018/api/v1/health',
};

export const HEALTH_CHECK_TIMEOUT_MS = 5000;

/**
 * Dependencies a service checks itself and reports in its own `/health` body,
 * surfaced here as if they were services of their own: they get a
 * `claw_service_up{service=…}` series (ADR-113), uptime history and a status
 * component, without health-service ever connecting to them.
 *
 * `clamav`: file-service PINGs clamd and answers `services.clamav` =
 * `up`/`down`/`disabled`. A missing key, `disabled`, or file-service itself
 * down means "not measured" — the row is omitted, never reported DOWN.
 *
 * `crawl4ai` / `flaresolverr` / `firecrawl`: research-service reads each
 * scraping sidecar's `fetch_strategy_configs` row and, when it is enabled,
 * GETs its cheap health route (ADR-121 addendum). Same `up`/`down`/`disabled`
 * contract; a down sidecar makes research `degraded`, never down.
 *
 * A dependency reported `disabled` gets no row and no series (it is not an
 * outage), but is listed in `AggregatedHealth.disabledDependencies` so the
 * status page shows it as DISABLED instead of "unknown".
 */
export const DEPENDENCY_PROBES: readonly DependencyProbe[] = [
  { name: 'clamav', source: 'file-service', key: 'clamav' },
  { name: 'crawl4ai', source: 'research-service', key: 'crawl4ai' },
  { name: 'flaresolverr', source: 'research-service', key: 'flaresolverr' },
  { name: 'firecrawl', source: 'research-service', key: 'firecrawl' },
];

/** What a source service reports for a dependency it has switched off on purpose. */
export const DEPENDENCY_DISABLED_STATUS = 'disabled';

/** The `error` a derived dependency carries when its source reports it down. Host-free. */
export const DEPENDENCY_DOWN_ERROR = 'dependency not answering (reported by its service)';
