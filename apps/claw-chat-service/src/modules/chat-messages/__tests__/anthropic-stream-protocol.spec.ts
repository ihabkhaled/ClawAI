import { AiReasoningVisibility, AiStreamProtocol } from '../../../common/enums';
import { ProviderStreamReader } from '../utilities/provider-stream-reader.utility';
import type { NormalizedStreamFragment } from '../types/provider-stream.types';

/**
 * Anthropic's Messages stream (F093). Usage is split across two events:
 * `message_start` carries `input_tokens` plus BOTH cache counters, and
 * `message_delta` carries the final `output_tokens`. The reader must merge
 * them into ONE usage fragment whose prompt total is input + read + write,
 * with the write reported separately so it can be billed at the write rate.
 *
 * The transcripts follow the documented SSE event shapes; they are hand-written
 * to those shapes, not captured from a live call.
 */

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function startFrame(usage: Record<string, unknown>): string {
  return sse('message_start', {
    type: 'message_start',
    message: { id: 'msg_1', type: 'message', role: 'assistant', content: [], usage },
  });
}

const textDelta = (text: string): string =>
  sse('content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'text_delta', text },
  });

const thinkingDelta = (thinking: string): string =>
  sse('content_block_delta', {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'thinking_delta', thinking },
  });

const messageDelta = (stopReason: string, usage: Record<string, unknown>): string =>
  sse('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: stopReason, stop_sequence: null },
    usage,
  });

const messageStop = (): string => sse('message_stop', { type: 'message_stop' });

function readAll(chunks: string[]): NormalizedStreamFragment[] {
  const reader = new ProviderStreamReader(AiStreamProtocol.ANTHROPIC_SSE);
  const out: NormalizedStreamFragment[] = [];
  for (const chunk of chunks) {
    out.push(...reader.push(chunk));
  }
  out.push(...reader.flush());
  return out;
}

function usageOf(fragments: NormalizedStreamFragment[]): NormalizedStreamFragment[] {
  return fragments.filter((fragment) => fragment.kind === 'usage');
}

