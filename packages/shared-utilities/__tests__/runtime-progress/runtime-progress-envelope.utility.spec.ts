import {
  RuntimeModality,
  RuntimeProgressConfidence,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
} from '@claw/shared-types';

import {
  buildRuntimeProgressEvent,
  isRuntimeProgressEvent,
} from '../../src/runtime-progress/runtime-progress-envelope.utility';

describe('buildRuntimeProgressEvent', () => {
  it('fills id, createdAtMs, and version with safe defaults', () => {
    const before = Date.now();
    const event = buildRuntimeProgressEvent({
      runId: 'run-1',
      provider: RuntimeProvider.OLLAMA,
      modality: RuntimeModality.TEXT,
      eventType: RuntimeProgressEventType.CONTENT_DELTA,
      stage: RuntimeProgressStage.GENERATING,
      sequence: 0,
    });
    const after = Date.now();

    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.version).toBe('runtime-progress-v1');
    expect(event.createdAtMs).toBeGreaterThanOrEqual(before);
    expect(event.createdAtMs).toBeLessThanOrEqual(after);
  });

  it('always pins version to runtime-progress-v1 regardless of caller input', () => {
    const event = buildRuntimeProgressEvent({
      runId: 'run-2',
      provider: RuntimeProvider.OLLAMA,
      modality: RuntimeModality.TEXT,
      eventType: RuntimeProgressEventType.LIFECYCLE,
      stage: RuntimeProgressStage.CONNECTING,
      sequence: 1,
      version: 'runtime-progress-v1',
    });
    expect(event.version).toBe('runtime-progress-v1');
  });

  it('preserves caller-provided id and createdAtMs', () => {
    const event = buildRuntimeProgressEvent({
      id: 'fixed-id-123',
      createdAtMs: 1_700_000_000_000,
      runId: 'run-3',
      provider: RuntimeProvider.LLAMACPP,
      modality: RuntimeModality.TEXT,
      eventType: RuntimeProgressEventType.METRICS,
      stage: RuntimeProgressStage.GENERATING,
      sequence: 5,
    });
    expect(event.id).toBe('fixed-id-123');
    expect(event.createdAtMs).toBe(1_700_000_000_000);
  });

  it('isRuntimeProgressEvent accepts an event built by the builder', () => {
    const event = buildRuntimeProgressEvent({
      runId: 'run-4',
      provider: RuntimeProvider.OLLAMA,
      modality: RuntimeModality.TEXT,
      eventType: RuntimeProgressEventType.CONTENT_DELTA,
      stage: RuntimeProgressStage.GENERATING,
      sequence: 0,
      contentDelta: 'hi',
      metrics: {
        startedAtMs: Date.now(),
        elapsedMs: 100,
        progressConfidence: RuntimeProgressConfidence.RUNTIME_REPORTED,
      },
    });
    expect(isRuntimeProgressEvent(event)).toBe(true);
  });

  it('isRuntimeProgressEvent rejects malformed payloads', () => {
    expect(isRuntimeProgressEvent(null)).toBe(false);
    expect(isRuntimeProgressEvent(undefined)).toBe(false);
    expect(isRuntimeProgressEvent({})).toBe(false);
    expect(isRuntimeProgressEvent([])).toBe(false);
    expect(isRuntimeProgressEvent('string')).toBe(false);
    expect(
      isRuntimeProgressEvent({
        id: 'x',
        runId: 'r',
        version: 'runtime-progress-v2',
        createdAtMs: 1,
        sequence: 0,
        provider: RuntimeProvider.OLLAMA,
        modality: RuntimeModality.TEXT,
        eventType: RuntimeProgressEventType.CONTENT_DELTA,
        stage: RuntimeProgressStage.GENERATING,
      }),
    ).toBe(false);
    expect(
      isRuntimeProgressEvent({
        id: 'x',
        runId: 'r',
        version: 'runtime-progress-v1',
        createdAtMs: 1,
        sequence: 0,
        provider: 'NOT_A_PROVIDER',
        modality: RuntimeModality.TEXT,
        eventType: RuntimeProgressEventType.CONTENT_DELTA,
        stage: RuntimeProgressStage.GENERATING,
      }),
    ).toBe(false);
    expect(
      isRuntimeProgressEvent({
        // missing id
        runId: 'r',
        version: 'runtime-progress-v1',
        createdAtMs: 1,
        sequence: 0,
        provider: RuntimeProvider.OLLAMA,
        modality: RuntimeModality.TEXT,
        eventType: RuntimeProgressEventType.CONTENT_DELTA,
        stage: RuntimeProgressStage.GENERATING,
      }),
    ).toBe(false);
  });

  const baseValidPayload = (): Record<string, unknown> => ({
    id: 'evt-1',
    runId: 'run-x',
    version: 'runtime-progress-v1',
    createdAtMs: 1_700_000_000_000,
    sequence: 0,
    provider: RuntimeProvider.OLLAMA,
    modality: RuntimeModality.TEXT,
    eventType: RuntimeProgressEventType.CONTENT_DELTA,
    stage: RuntimeProgressStage.GENERATING,
  });

  it('isRuntimeProgressEvent walks every required-field guard', () => {
    // missing runId
    const noRunId = baseValidPayload();
    delete noRunId['runId'];
    expect(isRuntimeProgressEvent(noRunId)).toBe(false);

    // non-finite createdAtMs
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), createdAtMs: Number.NaN })).toBe(false);
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), createdAtMs: 'today' })).toBe(false);

    // non-finite sequence
    expect(
      isRuntimeProgressEvent({ ...baseValidPayload(), sequence: Number.POSITIVE_INFINITY }),
    ).toBe(false);
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), sequence: 'first' })).toBe(false);

    // bad modality
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), modality: 'AUDIO' })).toBe(false);

    // bad eventType
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), eventType: 'TYPING' })).toBe(false);

    // bad stage
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), stage: 'DREAMING' })).toBe(false);

    // contentDelta wrong type
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), contentDelta: 42 })).toBe(false);

    // reasoningDelta wrong type
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), reasoningDelta: { x: 1 } })).toBe(false);

    // rawProviderEventType wrong type
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), rawProviderEventType: 7 })).toBe(false);
  });

  it('isRuntimeProgressEvent enforces optional-field shapes for errorType / visibleReasoningSource / queuePosition', () => {
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), errorType: 'NOT_A_KNOWN_ERROR' })).toBe(
      false,
    );
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), errorType: 123 })).toBe(false);
    expect(
      isRuntimeProgressEvent({ ...baseValidPayload(), visibleReasoningSource: 'NOT_KNOWN' }),
    ).toBe(false);
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), visibleReasoningSource: 99 })).toBe(
      false,
    );
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), queuePosition: 'first' })).toBe(false);
    expect(isRuntimeProgressEvent({ ...baseValidPayload(), queuePosition: Number.NaN })).toBe(
      false,
    );
    // base payload (no optional fields) is still a valid event
    expect(isRuntimeProgressEvent(baseValidPayload())).toBe(true);
  });
});
