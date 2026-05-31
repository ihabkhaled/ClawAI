import { AiStreamProtocol, AiStreamStage, StreamEventType } from '../../../common/enums';
import { httpStream as httpStreamMock } from '../../../common/utilities';
import { ChatStreamService } from '../services/chat-stream.service';
import { ProviderStreamExecutor } from '../managers/provider-stream-executor.manager';
import type { StreamExecutionInput } from '../types/stream-execution.types';
import type { StreamEvent } from '../types/stream.types';

jest.mock('../../../common/utilities', () => {
  const actual: Record<string, unknown> = jest.requireActual('../../../common/utilities');
  return {
    ...actual,
    httpStream: jest.fn(),
  };
});

const mockedHttpStream = httpStreamMock as unknown as jest.Mock;

async function* asyncChunks(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function collectMetricsEvents(events: StreamEvent[]): StreamEvent[] {
  return events.filter((e) => e.type === StreamEventType.METRICS);
}

function buildInput(overrides: Partial<StreamExecutionInput> = {}): StreamExecutionInput {
  return {
    threadId: 'thread-1',
    messageId: 'msg-1',
    provider: 'local-ollama',
    model: 'qwen3:1.7b',
    url: 'http://ollama/api/chat',
    body: {},
    protocol: AiStreamProtocol.OLLAMA_NDJSON,
    startMs: Date.now(),
    promptTokensEstimate: 10,
    timeoutMs: 30_000,
    abortSignal: new AbortController().signal,
    ...overrides,
  };
}

describe('ProviderStreamExecutor — rich final metrics', () => {
  let streamService: ChatStreamService;
  let executor: ProviderStreamExecutor;
  let captured: StreamEvent[];

  beforeEach(() => {
    streamService = new ChatStreamService();
    captured = [];
    streamService.eventBus.subscribe((e) => captured.push(e));
    executor = new ProviderStreamExecutor(streamService);
    mockedHttpStream.mockReset();
  });

  it('emits a final METRICS event enriched with modelLoad/promptEval/generation + bottleneck on Ollama done frames', async () => {
    mockedHttpStream.mockResolvedValueOnce({
      ok: true,
      status: 200,
      chunks: asyncChunks([
        '{"response":"Hello","done":false}\n',
        '{"response":" world","done":false}\n',
        '{"response":"!","done":true,"done_reason":"stop","total_duration":3000000000,"load_duration":500000000,"prompt_eval_count":12,"prompt_eval_duration":200000000,"eval_count":40,"eval_duration":2200000000}\n',
      ]),
    });

    const result = await executor.run(buildInput());
    expect(result.content).toBe('Hello world!');

    const metricsEvents = collectMetricsEvents(captured);
    expect(metricsEvents.length).toBeGreaterThan(0);
    const finalMetrics = metricsEvents[metricsEvents.length - 1]?.metrics;
    expect(finalMetrics).toBeDefined();
    expect(finalMetrics?.modelLoadMs).toBe(500);
    expect(finalMetrics?.promptEvalMs).toBe(200);
    expect(finalMetrics?.generationMs).toBe(2200);
    expect(finalMetrics?.totalMs).toBe(3000);
    expect(finalMetrics?.bottleneck?.stage).toBe('generation');
    expect(finalMetrics?.bottleneck?.durationMs).toBe(2200);
  });

  it('includes a stageTimings map on the final METRICS event covering the lifecycle stages that actually fired', async () => {
    mockedHttpStream.mockResolvedValueOnce({
      ok: true,
      status: 200,
      chunks: asyncChunks([
        '{"response":"Hi","done":false}\n',
        '{"response":"!","done":true,"total_duration":1000000000,"load_duration":100000000,"prompt_eval_duration":100000000,"eval_duration":800000000,"eval_count":2}\n',
      ]),
    });

    await executor.run(buildInput());

    const metricsEvents = collectMetricsEvents(captured);
    const finalMetrics = metricsEvents[metricsEvents.length - 1]?.metrics;
    expect(finalMetrics?.stageTimings).toBeDefined();
    const timings = finalMetrics?.stageTimings ?? {};
    expect(timings[AiStreamStage.CONNECTING_PROVIDER]).toBeDefined();
    expect(timings[AiStreamStage.WAITING_FIRST_TOKEN]).toBeDefined();
    expect(timings[AiStreamStage.GENERATING]).toBeDefined();
    // Every stage in the map must have both startedAtMs and endedAtMs by finalize.
    for (const window of Object.values(timings)) {
      expect(window.startedAtMs).toBeGreaterThan(0);
      expect(window.endedAtMs).toBeGreaterThanOrEqual(window.startedAtMs);
    }
  });

  it('omits modelLoad/promptEval/generation when the runtime does not report final timings (cloud SSE)', async () => {
    mockedHttpStream.mockResolvedValueOnce({
      ok: true,
      status: 200,
      chunks: asyncChunks([
        'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    });

    await executor.run(buildInput({ protocol: AiStreamProtocol.OPENAI_SSE }));

    const metricsEvents = collectMetricsEvents(captured);
    const finalMetrics = metricsEvents[metricsEvents.length - 1]?.metrics;
    expect(finalMetrics?.modelLoadMs).toBeUndefined();
    expect(finalMetrics?.promptEvalMs).toBeUndefined();
    expect(finalMetrics?.generationMs).toBeUndefined();
    expect(finalMetrics?.bottleneck).toBeUndefined();
    // Stage timings still get captured for SSE because we transition the same
    // lifecycle stages — the FE timeline benefits even without per-stage durations.
    expect(finalMetrics?.stageTimings).toBeDefined();
  });

  it('selects modelLoad as the bottleneck when load_duration dwarfs eval_duration', async () => {
    mockedHttpStream.mockResolvedValueOnce({
      ok: true,
      status: 200,
      chunks: asyncChunks([
        '{"response":"x","done":true,"total_duration":11000000000,"load_duration":10000000000,"prompt_eval_duration":100000000,"eval_duration":900000000,"eval_count":4}\n',
      ]),
    });

    await executor.run(buildInput());

    const metricsEvents = collectMetricsEvents(captured);
    const finalMetrics = metricsEvents[metricsEvents.length - 1]?.metrics;
    expect(finalMetrics?.bottleneck?.stage).toBe('modelLoad');
    expect(finalMetrics?.bottleneck?.percentOfTotal).toBeGreaterThan(0.8);
  });
});