describe('ProviderStreamReader - Anthropic SSE', () => {
  it('cold write: merges start + delta usage into one fragment with the write split out', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 12,
        cache_creation_input_tokens: 8000,
        cache_read_input_tokens: 0,
        output_tokens: 1,
      }),
      sse('content_block_start', {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      }),
      textDelta('Hel'),
      textDelta('lo'),
      sse('content_block_stop', { type: 'content_block_stop', index: 0 }),
      messageDelta('end_turn', { output_tokens: 450 }),
      messageStop(),
    ]);

    expect(fragments.filter((f) => f.kind === 'content')).toEqual([
      { kind: 'content', text: 'Hel' },
      { kind: 'content', text: 'lo' },
    ]);
    const usage = usageOf(fragments);
    expect(usage).toHaveLength(1);
    expect(usage[0]).toEqual({
      kind: 'usage',
      promptTokens: 8012,
      completionTokens: 450,
      totalTokens: 8462,
      cachedPromptTokens: 0,
      cacheCreationPromptTokens: 8000,
    });
    expect(fragments.at(-1)).toEqual({ kind: 'done', finishReason: 'stop' });
  });

  it('warm read: reports the cache read and no write', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 25,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 8000,
        output_tokens: 1,
      }),
      textDelta('ok'),
      messageDelta('end_turn', { output_tokens: 300 }),
      messageStop(),
    ]);
    const [usage] = usageOf(fragments);
    expect(usage).toEqual({
      kind: 'usage',
      promptTokens: 8025,
      completionTokens: 300,
      totalTokens: 8325,
      cachedPromptTokens: 8000,
    });
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
  });

  it('absent cache fields: no write is reported and the prompt is just input_tokens', () => {
    const fragments = readAll([
      startFrame({ input_tokens: 900, output_tokens: 1 }),
      textDelta('x'),
      messageDelta('end_turn', { output_tokens: 120 }),
      messageStop(),
    ]);
    const [usage] = usageOf(fragments);
    expect(usage).toMatchObject({
      promptTokens: 900,
      completionTokens: 120,
      cachedPromptTokens: 0,
    });
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
  });

  it('large counts are summed exactly', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 1000,
        cache_creation_input_tokens: 4_000_000,
        cache_read_input_tokens: 2_000_000,
        output_tokens: 1,
      }),
      messageDelta('end_turn', { output_tokens: 64_000 }),
      messageStop(),
    ]);
    expect(usageOf(fragments)[0]).toMatchObject({
      promptTokens: 6_001_000,
      cachedPromptTokens: 2_000_000,
      cacheCreationPromptTokens: 4_000_000,
      completionTokens: 64_000,
    });
  });

  it('a final message_delta that re-reports input fields overrides the start values', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 10,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 0,
        output_tokens: 1,
      }),
      messageDelta('end_turn', {
        input_tokens: 10,
        cache_creation_input_tokens: 100,
        cache_read_input_tokens: 0,
        output_tokens: 77,
      }),
      messageStop(),
    ]);
    expect(usageOf(fragments)).toHaveLength(1);
    expect(usageOf(fragments)[0]).toMatchObject({ promptTokens: 110, completionTokens: 77 });
  });

  it('emits usage exactly once even when the stream also flushes', () => {
    const fragments = readAll([
      startFrame({ input_tokens: 5, output_tokens: 1 }),
      messageDelta('end_turn', { output_tokens: 9 }),
      messageStop(),
    ]);
    expect(usageOf(fragments)).toHaveLength(1);
    expect(fragments.filter((f) => f.kind === 'done')).toHaveLength(1);
  });

  it('a stream cut before message_stop still reports the usage it measured', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 12,
        cache_creation_input_tokens: 8000,
        cache_read_input_tokens: 0,
        output_tokens: 1,
      }),
      textDelta('partial'),
    ]);
    expect(usageOf(fragments)).toHaveLength(1);
    expect(usageOf(fragments)[0]).toMatchObject({
      promptTokens: 8012,
      cacheCreationPromptTokens: 8000,
    });
    expect(fragments.some((f) => f.kind === 'done')).toBe(false);
  });

  it('a stream with no usage frame at all emits no usage fragment', () => {
    const fragments = readAll([textDelta('hi'), messageStop()]);
    expect(usageOf(fragments)).toHaveLength(0);
  });

  it('maps thinking deltas to provider-exposed reasoning, not to the answer', () => {
    const fragments = readAll([
      startFrame({ input_tokens: 1, output_tokens: 1 }),
      thinkingDelta('Let me think'),
      textDelta('Answer'),
      messageDelta('end_turn', { output_tokens: 5 }),
      messageStop(),
    ]);
    expect(fragments).toContainEqual({
      kind: 'reasoning',
      text: 'Let me think',
      visibility: AiReasoningVisibility.PROVIDER_EXPOSED,
    });
    expect(fragments.filter((f) => f.kind === 'content')).toEqual([
      { kind: 'content', text: 'Answer' },
    ]);
  });

  it('maps max_tokens to the length finish reason and unknown reasons through', () => {
    const length = readAll([
      startFrame({ input_tokens: 1, output_tokens: 1 }),
      messageDelta('max_tokens', { output_tokens: 5 }),
      messageStop(),
    ]);
    expect(length.at(-1)).toEqual({ kind: 'done', finishReason: 'length' });
    const odd = readAll([
      startFrame({ input_tokens: 1, output_tokens: 1 }),
      messageDelta('refusal', { output_tokens: 5 }),
      messageStop(),
    ]);
    expect(odd.at(-1)).toEqual({ kind: 'done', finishReason: 'refusal' });
  });

  it('survives a frame split across network chunks', () => {
    const whole =
      startFrame({
        input_tokens: 12,
        cache_creation_input_tokens: 8000,
        cache_read_input_tokens: 0,
        output_tokens: 1,
      }) +
      textDelta('Hello') +
      messageDelta('end_turn', { output_tokens: 450 }) +
      messageStop();
    const cut = Math.floor(whole.length / 3);
    const chunks = [whole.slice(0, cut), whole.slice(cut, cut * 2), whole.slice(cut * 2)];
    const fragments = readAll(chunks);
    expect(usageOf(fragments)[0]).toMatchObject({
      promptTokens: 8012,
      cacheCreationPromptTokens: 8000,
      completionTokens: 450,
    });
    expect(fragments.filter((f) => f.kind === 'content')).toEqual([
      { kind: 'content', text: 'Hello' },
    ]);
  });

  it('ignores ping, error and malformed frames without throwing', () => {
    const fragments = readAll([
      sse('ping', { type: 'ping' }),
      'data: {not json}\n\n',
      sse('error', { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }),
      ': keep-alive\n\n',
      'event: message_stop\n',
    ]);
    expect(fragments).toEqual([]);
  });

  it('does not treat a negative or non-numeric cache count as a write', () => {
    const fragments = readAll([
      startFrame({
        input_tokens: 10,
        cache_creation_input_tokens: -500,
        cache_read_input_tokens: 'many',
        output_tokens: 1,
      }),
      messageDelta('end_turn', { output_tokens: 3 }),
      messageStop(),
    ]);
    const [usage] = usageOf(fragments);
    expect(usage).toMatchObject({ promptTokens: 10, completionTokens: 3 });
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
  });
});
