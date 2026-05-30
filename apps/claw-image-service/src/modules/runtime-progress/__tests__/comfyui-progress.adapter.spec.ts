import {
  type ClawRuntimeProgressEvent,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
  StreamingErrorType,
} from '@claw/shared-types';

import { ComfyUIProgressAdapter } from '../adapters/comfyui-progress.adapter';
import { buildSd15MinimalWorkflow } from '../workflows/sd15-minimal.workflow';
import type {
  ComfyUIWebSocketLike,
  ComfyUIWorkflowPayload,
} from '../types/comfyui.types';

// A controllable fake WebSocket so we can drive the adapter through
// every WS event class deterministically without spinning up a real WS
// server.
class FakeWebSocket implements ComfyUIWebSocketLike {
  readyState = 0;
  private readonly listeners = new Map<
    string,
    Array<(event: { data?: unknown; error?: unknown }) => void>
  >();

  send(): void {
    // no-op
  }
  close(): void {
    this.readyState = 3;
  }
  addEventListener(
    type: string,
    listener: (event: { data?: unknown; error?: unknown }) => void,
  ): void {
    const arr = this.listeners.get(type) ?? [];
    arr.push(listener);
    this.listeners.set(type, arr);
  }
  removeEventListener(): void {
    // no-op
  }
  emitOpen(): void {
    this.readyState = 1;
    this.dispatch('open', {});
  }
  emitMessage(payload: unknown): void {
    this.dispatch('message', {
      data: typeof payload === 'string' ? payload : JSON.stringify(payload),
    });
  }
  emitError(err: Error): void {
    this.dispatch('error', { error: err });
  }
  private dispatch(type: string, event: { data?: unknown; error?: unknown }): void {
    const arr = this.listeners.get(type) ?? [];
    for (const fn of arr) {
      fn(event);
    }
  }
}

type ScenarioOptions = {
  scenario:
    | 'success'
    | 'cached'
    | 'execution_error'
    | 'ws_open_fail_then_success'
    | 'ws_open_always_fails'
    | 'prompt_post_invalid'
    | 'progress_step';
};

function createAdapter(opts: ScenarioOptions): {
  adapter: ComfyUIProgressAdapter;
  workflow: ComfyUIWorkflowPayload;
} {
  let wsOpenAttempt = 0;
  const ws = new FakeWebSocket();

  const wsFactory = (_url: string): ComfyUIWebSocketLike => {
    wsOpenAttempt += 1;
    const candidate = new FakeWebSocket();
    if (opts.scenario === 'ws_open_always_fails') {
      setTimeout(() => candidate.emitError(new Error('connect refused')), 5);
      return candidate;
    }
    if (opts.scenario === 'ws_open_fail_then_success') {
      if (wsOpenAttempt === 1) {
        setTimeout(() => candidate.emitError(new Error('transient')), 5);
        return candidate;
      }
      setTimeout(() => ws.emitOpen(), 5);
      driveScenario(ws, 'success');
      return ws;
    }
    setTimeout(() => ws.emitOpen(), 5);
    driveScenario(ws, opts.scenario);
    return ws;
  };

  const httpPostStub = jest.fn(async (url: string) => {
    if (url.includes('/interrupt')) {
      return {};
    }
    if (opts.scenario === 'prompt_post_invalid') {
      return { node_errors: { '3': { type: 'bad_input' } } };
    }
    return { prompt_id: 'prompt-1', number: 1 };
  });

  const httpGetStub = jest.fn(async (url: string) => {
    if (url.includes('/history/')) {
      return {
        'prompt-1': {
          outputs: {
            '9': {
              images: [{ filename: 'out.png', subfolder: '', type: 'output' }],
            },
          },
          status: { status_str: 'success', completed: true },
        },
      };
    }
    if (url.includes('/view')) {
      return new TextEncoder().encode('fakeimage').buffer;
    }
    if (url.includes('/system_stats')) {
      return { devices: [{ name: 'cpu' }] };
    }
    return {};
  });

  const adapter = new ComfyUIProgressAdapter({
    webSocketFactory: wsFactory,
    httpGet: httpGetStub as never,
    httpPost: httpPostStub as never,
  });
  const workflow = buildSd15MinimalWorkflow('client-1', {
    prompt: 'a cat',
    width: 256,
    height: 256,
  });
  return { adapter, workflow };
}

