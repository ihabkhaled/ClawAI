import { StatusComponent } from '../enums/status-component.enum';
import { UptimeWindow } from '../enums/uptime-window.enum';
import { type ComponentMembers } from '../types/status-page.types';

/**
 * The status page (observability plan B3).
 *
 * Each component is a coarse group of services named by what a person does
 * with it. The ORDER here is the order the page shows them. Every service
 * `SERVICE_URLS` checks must appear in exactly one group; a spec enforces
 * that, so a new service cannot silently fall off the page.
 */
export const COMPONENT_MEMBERS: readonly ComponentMembers[] = [
  { component: StatusComponent.ACCOUNTS, services: ['auth-service'] },
  {
    component: StatusComponent.CHAT,
    services: ['chat-service', 'routing-service', 'connector-service', 'memory-service'],
  },
  { component: StatusComponent.FILES, services: ['file-service', 'file-generation-service'] },
  { component: StatusComponent.IMAGES, services: ['image-service'] },
  { component: StatusComponent.RESEARCH, services: ['research-service'] },
  { component: StatusComponent.PAYMENTS, services: ['payment-service'] },
  { component: StatusComponent.WORKSPACES, services: ['workspace-service'] },
  { component: StatusComponent.CODING_AGENT, services: ['agent-service'] },
  { component: StatusComponent.LOCAL_MODELS, services: ['ollama-service', 'llamacpp-service'] },
  {
    component: StatusComponent.PLATFORM,
    services: ['audit-service', 'client-logs-service', 'server-logs-service'],
  },
];

/**
 * Prometheus, on the internal Docker network. It is never published
 * (ADR-113), so the browser never talks to it; health-service reads it back.
 * A constant, like `SERVICE_URLS`: it is the compose service name, not a
 * per-deployment value.
 */
export const PROMETHEUS_BASE_URL = 'http://prometheus:9090';
export const PROMETHEUS_RANGE_PATH = '/api/v1/query_range';
export const PROMETHEUS_QUERY_TIMEOUT_MS = 5_000;

/**
 * History resolution. A bucket is DOWN/DEGRADED if any check inside it failed,
 * so a 15 s blip costs a whole bucket: the uptime is conservative by design.
 * 30 days at 5 minutes is 8,640 points per series, under Prometheus's
 * 11,000-point query_range limit.
 */
export const STATUS_BUCKET_SECONDS = 300;

/** Seconds in each uptime window. 30 d is the TSDB retention; more does not exist. */
export const UPTIME_WINDOW_SECONDS: Readonly<Record<UptimeWindow, number>> = {
  [UptimeWindow.DAY]: 86_400,
  [UptimeWindow.WEEK]: 604_800,
  [UptimeWindow.MONTH]: 2_592_000,
};

/** The windows in the order the page shows them. */
export const UPTIME_WINDOWS: readonly UptimeWindow[] = [
  UptimeWindow.DAY,
  UptimeWindow.WEEK,
  UptimeWindow.MONTH,
];

/** The window the incident list covers, and the most incidents it returns. */
export const INCIDENT_WINDOW_SECONDS = 604_800;
export const MAX_INCIDENTS = 50;

/** Uptime is integer basis points: 10,000 = 100.00 %. No floating point in the math. */
export const BASIS_POINTS = 10_000;

/**
 * How long a history read is reused. Two range queries over 30 days are not
 * free, and the page polls once a minute per open tab.
 */
export const STATUS_HISTORY_TTL_MS = 60_000;

/**
 * How long a FAILED history read is remembered. Prometheus being down must
 * not turn every page load into another 5-second timeout: one attempt, no
 * retry, and then a pause.
 */
export const STATUS_HISTORY_FAILURE_TTL_MS = 30_000;

/** The response may be kept by the admin's own browser for this long, never by a shared cache. */
export const STATUS_CACHE_CONTROL = 'private, max-age=30';

/** Per-client rate limit for the status endpoint. */
export const STATUS_THROTTLE_LIMIT = 120;
export const STATUS_THROTTLE_TTL_MS = 60_000;

/**
 * The PromQL the history is built from.
 *
 * - DATA: one series, present at every bucket where Prometheus had any
 *   health sample. A bucket with no sample is "not measured", and is left
 *   out of both sides of the uptime fraction instead of counting as up.
 * - FAILING: per-service, present ONLY at buckets where at least one check
 *   failed, so the response carries the incidents and not 8,640 × 17 ones.
 */
export const PROMQL_BUCKETS_WITH_DATA = 'count(claw_service_up)';
export const PROMQL_FAILING_BUCKETS = `min_over_time(claw_service_up[${String(STATUS_BUCKET_SECONDS)}s]) == 0`;
