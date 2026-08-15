import { ROUTER_TRACE_EVENT_PATTERNS } from '@claw/shared-constants';
import type { RouterTraceEvent } from '@claw/shared-types';
import { StreamEventType } from '../../../common/enums';
import { type ChatStreamService } from '../services/chat-stream.service';
import { RouterTraceStreamService } from '../services/router-trace-stream.service';
import { toRouterTraceStages } from '../utilities/router-trace-stage.utility';

const event = (
  type: string,
  sequence: number,
  payload: Record<string, unknown> = {},
): RouterTraceEvent =>
  ({
    schemaVersion: 'router-trace-v1',
    eventId: `e${String(sequence)}`,
    traceId: 't1',
    requestId: 'r1',
    threadId: 'thread-1',
    sequence,
    timestamp: '2026-01-01T00:00:00.000Z',
    type,
    payload,
  }) as RouterTraceEvent;

const build = (): { service: RouterTraceStreamService; emitProgressStage: jest.Mock } => {
  const emitProgressStage = jest.fn();
  return {
    service: new RouterTraceStreamService({
      emitProgressStage,
    } as unknown as ChatStreamService),
    emitProgressStage,
  };
};

describe('toRouterTraceStages', () => {
  // Sorting by the trace's own sequence rather than arrival order is the whole
  // point of carrying sequence numbers: an out-of-order or replayed batch must
  // still render correctly.
  it('orders by sequence, not by array position', () => {
    const stages = toRouterTraceStages([
      event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED, 3),
      event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, 1),
      event(ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED, 2),
    ]);

    expect(stages.map((s) => s.sequence)).toEqual([1, 2, 3]);
  });

  // The trace serves an operator and a user; showing every candidate event
  // would make the timeline unreadable without telling a user anything.
  it('drops operator-only events', () => {
    const stages = toRouterTraceStages([
      event(ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_EXCLUDED, 1),
      event(ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_SCORED, 2),
      event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, 3),
    ]);

    expect(stages).toHaveLength(1);
  });

  // Repeated frames of one phase must upsert, not stack rows in the timeline.
  it('gives one stage id per phase', () => {
    const stages = toRouterTraceStages([
      event(ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED, 1),
      event(ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED, 2),
    ]);

    expect(stages[0]?.stageId).toBe(stages[1]?.stageId);
  });

  it('marks a completed decision completed and a failed one an error', () => {
    const [done] = toRouterTraceStages([event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED, 1)]);
    const [failed] = toRouterTraceStages([event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED, 1)]);

    expect(done?.status).toBe('completed');
    expect(failed?.status).toBe('error');
  });

  it('describes a decline with its stable reason code', () => {
    const [stage] = toRouterTraceStages([
      event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED, 1, {
        unavailableReason: 'CONFIGURATION_DISABLED',
      }),
    ]);

    expect(stage?.description).toBe('CONFIGURATION_DISABLED');
  });

  // A missing field must be omitted rather than rendered as "undefined".
  it('omits a description when there is nothing safe to say', () => {
    const [stage] = toRouterTraceStages([event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED, 1)]);

    expect(stage?.description).toBeUndefined();
  });
});

describe('RouterTraceStreamService.render', () => {
  it('emits one progress stage per visible event', () => {
    const { service, emitProgressStage } = build();

    const rendered = service.render('thread-1', [
      event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, 1),
      event(ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED, 2),
    ]);

    expect(rendered).toBe(2);
    expect(emitProgressStage).toHaveBeenCalledTimes(2);
  });

  // ROUTER_COMPLETED has been declared in the enum and handled by the frontend
  // with NO producer anywhere, so the router stage never resolved — it sat
  // active until the answer replaced it.
  it('finally emits ROUTER_COMPLETED when a decision was reached', () => {
    const { service, emitProgressStage } = build();

    service.render('thread-1', [
      event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED, 1, { displayName: 'gemini-2.5-flash' }),
    ]);

    expect(emitProgressStage).toHaveBeenCalledWith(
      'thread-1',
      StreamEventType.ROUTER_COMPLETED,
      expect.objectContaining({ status: 'completed', description: 'gemini-2.5-flash' }),
    );
  });

  it('does not close the router stage when routing failed', () => {
    const { service, emitProgressStage } = build();

    service.render('thread-1', [event(ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED, 1)]);

    const closed = emitProgressStage.mock.calls.some(
      (call) => call[1] === StreamEventType.ROUTER_COMPLETED,
    );
    expect(closed).toBe(false);
  });

  // A route with no live stream is not an error.
  it('ignores a batch with no thread', () => {
    const { service, emitProgressStage } = build();

    expect(service.render('', [event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, 1)])).toBe(0);
    expect(emitProgressStage).not.toHaveBeenCalled();
  });

  it('ignores an empty batch', () => {
    const { service, emitProgressStage } = build();

    expect(service.render('thread-1', [])).toBe(0);
    expect(emitProgressStage).not.toHaveBeenCalled();
  });

  // A malformed or hostile batch must not be able to flood a client.
  it('truncates an oversized batch', () => {
    const { service, emitProgressStage } = build();
    const many = Array.from({ length: 500 }, (_, i) =>
      event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, i + 1),
    );

    service.render('thread-1', many);

    expect(emitProgressStage.mock.calls.length).toBeLessThanOrEqual(200);
  });

  // A trace is evidence about a decision the user is already receiving.
  it('never throws when the stream rejects', () => {
    const emitProgressStage = jest.fn().mockImplementation(() => {
      throw new Error('stream closed');
    });
    const service = new RouterTraceStreamService({
      emitProgressStage,
    } as unknown as ChatStreamService);

    expect(() =>
      service.render('thread-1', [event(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, 1)]),
    ).not.toThrow();
  });
});
