import { ROUTER_TRACE_EVENT_PATTERNS } from '@claw/shared-constants';
import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import type { ExcludedChainEntry } from '../types/router-chain-resolution.types';
import type { RouterAttemptRecord } from '../types/router-inference.types';
import type { RouterTraceContext } from '../types/router-trace.types';
import {
  buildAttemptEvents,
  buildExclusionEvents,
  buildTraceEvent,
} from '../utilities/router-trace-builder.utility';

const context = (): RouterTraceContext => ({
  traceId: 'trace-1',
  requestId: 'req-1',
  threadId: 'thread-1',
  sequence: 0,
});

const FIXED = (): Date => new Date('2026-01-01T00:00:00.000Z');

const attempt = (overrides: Partial<RouterAttemptRecord> = {}): RouterAttemptRecord => ({
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
  ...overrides,
});

const excluded = (overrides: Partial<ExcludedChainEntry> = {}): ExcludedChainEntry => ({
  entryId: 'e3',
  order: 3,
  provider: RouterProvider.OLLAMA_CLOUD,
  modelAlias: 'glm-4.7:cloud',
  reason: 'DEPLOYMENT_UNRESOLVED',
  ...overrides,
});

describe('buildTraceEvent', () => {
  it('stamps the schema version so an old consumer can refuse it', () => {
    const event = buildTraceEvent(context(), ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, {}, FIXED);
    expect(event.schemaVersion).toBe('router-trace-v1');
  });

  // Ordering and dedupe must not depend on arrival order.
  it('numbers events monotonically from 1', () => {
    const ctx = context();
    const a = buildTraceEvent(ctx, ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, {}, FIXED);
    const b = buildTraceEvent(ctx, ROUTER_TRACE_EVENT_PATTERNS.REGISTRY_LOADED, {}, FIXED);

    expect(a.sequence).toBe(1);
    expect(b.sequence).toBe(2);
    expect(a.eventId).not.toBe(b.eventId);
  });

  // The counter lives on the context, not a module global, so two concurrent
  // requests cannot interleave their numbering.
  it('keeps two concurrent traces independent', () => {
    const first = context();
    const second = { ...context(), traceId: 'trace-2' };

    buildTraceEvent(first, ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, {}, FIXED);
    const secondFirst = buildTraceEvent(second, ROUTER_TRACE_EVENT_PATTERNS.REQUESTED, {}, FIXED);

    expect(secondFirst.sequence).toBe(1);
    expect(secondFirst.traceId).toBe('trace-2');
  });

  // Runtime V2's journal rejects a type that does not match its pattern, so an
  // unroutable name would silently drop the whole trace.
  it('emits names Runtime V2 will accept', () => {
    const pattern = /^[a-z][a-z0-9-]{0,58}\.[a-z][a-z0-9.-]{0,58}$/;
    for (const type of Object.values(ROUTER_TRACE_EVENT_PATTERNS)) {
      expect(type).toMatch(pattern);
    }
  });
});

describe('buildExclusionEvents', () => {
  it('reports each excluded candidate with its reason', () => {
    const events = buildExclusionEvents(context(), [excluded()], FIXED);

    const exclusion = events[0];
    expect(exclusion?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_EXCLUDED);
    expect(exclusion?.payload.reasonCode).toBe('DEPLOYMENT_UNRESOLVED');
    expect(exclusion?.payload.displayName).toBe('glm-4.7:cloud');
  });

  // A registry of 162 deployments would otherwise emit 162 events for one
  // decision and flood both the journal and the client.
  it('caps candidate events and still reports the true total', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      excluded({ entryId: `e${String(i)}`, modelAlias: `model-${String(i)}` }),
    );

    const events = buildExclusionEvents(context(), many, FIXED);
    const exclusions = events.filter(
      (e) => e.type === ROUTER_TRACE_EVENT_PATTERNS.CANDIDATE_EXCLUDED,
    );
    const completed = events.find(
      (e) => e.type === ROUTER_TRACE_EVENT_PATTERNS.POLICY_FILTER_COMPLETED,
    );

    expect(exclusions).toHaveLength(12);
    expect(completed?.payload.excludedCount).toBe(40);
  });

  it('still closes the filter phase when nothing was excluded', () => {
    const events = buildExclusionEvents(context(), [], FIXED);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.excludedCount).toBe(0);
  });
});

describe('buildAttemptEvents', () => {
  it('opens with an attempt-started event', () => {
    const events = buildAttemptEvents(context(), [attempt()], FIXED);
    expect(events[0]?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_STARTED);
  });

  // An operator needs to tell "we re-asked the same model" from "we moved on".
  it('names a second attempt a retry rather than a fresh attempt', () => {
    const events = buildAttemptEvents(context(), [attempt({ attemptNumber: 2 })], FIXED);
    expect(events[0]?.type).toBe(ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_RETRY_STARTED);
  });

  it('emits a failure event carrying the canonical code', () => {
    const events = buildAttemptEvents(
      context(),
      [
        attempt({
          outcome: 'FAILURE',
          code: RouterErrorCode.PROVIDER_5XX,
          safeMessage: 'upstream',
        }),
      ],
      FIXED,
    );

    const failure = events.find(
      (e) => e.type === ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED,
    );
    expect(failure?.payload.errorCode).toBe(RouterErrorCode.PROVIDER_5XX);
    expect(failure?.payload.latencyMs).toBe(716);
  });

  it('emits no failure event for a successful attempt', () => {
    const events = buildAttemptEvents(context(), [attempt()], FIXED);
    expect(events.some((e) => e.type === ROUTER_TRACE_EVENT_PATTERNS.PROVIDER_ATTEMPT_FAILED)).toBe(
      false,
    );
  });

  it('marks the repair attempt as such', () => {
    const events = buildAttemptEvents(
      context(),
      [attempt({ attemptNumber: 2, wasRepair: true })],
      FIXED,
    );
    expect(events[0]?.payload.wasRepair).toBe(true);
  });

  // These events reach a browser. A prompt or provider body must never ride along.
  it('carries no field that could hold user or provider content', () => {
    const events = [
      ...buildAttemptEvents(
        context(),
        [attempt({ outcome: 'FAILURE', code: RouterErrorCode.TIMEOUT, safeMessage: 'TIMEOUT' })],
        FIXED,
      ),
      ...buildExclusionEvents(context(), [excluded()], FIXED),
    ];

    for (const event of events) {
      const keys = Object.keys(event.payload);
      expect(keys).not.toContain('prompt');
      expect(keys).not.toContain('message');
      expect(keys).not.toContain('rawResponse');
      expect(keys).not.toContain('reasoning');
      expect(keys).not.toContain('apiKey');
    }
  });

  it('produces nothing for a walk with no attempts', () => {
    expect(buildAttemptEvents(context(), [], FIXED)).toEqual([]);
  });
});