function driveScenario(ws: FakeWebSocket, scenario: ScenarioOptions['scenario']): void {
  setTimeout(() => {
    if (scenario === 'cached') {
      ws.emitMessage({ type: 'status', data: { status: { exec_info: { queue_remaining: 1 } } } });
      ws.emitMessage({ type: 'execution_cached', data: { nodes: ['4'] } });
      ws.emitMessage({ type: 'executing', data: { node: '3' } });
      ws.emitMessage({ type: 'executed', data: { node: '3' } });
      ws.emitMessage({ type: 'executing', data: { node: null } });
      return;
    }
    if (scenario === 'execution_error') {
      ws.emitMessage({ type: 'executing', data: { node: '3' } });
      ws.emitMessage({
        type: 'execution_error',
        data: { exception_message: 'CUDA out of memory' },
      });
      ws.emitMessage({ type: 'executing', data: { node: null } });
      return;
    }
    if (scenario === 'progress_step') {
      ws.emitMessage({ type: 'execution_start', data: {} });
      ws.emitMessage({ type: 'executing', data: { node: '3' } });
      ws.emitMessage({ type: 'progress', data: { node: '3', value: 5, max: 20 } });
      ws.emitMessage({ type: 'executed', data: { node: '3' } });
      ws.emitMessage({ type: 'executing', data: { node: null } });
      return;
    }
    ws.emitMessage({ type: 'status', data: { status: { exec_info: { queue_remaining: 0 } } } });
    ws.emitMessage({ type: 'execution_start', data: {} });
    ws.emitMessage({ type: 'executing', data: { node: '4' } });
    ws.emitMessage({ type: 'executed', data: { node: '4' } });
    ws.emitMessage({ type: 'executing', data: { node: '3' } });
    ws.emitMessage({ type: 'executed', data: { node: '3' } });
    ws.emitMessage({ type: 'executing', data: { node: null } });
  }, 20);
}

