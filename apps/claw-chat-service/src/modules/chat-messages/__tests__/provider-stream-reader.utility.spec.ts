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
    const frags = reader.push('{"response":"!","done":true,"prompt_eval_count":5,"eval_count":7}\n');
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
});
