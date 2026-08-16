import { ROUTER_TRACE_EVENT_PATTERNS } from '@claw/shared-constants';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import { RouterTraceService } from '../services/router-trace.service';
import type { CloudRouteResult } from '../types/cloud-router.types';
import type { RouterTraceContext } from '../types/router-trace.types';

const context = (): RouterTraceContext => ({
  traceId: 'trace-1',
  requestId: 'req-1',
  threadId: 'thread-1',
  sequence: 0,
});

const build = (
  publish: jest.Mock = jest.fn().mockResolvedValue(undefined),
): { service: RouterTraceService; publish: jest.Mock } => ({
  service: new RouterTraceService({ publish } as unknown as RabbitMQService),
  publish,
});

const success: CloudRouteResult = {
  available: true,
  configurationRevision: 3,
  excluded: [],
  outcome: {
    ok: true,
    decision: { deploymentId: 'dep_1', workflow: 'DIRECT', confidence: 0.91, reasonCodes: [] },
    attempts: [
      {
        entryId: 'e1',
        order: 1,
        attemptNumber: 1,
        provider: RouterProvider.GEMINI,
        providerModelId: 'gemini-3.5-flash-lite',
        deploymentId: 'dep_1',
        outcome: 'SUCCESS',
        code: null,
        safeMessage: null,
        latencyMs: 716,
        wasRepair: false,
      },
    ],
    fallbackDepth: 0,
  },
};

describe('RouterTraceService.buildTrace', () => {
  it('opens with a requested event and closes with a completed one', () => {
    const { service } = build();
    const events = service.buildTrace(context(), success);

    expect(events[0]?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.REQUESTED);
    expect(events.at(-1)?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.DECISION_COMPLETED);
  });

  it('carries the decision on the terminal event', () => {
    const { service } = build();
    const terminal = service.buildTrace(context(), success).at(-1);

    expect(terminal?.payload.deploymentId).toBe('dep_1');
    expect(terminal?.payload.confidence).toBe(0.91);
    expect(terminal?.payload.configRevision).toBe(3);
  });

  it('numbers the whole trace monotonically with no gaps', () => {
    const { service } = build();
    const events = service.buildTrace(context(), success);

    expect(events.map((e) => e.sequence)).toEqual(
      Array.from({ length: events.length }, (_, i) => i + 1),
    );
  });

  // A decline is the case an operator has to act on, so it must produce a
  // terminal event carrying the reason rather than an empty trace.
  it('traces an unavailable router with its reason', () => {
    const { service } = build();
    const events = service.buildTrace(context(), {
      available: false,
      reason: 'CONFIGURATION_DISABLED',
    });

    const terminal = events.at(-1);
    expect(terminal?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.DECISION_FAILED);
    expect(terminal?.payload.unavailableReason).toBe('CONFIGURATION_DISABLED');
  });

  it('reports excluded entries when the chain could not run', () => {
    const { service } = build();
    const events = service.buildTrace(context(), {
      available: false,
      reason: 'NO_RUNNABLE_CHAIN_ENTRY',
      excluded: [
        {
          entryId: 'e3',
          order: 3,
          provider: RouterProvider.OLLAMA_CLOUD,
          modelAlias: 'glm-4.7:cloud',
          reason: 'DEPLOYMENT_UNRESOLVED',
        },
      ],
    });

    const exclusion = events.find((e) => e.type === ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_EXCLUDED);
    expect(exclusion?.payload.displayName).toBe('glm-4.7:cloud');
  });

  it('traces a chain that ran but failed, with the canonical code', () => {
    const { service } = build();
    const events = service.buildTrace(context(), {
      available: true,
      configurationRevision: 3,
      excluded: [],
      outcome: {
        ok: false,
        code: RouterErrorCode.PROVIDER_5XX,
        attempts: [],
        quarantinedDeploymentIds: [],
      },
    });

    expect(events.at(-1)?.payload.errorCode).toBe(RouterErrorCode.PROVIDER_5XX);
  });
});

describe('RouterTraceService.publish', () => {
  // Thirty separate publishes per request would cost more than the routing did,
  // and would make ordering depend on broker delivery rather than the sequence
  // numbers the batch already carries.
  it('publishes the whole trace as one message', async () => {
    const { service, publish } = build();

    await service.emit(context(), success);

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      EventPattern.ROUTER_TRACE_EMITTED,
      expect.objectContaining({ traceId: 'trace-1', threadId: 'thread-1' }),
    );
  });

  // A trace is evidence about a decision, not part of it.
  it('never throws when the broker is down', async () => {
    const { service } = build(jest.fn().mockRejectedValue(new Error('broker down')));

    await expect(service.emit(context(), success)).resolves.toBe(false);
  });

  it('does not publish an empty trace', async () => {
    const { service, publish } = build();

    await expect(service.publish([])).resolves.toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });
});
