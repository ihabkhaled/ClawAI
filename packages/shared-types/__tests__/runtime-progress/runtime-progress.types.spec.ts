import { RUNTIME_PROGRESS_EVENT_PATTERNS } from '../../../shared-constants/src/runtime-progress-events.constants';
import {
  type ClawRuntimeProgressEvent,
  type RuntimeProbeReport,
  RuntimeExecutionProfile,
  RuntimeModality,
  RuntimeProbeStatus,
  RuntimeProgressConfidence,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
  StreamingErrorType,
  VisibleReasoningSource,
} from '../../src/runtime-progress';

describe('runtime-progress shared types', () => {
  it('exports every enum with the expected member counts', () => {
    expect(Object.keys(RuntimeProvider)).toHaveLength(4);
    expect(Object.keys(RuntimeModality)).toHaveLength(3);
    expect(Object.keys(RuntimeProgressStage)).toHaveLength(25);
    expect(Object.keys(RuntimeProgressEventType)).toHaveLength(11);
    expect(Object.keys(RuntimeProgressConfidence)).toHaveLength(5);
    expect(Object.keys(RuntimeExecutionProfile)).toHaveLength(7);
    expect(Object.keys(StreamingErrorType)).toHaveLength(12);
    expect(Object.keys(VisibleReasoningSource)).toHaveLength(8);
    expect(Object.keys(RuntimeProbeStatus)).toHaveLength(6);
  });

  it('uses stable string values for the routing-critical enums', () => {
    expect(RuntimeProvider.OLLAMA).toBe('OLLAMA');
    expect(RuntimeProvider.LLAMACPP).toBe('LLAMACPP');
    expect(RuntimeProvider.STABLE_DIFFUSION_WEBUI).toBe('STABLE_DIFFUSION_WEBUI');
    expect(RuntimeProvider.COMFYUI).toBe('COMFYUI');
    expect(RuntimeProgressStage.GENERATING).toBe('GENERATING');
    expect(RuntimeProbeStatus.REACHABLE).toBe('REACHABLE');
  });

  it('exposes the RESEARCH_* lifecycle stages with stable string values', () => {
    expect(RuntimeProgressStage.RESEARCH_STARTED).toBe('RESEARCH_STARTED');
    expect(RuntimeProgressStage.RESEARCH_SOURCES_FOUND).toBe('RESEARCH_SOURCES_FOUND');
    expect(RuntimeProgressStage.RESEARCH_FETCHING).toBe('RESEARCH_FETCHING');
    expect(RuntimeProgressStage.RESEARCH_COMPLETED).toBe('RESEARCH_COMPLETED');
    expect(RuntimeProgressStage.RESEARCH_FAILED).toBe('RESEARCH_FAILED');
  });

  it('accepts a minimal ClawRuntimeProgressEvent shape', () => {
    const minimal: ClawRuntimeProgressEvent = {
      id: 'evt-1',
      runId: 'run-1',
      version: 'runtime-progress-v1',
      provider: RuntimeProvider.OLLAMA,
      modality: RuntimeModality.TEXT,
      eventType: RuntimeProgressEventType.LIFECYCLE,
      stage: RuntimeProgressStage.IDLE,
      createdAtMs: 0,
      sequence: 0,
    };

    expect(minimal.id).toBe('evt-1');
    expect(minimal.version).toBe('runtime-progress-v1');
    expect(minimal.provider).toBe(RuntimeProvider.OLLAMA);
    expect(minimal.metrics).toBeUndefined();
  });

  it('accepts a maximal ClawRuntimeProgressEvent shape with metrics + reasoning + error', () => {
    const maximal: ClawRuntimeProgressEvent = {
      id: 'evt-2',
      runId: 'run-2',
      version: 'runtime-progress-v1',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      jobId: 'job-1',
      laneId: 'lane-A',
      parallelGroupId: 'group-1',
      provider: RuntimeProvider.LLAMACPP,
      modality: RuntimeModality.MULTIMODAL,
      modelId: 'llama-3.3-70b',
      runtimeUrl: 'http://localhost:8080',
      eventType: RuntimeProgressEventType.METRICS,
      stage: RuntimeProgressStage.GENERATING,
      createdAtMs: 1_700_000_000_000,
      sequence: 42,
      contentDelta: 'hello',
      reasoningDelta: 'thinking...',
      visibleReasoningSource: VisibleReasoningSource.THINK_TAG,
      nodeId: 'node-7',
      nodeName: 'KSampler',
      imagePreviewBase64: 'iVBORw0KGgo=',
      artifactId: 'artifact-1',
      rawProviderEventType: 'token',
      errorType: StreamingErrorType.OOM,
      errorMessage: 'gpu out of memory',
      metrics: {
        startedAtMs: 1_700_000_000_000,
        elapsedMs: 1234,
        timeToFirstByteMs: 80,
        timeToFirstTokenMs: 95,
        timeToFirstThinkingMs: 110,
        modelLoadMs: 2000,
        promptEvalMs: 500,
        generationMs: 700,
        samplingMs: 35,
        saveMs: 12,
        promptTokens: 64,
        outputTokens: 128,
        totalTokens: 192,
        tokensPerSecond: 38.5,
        currentStep: 4,
        totalSteps: 20,
        stepsPerSecond: 1.2,
        queuePosition: 0,
        progressPercent: 20,
        progressConfidence: RuntimeProgressConfidence.RUNTIME_REPORTED,
        bottleneckStage: RuntimeProgressStage.PROMPT_EVAL,
      },
    };

    expect(maximal.metrics?.tokensPerSecond).toBe(38.5);
    expect(maximal.metrics?.progressConfidence).toBe(RuntimeProgressConfidence.RUNTIME_REPORTED);
    expect(maximal.errorType).toBe(StreamingErrorType.OOM);
    expect(maximal.visibleReasoningSource).toBe(VisibleReasoningSource.THINK_TAG);
  });

  it('accepts a REACHABLE RuntimeProbeReport shape', () => {
    const reachable: RuntimeProbeReport = {
      provider: RuntimeProvider.OLLAMA,
      runtimeUrl: 'http://localhost:11434',
      status: RuntimeProbeStatus.REACHABLE,
      probedAtMs: 1_700_000_000_000,
      latencyMs: 12,
      version: '0.6.0',
      executionProfile: RuntimeExecutionProfile.CUDA,
      activeModelId: 'gemma3:4b',
      queueDepth: 0,
      models: [
        {
          id: 'gemma3:4b',
          family: 'gemma',
          sizeBytes: 3_300_000_000,
          quantization: 'Q4_K_M',
          capabilities: ['tools', 'vision'],
        },
      ],
      slots: [
        { index: 0, modelId: 'gemma3:4b', busy: true },
        { index: 1, busy: false },
      ],
      recentEvents: [
        {
          atMs: 1_700_000_000_000,
          type: 'model.loaded',
          modelId: 'gemma3:4b',
          durationMs: 1850,
          status: 'ok',
        },
      ],
      capabilities: {
        streamingText: true,
        thinking: true,
        promptProgress: true,
        nodeProgress: false,
        stepProgress: false,
        cancel: true,
        metrics: true,
      },
    };

    expect(reachable.status).toBe(RuntimeProbeStatus.REACHABLE);
    expect(reachable.executionProfile).toBe(RuntimeExecutionProfile.CUDA);
    expect(reachable.capabilities?.streamingText).toBe(true);
    expect(reachable.models?.[0]?.quantization).toBe('Q4_K_M');
    expect(reachable.slots?.[1]?.busy).toBe(false);
  });

  it('accepts an UNREACHABLE RuntimeProbeReport with errorType + errorMessage', () => {
    const unreachable: RuntimeProbeReport = {
      provider: RuntimeProvider.COMFYUI,
      runtimeUrl: 'http://localhost:8188',
      status: RuntimeProbeStatus.UNREACHABLE,
      probedAtMs: 1_700_000_000_000,
      errorType: StreamingErrorType.RUNTIME_UNREACHABLE,
      errorMessage: 'ECONNREFUSED',
    };

    expect(unreachable.status).toBe(RuntimeProbeStatus.UNREACHABLE);
    expect(unreachable.errorType).toBe(StreamingErrorType.RUNTIME_UNREACHABLE);
    expect(unreachable.models).toBeUndefined();
    expect(unreachable.latencyMs).toBeUndefined();
  });

  it("pins the ClawRuntimeProgressEvent version literal to 'runtime-progress-v1'", () => {
    const event: ClawRuntimeProgressEvent = {
      id: 'v',
      runId: 'r',
      version: 'runtime-progress-v1',
      provider: RuntimeProvider.STABLE_DIFFUSION_WEBUI,
      modality: RuntimeModality.IMAGE,
      eventType: RuntimeProgressEventType.STEP_PROGRESS,
      stage: RuntimeProgressStage.SAMPLING,
      createdAtMs: 1,
      sequence: 1,
    };

    // Compile-time pin: assigning any other string is a type error.
    const literal: 'runtime-progress-v1' = event.version;
    expect(literal).toBe('runtime-progress-v1');
  });

  it('exposes exactly 12 RuntimeProgressEventPattern entries with the canonical prefix', () => {
    const entries = Object.entries(RUNTIME_PROGRESS_EVENT_PATTERNS);
    expect(entries).toHaveLength(12);
    for (const [, value] of entries) {
      expect(value.startsWith('runtime.progress.')).toBe(true);
    }
    const values = entries.map(([, v]) => v);
    expect(new Set(values).size).toBe(values.length);
    expect(RUNTIME_PROGRESS_EVENT_PATTERNS.STAGE_CHANGED).toBe('runtime.progress.stage_changed');
    expect(RUNTIME_PROGRESS_EVENT_PATTERNS.CANCELLED).toBe('runtime.progress.cancelled');
  });

  it('narrows eventType via switch and reaches every branch deterministically', () => {
    const labelFor = (e: ClawRuntimeProgressEvent): string => {
      switch (e.eventType) {
        case RuntimeProgressEventType.LIFECYCLE:
          return 'lifecycle';
        case RuntimeProgressEventType.REASONING_DELTA:
          return 'reasoning';
        case RuntimeProgressEventType.CONTENT_DELTA:
          return 'content';
        case RuntimeProgressEventType.IMAGE_PREVIEW:
          return 'image';
        case RuntimeProgressEventType.NODE_PROGRESS:
          return 'node';
        case RuntimeProgressEventType.STEP_PROGRESS:
          return 'step';
        case RuntimeProgressEventType.PROMPT_EVAL_PROGRESS:
          return 'prompt';
        case RuntimeProgressEventType.METRICS:
          return 'metrics';
        case RuntimeProgressEventType.USAGE:
          return 'usage';
        case RuntimeProgressEventType.ARTIFACT_SAVED:
          return 'artifact';
        case RuntimeProgressEventType.ERROR:
          return 'error';
        default: {
          const exhaustive: never = e.eventType;
          return exhaustive;
        }
      }
    };

    const base: Omit<ClawRuntimeProgressEvent, 'eventType'> = {
      id: 'a',
      runId: 'b',
      version: 'runtime-progress-v1',
      provider: RuntimeProvider.OLLAMA,
      modality: RuntimeModality.TEXT,
      stage: RuntimeProgressStage.GENERATING,
      createdAtMs: 0,
      sequence: 0,
    };

    expect(labelFor({ ...base, eventType: RuntimeProgressEventType.LIFECYCLE })).toBe('lifecycle');
    expect(labelFor({ ...base, eventType: RuntimeProgressEventType.CONTENT_DELTA })).toBe(
      'content',
    );
    expect(labelFor({ ...base, eventType: RuntimeProgressEventType.ERROR })).toBe('error');
    expect(labelFor({ ...base, eventType: RuntimeProgressEventType.ARTIFACT_SAVED })).toBe(
      'artifact',
    );
  });
});
