import { Injectable, Logger } from '@nestjs/common';
import { ROUTER_TRACE_EVENT_PATTERNS } from '@claw/shared-constants';
import { EventPattern, type RouterTraceEvent  } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import type { CloudRouteResult } from '../types/cloud-router.types';
import type { RouterTraceContext } from '../types/router-trace.types';
import {
  buildAttemptEvents,
  buildExclusionEvents,
  buildTraceEvent,
} from '../utilities/router-trace-builder.utility';

/**
 * Turns a completed route into its safe trace and publishes it.
 *
 * Published as ONE batch per decision rather than one message per event. A walk
 * can emit around thirty events, and thirty separate publishes per request
 * would cost more than the routing did — while also making ordering depend on
 * broker delivery rather than on the sequence numbers the batch already
 * carries.
 *
 * Publishing is best effort. A trace is evidence about a decision, not part of
 * it; failing a request because its audit trail could not be published would
 * invert the priority.
 */
@Injectable()
export class RouterTraceService {
  private readonly logger = new Logger(RouterTraceService.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  /** Builds the full trace for one route result. */
  buildTrace(context: RouterTraceContext, result: CloudRouteResult): RouterTraceEvent[] {
    const events: RouterTraceEvent[] = [
      buildTraceEvent(context, ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, {}),
    ];

    if (!result.available) {
      // A decline is as informative as a decision — more so, since it is the
      // case an operator has to act on — so it gets a terminal event carrying
      // the reason rather than an empty trace.
      events.push(
        ...buildExclusionEvents(context, result.excluded ?? []),
        buildTraceEvent(context, ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED, {
          unavailableReason: result.reason,
        }),
      );
      return events;
    }

    events.push(
      buildTraceEvent(context, ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED, {
        configRevision: result.configurationRevision,
      }),
      ...buildExclusionEvents(context, result.excluded),
      ...buildAttemptEvents(context, result.outcome.attempts),
    );

    if (result.outcome.ok) {
      events.push(
        buildTraceEvent(context, ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED, {
          deploymentId: result.outcome.decision.deploymentId,
          workflow: result.outcome.decision.workflow,
          confidence: result.outcome.decision.confidence,
          fallbackDepth: result.outcome.fallbackDepth,
          configRevision: result.configurationRevision,
        }),
      );
      return events;
    }

    events.push(
      buildTraceEvent(context, ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED, {
        errorCode: result.outcome.code,
        configRevision: result.configurationRevision,
      }),
    );
    return events;
  }

  /** Publishes a built trace. Never throws. */
  async publish(events: readonly RouterTraceEvent[]): Promise<boolean> {
    if (events.length === 0) {
      return false;
    }

    try {
      await this.rabbitMQService.publish(EventPattern.ROUTER_TRACE_EMITTED, {
        traceId: events[0]?.traceId,
        requestId: events[0]?.requestId,
        threadId: events[0]?.threadId ?? null,
        events,
      });
      this.logger.debug(
        `publish: ${String(events.length)} events for trace=${events[0]?.traceId ?? 'unknown'}`,
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`publish: trace publish failed - ${message}`);
      return false;
    }
  }

  /** Build and publish in one step. */
  async emit(context: RouterTraceContext, result: CloudRouteResult): Promise<boolean> {
    return this.publish(this.buildTrace(context, result));
  }
}
