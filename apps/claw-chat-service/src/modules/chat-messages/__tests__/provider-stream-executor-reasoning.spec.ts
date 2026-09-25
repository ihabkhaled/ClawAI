import { type Mock, vi } from 'vitest';
import { createFakeChatStreamBus } from './helpers/fake-chat-stream-bus.helper';
import { AiStreamProtocol, StreamEventType } from '../../../common/enums';
import { httpStream as httpStreamMock } from '../../../common/utilities';
import { THINKING_STREAM_HOLD_MAX_CHARS } from '../constants/thinking-scanner.constants';
import { ChatStreamService } from '../services/chat-stream.service';
import { ProviderStreamExecutor } from '../managers/provider-stream-executor.manager';
import type { StreamExecutionInput } from '../types/stream-execution.types';
import type { StreamEvent } from '../types/stream.types';

vi.mock('../../../common/utilities', async () => {
  const actual: Record<string, unknown> = await vi.importActual('../../../common/utilities');
  return { ...actual, httpStream: vi.fn() };
});

const mockedHttpStream = vi.mocked(httpStreamMock) as Mock;

async function* asyncChunks(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

// One OpenAI-compatible SSE frame, the shape OpenRouter / OpenAI-compatible
// presets stream (captured field names: content, reasoning, reasoning_content).
const sse = (delta: Record<string, string>): string =>
  `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`;
const DONE = 'data: [DONE]\n\n';

function input(): StreamExecutionInput {
  return {
    threadId: 'thread-1',
    messageId: 'msg-1',
    provider: 'OPENROUTER',
    model: 'z-ai/glm-5.3',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    body: {},
    protocol: AiStreamProtocol.OPENAI_SSE,
    startMs: Date.now(),
    promptTokensEstimate: 10,
    timeoutMs: 30_000,
    abortSignal: new AbortController().signal,
  };
}

describe('ProviderStreamExecutor — reasoning never streams as answer (rule 56)', () => {
  let executor: ProviderStreamExecutor;
  let captured: StreamEvent[];

  const contentDeltas = (): string[] =>
    captured
      .filter((event) => event.type === StreamEventType.CONTENT_DELTA)
      .map((event) => event.delta ?? '');
  const reasoningText = (): string =>
    captured
      .filter((event) => event.type === StreamEventType.REASONING_DELTA)
      .map((event) => event.reasoningDelta ?? '')
      .join('');

  const stream = (frames: string[]): void => {
    mockedHttpStream.mockResolvedValueOnce({ ok: true, status: 200, chunks: asyncChunks(frames) });
  };

  beforeEach(() => {
    const streamService = new ChatStreamService(createFakeChatStreamBus());
    streamService.onModuleInit();
    captured = [];
    streamService.eventBus.subscribe((event) => captured.push(event));
    executor = new ProviderStreamExecutor(streamService);
    mockedHttpStream.mockReset();
  });

  it('closing-tag-only (GLM over OpenAI-compatible SSE): no reasoning in any content delta', async () => {
    stream([
      sse({ content: 'The user resent the voice note.' }),
      sse({ content: ' I still cannot transcribe it. Be concise.</th' }),
      sse({ content: 'ink>\n\nSame voice note, same problem.' }),
      sse({ content: ' Type it out instead.' }),
      DONE,
    ]);
    const result = await executor.run(input());

    expect(contentDeltas().join('')).toBe('Same voice note, same problem. Type it out instead.');
    for (const delta of contentDeltas()) {
      expect(delta).not.toMatch(/Be concise|<\/?th/u);
    }
    expect(reasoningText()).toBe(
      'The user resent the voice note. I still cannot transcribe it. Be concise.',
    );
    expect(result.content).toBe('Same voice note, same problem. Type it out instead.');
    expect(result.reasoning).toContain('Be concise.');
  });

  it('open + close tags: reasoning to the panel, answer to the transcript', async () => {
    stream([
      sse({ content: '<think>' }),
      sse({ content: 'weigh the options' }),
      sse({ content: '</think>Pick B.' }),
      DONE,
    ]);
    const result = await executor.run(input());
    expect(contentDeltas().join('')).toBe('Pick B.');
    expect(reasoningText()).toBe('weigh the options');
    expect(result.content).toBe('Pick B.');
  });

  it('reasoning / reasoning_content field deltas: reasoning channel, answer streams without a hold', async () => {
    stream([
      sse({ reasoning: 'thinking via ' }),
      sse({ reasoning_content: 'the field' }),
      sse({ content: 'Hel' }),
      sse({ content: 'lo' }),
      DONE,
    ]);
    const result = await executor.run(input());
    expect(reasoningText()).toBe('thinking via the field');
    // Two deltas, as they arrived — nothing was held for the end of the stream.
    expect(contentDeltas()).toEqual(['Hel', 'lo']);
    expect(result.content).toBe('Hello');
  });

  it('no reasoning at all: delayed by at most the bounded prefix, then streams chunk by chunk', async () => {
    const prefix = 'a'.repeat(THINKING_STREAM_HOLD_MAX_CHARS);
    stream([sse({ content: prefix }), sse({ content: ' next' }), sse({ content: ' last' }), DONE]);
    const result = await executor.run(input());
    expect(contentDeltas()).toEqual([prefix, ' next', ' last']);
    expect(reasoningText()).toBe('');
    expect(result.content).toBe(`${prefix} next last`);
  });

  it('a short plain answer is emitted whole at the end, byte-for-byte', async () => {
    stream([sse({ content: '  Hi' }), sse({ content: ' there!\n' }), DONE]);
    const result = await executor.run(input());
    expect(contentDeltas().join('')).toBe('  Hi there!\n');
    expect(result.content).toBe('  Hi there!\n');
  });

  it('GLM reasoning LONGER than the hold: the stored answer is still clean', async () => {
    const longReasoning = 'n'.repeat(THINKING_STREAM_HOLD_MAX_CHARS + 50);
    stream([sse({ content: longReasoning }), sse({ content: '</think>The reply.' }), DONE]);
    const result = await executor.run(input());
    expect(result.content).toBe('The reply.');
    expect(result.reasoning).toBe(longReasoning);
  });
});
