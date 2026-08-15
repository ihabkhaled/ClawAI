import { Injectable, Logger } from '@nestjs/common';
import {
  ROUTER_TRACE_EVENT_PATTERNS,
  ROUTER_TRACE_TERMINAL_STAGE_ID,
} from '@claw/shared-constants';
import type { RouterTraceEvent } from '@claw/shared-types';
import { ProgressActorType, StreamEventType } from '../../../common/enums';
import { ROUTER_TRACE_MAX_EVENTS_PER_BATCH } from '../constants/router-trace-stage.constants';
import { ChatStreamService } from './chat-stream.service';
import { toRouterTraceStages } from '../utilities/router-trace-stage.utility';

/**
 * Renders a published routing trace onto the chat stream.
 *
 * routing-service decides asynchronously and publishes one batch per decision,
 * so this is where the routing phases first become visible to a user. Until
 * now the UI showed a single "Routing request" frame and then nothing until the
 * answer began.
 *
 * It also finally produces ROUTER_COMPLETED. That event type has been declared
 * in the enum and handled by the frontend since before this work, with no
 * producer anywhere — a contract that existed only on the consumer side.
 */
@Injectable()
export class RouterTraceStreamService {
  private readonly logger = new Logger(RouterTraceStreamService.name);

  constructor(private readonly stream: ChatStreamService) {}

  /**
   * Emits one trace batch as progress stages.
   *
   * Never throws: a trace is evidence about a decision the user is already
   * receiving, and failing their message because its timeline could not render
   * would invert the priority.
   */
  render(threadId: string, events: readonly RouterTraceEvent[]): number {
    if (!threadId || events.length === 0) {
      return 0;
    }

    // A malformed or hostile batch must not be able to flood a client.
    const bounded = events.slice(0, ROUTER_TRACE_MAX_EVENTS_PER_BATCH);
    if (bounded.length < events.length) {
      this.logger.warn(
        `render: truncated trace batch from ${String(events.length)} to ${String(bounded.length)}`,
      );
    }

    try {
      const stages = toRouterTraceStages(bounded);
      for (const stage of stages) {
        this.stream.emitProgressStage(threadId, StreamEventType.ROUTER_STARTED, {
          label: stage.label,
          description: stage.description,
          actorType: ProgressActorType.ROUTER,
          stageId: stage.stageId,
          status: stage.status,
        });
      }

      this.emitTerminal(threadId, bounded);
      return stages.length;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`render: failed to render trace for thread ${threadId} - ${message}`);
      return 0;
    }
  }

  /**
   * Closes the router phase.
   *
   * The frontend has handled ROUTER_COMPLETED for a long time and nothing ever
   * emitted it, so the router stage never resolved — it sat "active" until the
   * answer replaced it. Emitting it here is what lets the timeline settle.
   */
  private emitTerminal(threadId: string, events: readonly RouterTraceEvent[]): void {
    const decision = events.find(
      (event) => event.type === ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED,
    );
    if (!decision) {
      return;
    }

    this.stream.emitProgressStage(threadId, StreamEventType.ROUTER_COMPLETED, {
      label: 'Model selected',
      description: decision.payload.displayName ?? decision.payload.deploymentId,
      actorType: ProgressActorType.ROUTER,
      stageId: ROUTER_TRACE_TERMINAL_STAGE_ID,
      status: 'completed',
    });
  }
}
