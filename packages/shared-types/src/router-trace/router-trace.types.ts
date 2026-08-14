import type { RouterTraceEventPattern } from '@claw/shared-constants';

/**
 * One safe routing-trace event.
 *
 * `sequence` is per-trace and monotonic, so a consumer can order and deduplicate
 * without trusting arrival order — the legacy SSE lane's per-process counter
 * cannot be relied on once a second replica exists.
 *
 * The payload is deliberately narrow. Everything here is an allowlisted fact:
 * a code, a label, a display name, a number or a revision. Nothing derived from
 * user content, provider output, or a prompt may appear.
 */
export interface RouterTraceEvent {
  schemaVersion: 'router-trace-v1';
  eventId: string;
  traceId: string;
  requestId: string;
  threadId: string | null;
  sequence: number;
  timestamp: string;
  type: RouterTraceEventPattern;
  payload: RouterTracePayload;
}

/**
 * Union of everything a trace event may carry.
 *
 * Kept as one optional-field shape rather than a discriminated union per event
 * because it crosses a service boundary as JSON and is consumed by a UI that
 * renders a timeline — a consumer that does not recognise a field ignores it,
 * which is what lets a new event ship without breaking an older client.
 */
export interface RouterTracePayload {
  /** Config and registry revisions the decision was made against. */
  configRevision?: number;
  registryRevision?: number;

  /** Counts, never the entities themselves. */
  candidateCount?: number;
  eligibleCount?: number;
  excludedCount?: number;

  /** Normalised request labels. Never the request text. */
  domains?: readonly string[];
  taskTypes?: readonly string[];
  language?: string;
  complexity?: string;
  risk?: string;
  privacy?: string;

  /** Candidate identity as an operator would recognise it. */
  deploymentId?: string;
  displayName?: string;
  provider?: string;

  /** Safe exclusion or failure code. */
  reasonCode?: string;
  /** Short operator-facing summary. Never provider output. */
  safeSummary?: string;

  /** Ranking evidence. */
  score?: number;
  rank?: number;
  factors?: Readonly<Record<string, number>>;

  /** Attempt evidence. */
  attemptNumber?: number;
  fallbackDepth?: number;
  errorCode?: string;
  latencyMs?: number;
  wasRepair?: boolean;

  /** Decision evidence. */
  confidence?: number;
  workflow?: string;
  /** Why the router declined, when it did. */
  unavailableReason?: string;
}
