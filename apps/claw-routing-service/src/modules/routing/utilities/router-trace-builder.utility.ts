import {
  ROUTER_TRACE_EVENT_PATTERNS,
  ROUTER_TRACE_MAX_CANDIDATE_EVENTS,
  ROUTER_TRACE_SCHEMA_VERSION,
  type RouterTraceEventPattern,
} from '@claw/shared-constants';
import type { RouterTraceEvent, RouterTracePayload } from '@claw/shared-types';
import type { ExcludedChainEntry } from '../types/router-chain-resolution.types';
import type { RouterAttemptRecord } from '../types/router-inference.types';
import type { RouterTraceContext } from '../types/router-trace.types';

/**
 * Builds one event with the next sequence number.
 *
 * The counter is owned by the caller's context rather than a module-level
 * variable so two concurrent requests cannot interleave sequences — the exact
 * defect the legacy per-process SSE counter has.
 */
export function buildTraceEvent(
  context: RouterTraceContext,
  type: RouterTraceEventPattern,
  payload: RouterTracePayload,
  now: () => Date = () => new Date(),
): RouterTraceEvent {
  context.sequence += 1;
  return {
    schemaVersion: ROUTER_TRACE_SCHEMA_VERSION,
    eventId: `${context.traceId}-${String(context.sequence)}`,
    traceId: context.traceId,
    requestId: context.requestId,
    threadId: context.threadId,
    sequence: context.sequence,
    timestamp: now().toISOString(),
    type,
    payload,
  };
}

/**
 * Turns one chain walk into its safe trace.
 *
 * Candidate-level events are capped: a registry of 162 deployments would
 * otherwise emit 162 events for a single decision and flood both the journal
 * and the client. Anything past the cap is reported as a count, so the
 * information is preserved without the volume.
 */
export function buildExclusionEvents(
  context: RouterTraceContext,
  excluded: readonly ExcludedChainEntry[],
  now?: () => Date,
): RouterTraceEvent[] {
  const events: RouterTraceEvent[] = [];
  const shown = excluded.slice(0, ROUTER_TRACE_MAX_CANDIDATE_EVENTS);

  for (const entry of shown) {
    events.push(
      buildTraceEvent(
        context,
        ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_EXCLUDED,
        {
          deploymentId: entry.entryId,
          displayName: entry.modelAlias,
          provider: entry.provider,
          reasonCode: entry.reason,
        },
        now,
      ),
    );
  }

  events.push(
    buildTraceEvent(
      context,
      ROUTER_TRACE_EVENT_PATTERNS.POLICY_FILTER_COMPLETED,
      { excludedCount: excluded.length },
      now,
    ),
  );

  return events;
}

/** Turns recorded attempts into attempt-started / failed / retry events. */
export function buildAttemptEvents(
  context: RouterTraceContext,
  attempts: readonly RouterAttemptRecord[],
  now?: () => Date,
): RouterTraceEvent[] {
  const events: RouterTraceEvent[] = [];

  for (const attempt of attempts) {
    // A repair and an ordinary retry look the same from outside unless they are
    // named differently, and an operator reading a trace needs to tell "the
    // model broke the schema and we re-asked" from "the provider timed out".
    const startType: RouterTraceEventPattern =
      attempt.attemptNumber > 1
        ? ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_RETRY_STARTED
        : ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED;

    events.push(
      buildTraceEvent(
        context,
        startType,
        {
          provider: attempt.provider,
          displayName: attempt.providerModelId,
          deploymentId: attempt.deploymentId,
          attemptNumber: attempt.attemptNumber,
          wasRepair: attempt.wasRepair,
        },
        now,
      ),
    );

    if (attempt.outcome === 'FAILURE') {
      events.push(
        buildTraceEvent(
          context,
          ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED,
          {
            provider: attempt.provider,
            displayName: attempt.providerModelId,
            attemptNumber: attempt.attemptNumber,
            errorCode: attempt.code ?? undefined,
            safeSummary: attempt.safeMessage ?? undefined,
            latencyMs: attempt.latencyMs,
          },
          now,
        ),
      );
    }
  }

  return events;
}
