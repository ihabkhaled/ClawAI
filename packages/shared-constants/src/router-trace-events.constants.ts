/**
 * Safe routing-trace event names.
 *
 * A frozen object rather than a string-literal union because those are banned
 * in this codebase, and because the derived type then cannot drift from the
 * values actually emitted.
 *
 * Every name fits Runtime V2's event-type regex
 * (`^[a-z][a-z0-9-]{0,58}\.[a-z][a-z0-9.-]{0,58}$`), which is what lets the
 * durable Redis journal carry them: the legacy in-memory SSE lane cannot, since
 * its per-process sequence and ring buffer do not survive a second replica.
 *
 * These carry ONLY safe evidence — reason codes, normalised labels, display
 * names, numeric scores, bands, confidence, error categories, revisions. Never
 * chain-of-thought, prompts, credentials, provider payloads or PII.
 */
export const ROUTER_TRACE_EVENT_PATTERNS = Object.freeze({
  REQUESTED: 'router.requested',
  REGISTRY_LOADED: 'router.registry.loaded',
  REQUIREMENTS_DETECTED: 'router.requirements.detected',
  POLICY_FILTER_STARTED: 'router.policy.filter-started',
  CANDIDATE_EXCLUDED: 'router.candidate.excluded',
  POLICY_FILTER_COMPLETED: 'router.policy.filter-completed',
  CANDIDATES_RANK_STARTED: 'router.candidates.rank-started',
  CANDIDATE_SCORED: 'router.candidate.scored',
  PROVIDER_ATTEMPT_STARTED: 'router.provider.attempt-started',
  PROVIDER_ATTEMPT_FAILED: 'router.provider.attempt-failed',
  PROVIDER_RETRY_STARTED: 'router.provider.retry-started',
  PROVIDER_FALLBACK_SELECTED: 'router.provider.fallback-selected',
  LOW_CONFIDENCE: 'router.low-confidence',
  DECISION_COMPLETED: 'router.decision.completed',
  DECISION_FAILED: 'router.decision.failed',
} as const);

export type RouterTraceEventPattern =
  (typeof ROUTER_TRACE_EVENT_PATTERNS)[keyof typeof ROUTER_TRACE_EVENT_PATTERNS];

/** Version discriminator, so a consumer can refuse an envelope it cannot read. */
export const ROUTER_TRACE_SCHEMA_VERSION = 'router-trace-v1';

/**
 * Cap on candidate-level events per request.
 *
 * A registry of 162 deployments would otherwise emit 162 scored events for one
 * routing decision, flooding the journal and the client for no operator
 * benefit. The excluded set is summarised by count beyond this.
 */
export const ROUTER_TRACE_MAX_CANDIDATE_EVENTS = 12;
