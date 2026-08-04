import { AiStreamProtocol } from '../../../../common/enums';
import { ProviderStreamReader } from '../provider-stream-reader.utility';
import type { NormalizedStreamFragment } from '../../types/provider-stream.types';

// OpenAI-SSE streams a single tool call across MANY frames: the id and function
// name arrive once, then `arguments` is emitted as an arbitrarily split JSON
// string correlated only by `index`. Reassembling that is the entire reason
// streaming + tools was not a field pass-through.

const sse = (frame: unknown): string => `data: ${JSON.stringify(frame)}\n`;

const openAiToolDelta = (
  index: number,
  fn: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): string => sse({ choices: [{ delta: { tool_calls: [{ index, function: fn, ...extra }] } }] });

const pushAll = (reader: ProviderStreamReader, chunks: string[]): NormalizedStreamFragment[] => {
  const out: NormalizedStreamFragment[] = [];
  for (const chunk of chunks) {
    out.push(...reader.push(chunk));
  }
  out.push(...reader.flush());
  return out;
};

const toolCallFragments = (
  fragments: NormalizedStreamFragment[],
): Extract<NormalizedStreamFragment, { kind: 'tool-calls' }>[] =>
  fragments.filter(
    (f): f is Extract<NormalizedStreamFragment, { kind: 'tool-calls' }> => f.kind === 'tool-calls',
  );

describe('ProviderStreamReader — OpenAI SSE tool calls', () => {
  it('reassembles one call whose arguments JSON is split across many frames', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      openAiToolDelta(
        0,
        { name: 'workspace_files', arguments: '' },
        { id: 'call_1', type: 'function' },
      ),
      openAiToolDelta(0, { arguments: '{"opera' }),
      openAiToolDelta(0, { arguments: 'tion":"read","targetId":"target:wo' }),
      openAiToolDelta(0, { arguments: 'rkspace","arguments":{"path":"src/main.ts"}}' }),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    ]);

    const calls = toolCallFragments(fragments);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.calls).toHaveLength(1);
    const call = calls[0]?.calls[0];
    expect(call?.id).toBe('call_1');
    expect(call?.function.name).toBe('workspace_files');
    // Reassembled into valid JSON — the whole point.
    expect(JSON.parse(String(call?.function.arguments))).toEqual({
      operation: 'read',
      targetId: 'target:workspace',
      arguments: { path: 'src/main.ts' },
    });
  });

  it('survives a frame split mid-JSON across a network chunk boundary', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const full = openAiToolDelta(
      0,
      { name: 'workspace_files', arguments: '{"operation":"list"}' },
      { id: 'call_1' },
    );
    const cut = Math.floor(full.length / 2);

    const fragments = pushAll(reader, [
      full.slice(0, cut),
      full.slice(cut),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    ]);

    const call = toolCallFragments(fragments)[0]?.calls[0];
    expect(call?.function.name).toBe('workspace_files');
    expect(JSON.parse(String(call?.function.arguments))).toEqual({ operation: 'list' });
  });

  it('keeps two parallel calls separate and ordered by provider index', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    // Deltas deliberately interleaved, and index 1 announced before index 0
    // completes — merging by array position instead of `index` would splice
    // the two calls together.
    const fragments = pushAll(reader, [
      openAiToolDelta(0, { name: 'workspace_files', arguments: '' }, { id: 'call_a' }),
      openAiToolDelta(1, { name: 'workspace_git', arguments: '' }, { id: 'call_b' }),
      openAiToolDelta(1, { arguments: '{"operation":"status"}' }),
      openAiToolDelta(0, { arguments: '{"operation":"read"}' }),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    ]);

    const calls = toolCallFragments(fragments)[0]?.calls ?? [];
    expect(calls).toHaveLength(2);
    expect(calls[0]?.function.name).toBe('workspace_files');
    expect(calls[0]?.id).toBe('call_a');
    expect(JSON.parse(String(calls[0]?.function.arguments))).toEqual({ operation: 'read' });
    expect(calls[1]?.function.name).toBe('workspace_git');
    expect(JSON.parse(String(calls[1]?.function.arguments))).toEqual({ operation: 'status' });
  });

  it('releases the calls BEFORE the terminal done fragment', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      openAiToolDelta(0, { name: 'workspace_files', arguments: '{}' }, { id: 'c' }),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    ]);

    const toolIndex = fragments.findIndex((f) => f.kind === 'tool-calls');
    const doneIndex = fragments.findIndex((f) => f.kind === 'done');
    expect(toolIndex).toBeGreaterThanOrEqual(0);
    expect(doneIndex).toBeGreaterThan(toolIndex);
  });

  it('releases exactly once even when finish_reason and [DONE] both arrive', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      openAiToolDelta(0, { name: 'workspace_files', arguments: '{}' }, { id: 'c' }),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
      'data: [DONE]\n',
    ]);

    // Emitting twice would double-dispatch every tool.
    expect(toolCallFragments(fragments)).toHaveLength(1);
  });

  it('still releases when the stream ends without any terminal marker', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      openAiToolDelta(0, { name: 'workspace_files', arguments: '{}' }, { id: 'c' }),
    ]);

    // Otherwise a fully-assembled call is stranded in the accumulator and the
    // run looks like an empty answer.
    expect(toolCallFragments(fragments)).toHaveLength(1);
  });

  it('emits NO tool-calls fragment for an ordinary text answer', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      sse({ choices: [{ delta: { content: 'Hello' } }] }),
      sse({ choices: [{ delta: { content: ' there' } }] }),
      sse({ choices: [{ delta: {}, finish_reason: 'stop' }] }),
      'data: [DONE]\n',
    ]);

    expect(toolCallFragments(fragments)).toHaveLength(0);
    const text = fragments
      .filter(
        (f): f is Extract<NormalizedStreamFragment, { kind: 'content' }> => f.kind === 'content',
      )
      .map((f) => f.text)
      .join('');
    expect(text).toBe('Hello there');
  });

  it('still streams content deltas alongside a tool call', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);

    const fragments = pushAll(reader, [
      sse({ choices: [{ delta: { content: 'Let me look.' } }] }),
      openAiToolDelta(0, { name: 'workspace_files', arguments: '{}' }, { id: 'c' }),
      sse({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] }),
    ]);

    expect(fragments.some((f) => f.kind === 'content')).toBe(true);
    expect(toolCallFragments(fragments)).toHaveLength(1);
  });
});