describe('ComfyUIProgressAdapter', () => {
  it('queue -> exec -> progress -> executed -> history emits all expected stages', async () => {
    const { adapter, workflow } = createAdapter({ scenario: 'progress_step' });
    const events: ClawRuntimeProgressEvent[] = [];
    const result = await adapter.streamGenerate({
      runId: 'run-1',
      baseUrl: 'http://comfy:8188',
      workflow,
      onEvent: (e) => events.push(e),
    });
    expect(result.promptId).toBe('prompt-1');
    expect(result.imageBase64.length).toBeGreaterThan(0);
    const stages = events.map((e) => e.stage);
    expect(stages).toContain(RuntimeProgressStage.CONNECTING);
    expect(stages).toContain(RuntimeProgressStage.EXECUTING_NODE);
    expect(stages).toContain(RuntimeProgressStage.NODE_COMPLETED);
    expect(stages).toContain(RuntimeProgressStage.FINALIZING);
    expect(stages).toContain(RuntimeProgressStage.SAVING);
    expect(stages).toContain(RuntimeProgressStage.DONE);
    const progressEvent = events.find(
      (e) =>
        e.eventType === RuntimeProgressEventType.NODE_PROGRESS &&
        e.metrics?.progressPercent !== undefined,
    );
    expect(progressEvent).toBeDefined();
    expect(progressEvent?.metrics?.progressPercent).toBeCloseTo(25);
    expect(progressEvent?.provider).toBe(RuntimeProvider.COMFYUI);
  });

  it('execution_cached marks node as cached in result', async () => {
    const { adapter, workflow } = createAdapter({ scenario: 'cached' });
    const events: ClawRuntimeProgressEvent[] = [];
    const result = await adapter.streamGenerate({
      runId: 'run-2',
      baseUrl: 'http://comfy:8188',
      workflow,
      onEvent: (e) => events.push(e),
    });
    const cachedTimings = result.nodeTimings.filter((t) => t.cached);
    expect(cachedTimings.length).toBeGreaterThan(0);
    const warming = events.find((e) => e.stage === RuntimeProgressStage.MODEL_WARMING_UP);
    expect(warming).toBeDefined();
    expect(warming?.rawProviderEventType).toBe('execution_cached');
  });

  it('execution_error normalizes to ERROR + DECODER_ERROR', async () => {
    const { adapter, workflow } = createAdapter({ scenario: 'execution_error' });
    const events: ClawRuntimeProgressEvent[] = [];
    await expect(
      adapter.streamGenerate({
        runId: 'run-3',
        baseUrl: 'http://comfy:8188',
        workflow,
        onEvent: (e) => events.push(e),
      }),
    ).rejects.toThrow(/execution error/i);
    const errEvent = events.find((e) => e.eventType === RuntimeProgressEventType.ERROR);
    expect(errEvent).toBeDefined();
    expect(errEvent?.errorType).toBe(StreamingErrorType.DECODER_ERROR);
    expect(errEvent?.errorMessage).toContain('CUDA out of memory');
  });

  it('reconnects after a single WS open failure', async () => {
    const { adapter, workflow } = createAdapter({
      scenario: 'ws_open_fail_then_success',
    });
    const events: ClawRuntimeProgressEvent[] = [];
    const result = await adapter.streamGenerate({
      runId: 'run-4',
      baseUrl: 'http://comfy:8188',
      workflow,
      onEvent: (e) => events.push(e),
    });
    expect(result.promptId).toBe('prompt-1');
    expect(events.some((e) => e.stage === RuntimeProgressStage.DONE)).toBe(true);
  });

  it('repeated WS open failures emit RUNTIME_UNREACHABLE and reject', async () => {
    const { adapter, workflow } = createAdapter({ scenario: 'ws_open_always_fails' });
    const events: ClawRuntimeProgressEvent[] = [];
    await expect(
      adapter.streamGenerate({
        runId: 'run-5',
        baseUrl: 'http://comfy:8188',
        workflow,
        onEvent: (e) => events.push(e),
      }),
    ).rejects.toThrow(/WebSocket open failed/);
    const err = events.find((e) => e.eventType === RuntimeProgressEventType.ERROR);
    expect(err?.errorType).toBe(StreamingErrorType.RUNTIME_UNREACHABLE);
  });

  it('node validation errors from /prompt fail with WORKFLOW_INVALID', async () => {
    const { adapter, workflow } = createAdapter({ scenario: 'prompt_post_invalid' });
    const events: ClawRuntimeProgressEvent[] = [];
    await expect(
      adapter.streamGenerate({
        runId: 'run-6',
        baseUrl: 'http://comfy:8188',
        workflow,
        onEvent: (e) => events.push(e),
      }),
    ).rejects.toThrow(/POST \/prompt failed/);
    const err = events.find((e) => e.eventType === RuntimeProgressEventType.ERROR);
    expect(err?.errorType).toBe(StreamingErrorType.WORKFLOW_INVALID);
  });

  it('probe returns reachable when system_stats responds', async () => {
    const { adapter } = createAdapter({ scenario: 'success' });
    const result = await adapter.probe('http://comfy:8188');
    expect(result.reachable).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('cancel posts /interrupt and reports success', async () => {
    const { adapter } = createAdapter({ scenario: 'success' });
    const result = await adapter.cancel('http://comfy:8188');
    expect(result).toBe(true);
  });
});
