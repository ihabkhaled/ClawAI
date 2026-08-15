import { ROUTER_TRACE_EVENT_PATTERNS, type RouterTraceEventPattern } from '@claw/shared-constants';

/** Namespaces router stages so they cannot collide with an execution stage id. */
export const ROUTER_TRACE_STAGE_ID_PREFIX = 'router-trace:';

/**
 * User-facing label per trace event, and the allowlist of what is shown at all.
 *
 * An event absent from this map is operator-only. The trace serves two
 * audiences: someone debugging a chain wants every candidate score, a user
 * watching a spinner wants five lines. Showing all of it would make the
 * timeline unreadable without telling them anything they can act on.
 *
 * These strings are placeholders pending i18n; the frontend batch replaces them
 * with translated keys in all 13 locales.
 */
export const ROUTER_TRACE_STAGE_LABELS: Readonly<Partial<Record<RouterTraceEventPattern, string>>> =
  Object.freeze({
    [ROUTER_TRACE_EVENT_PATTERNS.REQUESTED]: 'Analyzing request',
    [ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED]: 'Loading model registry',
    [ROUTER_TRACE_EVENT_PATTERNS.POLICY_FILTER_COMPLETED]: 'Applying policy filters',
    [ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED]: 'Consulting router',
    [ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED]: 'Router attempt failed',
    [ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_FALLBACK_SELECTED]: 'Falling back',
    [ROUTER_TRACE_EVENT_PATTERNS.LOW_CONFIDENCE]: 'Low confidence — escalating',
    [ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED]: 'Model selected',
    [ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED]: 'Routing failed',
  });

/** Largest trace batch accepted. A larger one is truncated rather than dropped. */
export const ROUTER_TRACE_MAX_EVENTS_PER_BATCH = 200;