describe('ProviderStreamReader — Ollama NDJSON tool calls', () => {
  it('extracts a complete call from a single frame with object arguments', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);

    const fragments = pushAll(reader, [
      `${JSON.stringify({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              function: {
                name: 'workspace_files',
                arguments: { operation: 'read', targetId: 'target:workspace' },
              },
            },
          ],
        },
      })}\n`,
      `${JSON.stringify({ done: true, done_reason: 'stop', prompt_eval_count: 9, eval_count: 3 })}\n`,
    ]);

    const call = toolCallFragments(fragments)[0]?.calls[0];
    expect(call?.function.name).toBe('workspace_files');
    // Native Ollama delivers arguments as an OBJECT, not a JSON string — the
    // reader emits whichever shape its own protocol produced.
    expect(call?.function.arguments).toEqual({
      operation: 'read',
      targetId: 'target:workspace',
    });
  });

  it('releases before done and only once', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);

    const fragments = pushAll(reader, [
      `${JSON.stringify({
        message: { tool_calls: [{ function: { name: 'workspace_files', arguments: {} } }] },
      })}\n`,
      `${JSON.stringify({ done: true, done_reason: 'stop' })}\n`,
    ]);

    expect(toolCallFragments(fragments)).toHaveLength(1);
    const toolIndex = fragments.findIndex((f) => f.kind === 'tool-calls');
    const doneIndex = fragments.findIndex((f) => f.kind === 'done');
    expect(doneIndex).toBeGreaterThan(toolIndex);
  });

  it('emits no tool-calls fragment for an ordinary NDJSON answer', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);

    const fragments = pushAll(reader, [
      `${JSON.stringify({ message: { content: 'Hi' } })}\n`,
      `${JSON.stringify({ done: true, done_reason: 'stop' })}\n`,
    ]);

    expect(toolCallFragments(fragments)).toHaveLength(0);
  });

  it('ignores a malformed tool call rather than emitting a nameless one', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);

    const fragments = pushAll(reader, [
      `${JSON.stringify({ message: { tool_calls: [{ function: { arguments: {} } }, 'garbage'] } })}\n`,
      `${JSON.stringify({ done: true })}\n`,
    ]);

    expect(toolCallFragments(fragments)).toHaveLength(0);
  });

  it('still reports final timings on a tool-call turn', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);

    const fragments = pushAll(reader, [
      `${JSON.stringify({
        message: { tool_calls: [{ function: { name: 'workspace_files', arguments: {} } }] },
      })}\n`,
      `${JSON.stringify({ done: true, done_reason: 'stop', total_duration: 1_000_000 })}\n`,
    ]);

    const done = fragments.find(
      (f): f is Extract<NormalizedStreamFragment, { kind: 'done' }> => f.kind === 'done',
    );
    expect(done?.finalTimings?.totalDurationNs).toBe(1_000_000);
  });
});
