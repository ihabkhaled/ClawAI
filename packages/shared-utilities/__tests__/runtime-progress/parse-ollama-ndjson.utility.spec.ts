import { parseOllamaNdjsonLine } from '../../src/runtime-progress/parse-ollama-ndjson.utility';

describe('parseOllamaNdjsonLine', () => {
  it('parses a chat thinking delta from /api/chat', () => {
    const line = JSON.stringify({
      model: 'llama3.2:3b',
      message: { role: 'assistant', content: '', thinking: 'let me think about this' },
      done: false,
    });

    const parsed = parseOllamaNdjsonLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.reasoningDelta).toBe('let me think about this');
    expect(parsed?.contentDelta).toBeUndefined();
    expect(parsed?.done).toBe(false);
    expect(parsed?.rawProviderEventType).toBe('ollama_chat_message');
  });

  it('parses a chat content delta from /api/chat', () => {
    const line = JSON.stringify({
      message: { role: 'assistant', content: 'The answer is 391.' },
      done: false,
    });

    const parsed = parseOllamaNdjsonLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.contentDelta).toBe('The answer is 391.');
    expect(parsed?.reasoningDelta).toBeUndefined();
    expect(parsed?.rawProviderEventType).toBe('ollama_chat_message');
  });

  it('parses a response delta from /api/generate', () => {
    const line = JSON.stringify({
      model: 'gemma3:4b',
      response: 'Hello world',
      done: false,
    });

    const parsed = parseOllamaNdjsonLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.contentDelta).toBe('Hello world');
    expect(parsed?.reasoningDelta).toBeUndefined();
    expect(parsed?.done).toBe(false);
    expect(parsed?.rawProviderEventType).toBe('ollama_generate_response');
  });

  it('parses a final done frame with full timings', () => {
    const line = JSON.stringify({
      model: 'gemma3:4b',
      done: true,
      done_reason: 'stop',
      total_duration: 5_000_000_000,
      load_duration: 1_000_000_000,
      prompt_eval_count: 12,
      prompt_eval_duration: 500_000_000,
      eval_count: 50,
      eval_duration: 2_500_000_000,
    });

    const parsed = parseOllamaNdjsonLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.done).toBe(true);
    expect(parsed?.rawProviderEventType).toBe('ollama_done');
    expect(parsed?.finalTimings).toEqual({
      totalDurationNs: 5_000_000_000,
      loadDurationNs: 1_000_000_000,
      promptEvalCount: 12,
      promptEvalDurationNs: 500_000_000,
      evalCount: 50,
      evalDurationNs: 2_500_000_000,
      doneReason: 'stop',
    });
  });

  it('returns null on malformed JSON', () => {
    expect(parseOllamaNdjsonLine('{not-json')).toBeNull();
    expect(parseOllamaNdjsonLine('[1,2,3')).toBeNull();
  });

  it('returns null on an empty line', () => {
    expect(parseOllamaNdjsonLine('')).toBeNull();
  });

  it('returns null on a whitespace-only line', () => {
    expect(parseOllamaNdjsonLine('   \t  \n  ')).toBeNull();
  });

  it('detects done for both /api/chat and /api/generate finals', () => {
    const chatDone = parseOllamaNdjsonLine(
      JSON.stringify({ message: { content: '' }, done: true, eval_count: 4 }),
    );
    expect(chatDone?.done).toBe(true);
    expect(chatDone?.rawProviderEventType).toBe('ollama_done');

    const generateDone = parseOllamaNdjsonLine(
      JSON.stringify({ response: '', done: true, eval_count: 4 }),
    );
    expect(generateDone?.done).toBe(true);
    expect(generateDone?.rawProviderEventType).toBe('ollama_done');
  });

  it('parses top-level thinking on /api/generate', () => {
    const line = JSON.stringify({ thinking: 'top level reasoning', done: false });
    const parsed = parseOllamaNdjsonLine(line);
    expect(parsed?.reasoningDelta).toBe('top level reasoning');
    expect(parsed?.rawProviderEventType).toBe('ollama_generate_response');
  });

  it('skips final-frame timing fields that are missing', () => {
    const line = JSON.stringify({ done: true, eval_count: 3, eval_duration: 1_000_000_000 });
    const parsed = parseOllamaNdjsonLine(line);
    expect(parsed?.finalTimings).toEqual({
      evalCount: 3,
      evalDurationNs: 1_000_000_000,
    });
  });

  it('returns null for non-string input', () => {
    // @ts-expect-error — runtime safety check for non-string input
    expect(parseOllamaNdjsonLine(undefined)).toBeNull();
    // @ts-expect-error — runtime safety check for non-string input
    expect(parseOllamaNdjsonLine(123)).toBeNull();
  });

  it('returns null for valid JSON that is not an object', () => {
    expect(parseOllamaNdjsonLine('[1,2,3]')).toBeNull();
    expect(parseOllamaNdjsonLine('"just a string"')).toBeNull();
    expect(parseOllamaNdjsonLine('42')).toBeNull();
    expect(parseOllamaNdjsonLine('null')).toBeNull();
  });

  it('returns null for an object with no recognizable Ollama fields', () => {
    expect(parseOllamaNdjsonLine(JSON.stringify({ foo: 'bar', done: false }))).toBeNull();
  });

  it('drops empty content/reasoning strings rather than emitting empty deltas', () => {
    const line = JSON.stringify({ message: { content: '' }, done: false });
    const parsed = parseOllamaNdjsonLine(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.contentDelta).toBeUndefined();
  });
});
