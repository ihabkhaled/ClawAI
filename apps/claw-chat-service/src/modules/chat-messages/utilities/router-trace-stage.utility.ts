import { ROUTER_TRACE_EVENT_PATTERNS } from '@claw/shared-constants';
import type { RouterTraceEvent } from '@claw/shared-types';
import {
  ROUTER_TRACE_STAGE_ID_PREFIX,
  ROUTER_TRACE_STAGE_LABELS,
} from '../constants/router-trace-stage.constants';
import type { RouterTraceStage } from '../types/router-trace-stage.types';

/**
 * Turns one safe trace event into a progress stage the chat stream can carry.
 *
 * Returns null for events with nothing an end user should see. The trace is
 * built for two audiences — an operator debugging a chain and a user watching a
 * spinner — and flooding the second with candidate-level detail would make the
 * timeline unreadable without telling them anything actionable.
 */
export function toRouterTraceStage(event: RouterTraceEvent): RouterTraceStage | null {
  const label = ROUTER_TRACE_STAGE_LABELS[event.type];
  if (!label) {
    return null;
  }

  return {
    // One stage id per event TYPE, not per event, so repeated frames of the
    // same phase upsert in place rather than stacking rows in the timeline.
    stageId: `${ROUTER_TRACE_STAGE_ID_PREFIX}${event.type}`,
    label,
    description: describe(event),
    status: resolveStatus(event),
    sequence: event.sequence,
  };
}

/** A terminal event closes its stage; everything else is still in flight. */
function resolveStatus(event: RouterTraceEvent): RouterTraceStage['status'] {
  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED) {
    return 'completed';
  }
  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED) {
    return 'error';
  }
  return 'active';
}

/**
 * Builds the one-line description shown under a stage.
 *
 * Only allowlisted payload fields are read. Anything absent is simply omitted
 * rather than rendered as "undefined", because these strings reach a user.
 */
function describe(event: RouterTraceEvent): string | undefined {
  const { payload } = event;

  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED) {
    const parts = [payload.workflow, payload.displayName ?? payload.deploymentId].filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    );
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }

  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED) {
    // The unavailable reason is a stable code an operator can search for; the
    // error code is the provider-side canonical one. Either is safe.
    return payload.unavailableReason ?? payload.errorCode;
  }

  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED) {
    return payload.errorCode;
  }

  if (event.type === ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED) {
    return payload.displayName;
  }

  return undefined;
}

/**
 * Reduces a whole trace to the stages worth showing, in sequence order.
 *
 * Sorting by the trace's own sequence rather than trusting arrival order is the
 * point of carrying sequence numbers at all: a batch that arrives out of order,
 * or is replayed, still renders correctly.
 */
export function toRouterTraceStages(events: readonly RouterTraceEvent[]): RouterTraceStage[] {
  return [...events]
    .sort((left, right) => left.sequence - right.sequence)
    .map((event) => toRouterTraceStage(event))
    .filter((stage): stage is RouterTraceStage => stage !== null);
}
