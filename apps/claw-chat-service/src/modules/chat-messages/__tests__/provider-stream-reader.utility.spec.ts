import { AiReasoningVisibility, AiStreamProtocol } from '../../../common/enums';
import { ProviderStreamReader } from '../utilities/provider-stream-reader.utility';

describe('ProviderStreamReader — OpenAI SSE', () => {
  it('parses content deltas from data frames', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
    expect(frags).toEqual([{ kind: 'content', text: 'Hello' }]);
  });

  it('maps provider reasoning_content to a provider-exposed reasoning fragment', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push('data: {"choices":[{"delta":{"reasoning_content":"why"}}]}\n\n');
    expect(frags).toEqual([
      { kind: 'reasoning', text: 'why', visibility: AiReasoningVisibility.PROVIDER_EXPOSED },
    ]);
  });

  it('emits usage from a final usage chunk', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push(
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n',
    );
    expect(frags).toContainEqual({
      kind: 'usage',
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  });

  it('reads the cached and reasoning sub-counts off the usage frame', () => {
    // Before this the reader took prompt_tokens and completion_tokens only, so
    // a streamed reasoning model finalized its PAYG hold with zero reasoning
    // tokens - billing nothing on the largest component of the call (ADR-078).
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push(
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":1000,"completion_tokens":800,"total_tokens":1800,"prompt_tokens_details":{"cached_tokens":750},"completion_tokens_details":{"reasoning_tokens":600}}}\n\n',
    );
    expect(frags).toContainEqual({
      kind: 'usage',
      promptTokens: 1000,
      completionTokens: 800,
      totalTokens: 1800,
      cachedPromptTokens: 750,
      reasoningTokens: 600,
    });
  });

  it("accepts DeepSeek's top-level spelling of the cache hit", () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push(
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":500,"completion_tokens":100,"prompt_cache_hit_tokens":320}}\n\n',
    );
    expect(frags).toContainEqual(
      expect.objectContaining({ kind: 'usage', cachedPromptTokens: 320 }),
    );
  });

  it('leaves the sub-counts absent when the provider reported none', () => {
    // Absent is not zero: a measured zero suppresses the estimate, an absent
    // value means "nothing was reported" and must stay distinguishable.
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push(
      'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":20}}\n\n',
    );
    const usage = frags.find((f) => f.kind === 'usage');
    expect(usage).toBeDefined();
    expect(Object.keys(usage ?? {})).not.toContain('cachedPromptTokens');
    expect(Object.keys(usage ?? {})).not.toContain('reasoningTokens');
  });

  it('emits done on [DONE]', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    expect(reader.push('data: [DONE]\n\n')).toEqual([{ kind: 'done' }]);
  });

  it('reassembles a JSON frame split across chunks', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    expect(reader.push('data: {"choices":[{"delta":{"con')).toEqual([]);
    const frags = reader.push('tent":"Hi"}}]}\n\n');
    expect(frags).toEqual([{ kind: 'content', text: 'Hi' }]);
  });

  it('ignores SSE comment/heartbeat lines', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    expect(reader.push(': keep-alive\n\n')).toEqual([]);
  });

  // Bug-hunt 2026-05-31 — universal truncation telemetry. Pins that the
  // OpenAI-SSE streaming parser surfaces `finish_reason: 'length'` from the
  // terminal frame as a done fragment with finishReason='length'. Cloud
  // OpenAI-compat shim providers (Anthropic OpenAI-compat, Gemini
  // OpenAI-compat, DeepSeek, Grok, llama.cpp, Ollama OpenAI-compat) all
  // emit this finish_reason when they hit max_tokens — the executor
  // depends on this round-trip to set state.finishReason='length' so the
  // universal truncatedAtContextLimit warn fires.
  it("round-trips finish_reason='length' from the terminal SSE frame as a done fragment", () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OPENAI_SSE);
    const frags = reader.push('data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n');
    const doneFrag = frags.find((f) => f.kind === 'done');
    expect(doneFrag).toBeDefined();
    if (doneFrag === undefined || doneFrag.kind !== 'done') {
      throw new Error('expected done fragment');
    }
    expect(doneFrag.finishReason).toBe('length');
  });
});

