import {
  ROUTER_TRACE_EVENT_PATTERNS,
  ROUTER_TRACE_STAGE_ID_PREFIX,
  type RouterTraceEventPattern,
} from '@claw/shared-constants';

export { ROUTER_TRACE_STAGE_ID_PREFIX };

/**
 * User-facing label per trace event, and the allowlist of what is shown at all.
 *
 * An event absent from this map is operator-only. The trace serves two
 * audiences: someone debugging a chain wants every candidate score, a user
 * watching a spinner wants five lines. Showing all of it would make the
 * timeline unreadable without telling them anything they can act on.
 *
 * English fallback text only. The frontend recognises a stage id under
 * {@link ROUTER_TRACE_STAGE_ID_PREFIX} and renders a translated label in the
 * viewer's locale instead — these strings are what a client that does not
 * carry the router-trace i18n keys (an older build, a non-browser consumer)
 * falls back to, and what shows briefly before the locale dictionary resolves.
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