describe('ProviderStreamReader — Ollama NDJSON', () => {
  it('parses response chunks as content', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    expect(reader.push('{"response":"Hello","done":false}\n')).toEqual([
      { kind: 'content', text: 'Hello' },
    ]);
  });

  it('maps thinking field to model-emitted reasoning', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    expect(reader.push('{"thinking":"hmm","done":false}\n')).toEqual([
      { kind: 'reasoning', text: 'hmm', visibility: AiReasoningVisibility.MODEL_EMITTED },
    ]);
  });

  it('emits usage and done on the final chunk', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    const frags = reader.push(
      '{"response":"!","done":true,"prompt_eval_count":5,"eval_count":7}\n',
    );
    expect(frags).toContainEqual({ kind: 'content', text: '!' });
    expect(frags).toContainEqual({ kind: 'usage', promptTokens: 5, completionTokens: 7 });
    expect(frags.some((f) => f.kind === 'done')).toBe(true);
  });

  it('parses native /api/chat message.content', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    expect(reader.push('{"message":{"content":"hey"},"done":false}\n')).toEqual([
      { kind: 'content', text: 'hey' },
    ]);
  });

  it('attaches Ollama nanosecond timings to the done fragment on the terminal frame', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    const frags = reader.push(
      '{"response":"!","done":true,"done_reason":"stop","total_duration":3000000000,"load_duration":500000000,"prompt_eval_count":12,"prompt_eval_duration":200000000,"eval_count":40,"eval_duration":2200000000}\n',
    );
    const doneFrag = frags.find((f) => f.kind === 'done');
    expect(doneFrag).toBeDefined();
    if (doneFrag === undefined || doneFrag.kind !== 'done') {
      throw new Error('expected done fragment');
    }
    expect(doneFrag.finishReason).toBe('stop');
    expect(doneFrag.finalTimings).toEqual({
      totalDurationNs: 3_000_000_000,
      loadDurationNs: 500_000_000,
      promptEvalCount: 12,
      promptEvalDurationNs: 200_000_000,
      evalCount: 40,
      evalDurationNs: 2_200_000_000,
      doneReason: 'stop',
    });
  });

  it('omits finalTimings when the terminal frame has no timing fields', () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    const frags = reader.push('{"response":"","done":true}\n');
    const doneFrag = frags.find((f) => f.kind === 'done');
    expect(doneFrag).toBeDefined();
    if (doneFrag === undefined || doneFrag.kind !== 'done') {
      throw new Error('expected done fragment');
    }
    expect(doneFrag.finalTimings).toBeUndefined();
  });

  // Bug-hunt 2026-05-31 — Ollama Cloud Connector truncation telemetry.
  // The Ollama native NDJSON terminal frame uses `done_reason: 'length'`
  // when the model hits its context cap. Pins that the streaming reader
  // surfaces this verbatim on the done fragment so the executor can
  // store it on state.finishReason. Same mechanism that fires the
  // universal truncatedAtContextLimit warn for local AND cloud Ollama.
  it("round-trips done_reason='length' from the terminal Ollama NDJSON frame", () => {
    const reader = new ProviderStreamReader(AiStreamProtocol.OLLAMA_NDJSON);
    const frags = reader.push(
      '{"response":"","done":true,"done_reason":"length","prompt_eval_count":5800,"eval_count":256}\n',
    );
    const doneFrag = frags.find((f) => f.kind === 'done');
    expect(doneFrag).toBeDefined();
    if (doneFrag === undefined || doneFrag.kind !== 'done') {
      throw new Error('expected done fragment');
    }
    expect(doneFrag.finishReason).toBe('length');
  });
});
