import { vi } from 'vitest';

import { AiStreamProtocol } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import {
  assertAnswered,
  assertOllamaReplyAnswered,
  foldProviderStream,
  parseJsonObject,
  resolveFoldedAnswer,
} from '../internal-generate-stream.utility';

async function* chunksOf(...pieces: string[]): AsyncGenerator<string> {
  for (const piece of pieces) {
    yield await Promise.resolve(piece);
  }
}

const ignore = vi.fn();

const ollamaFrame = (frame: Record<string, unknown>): string => `${JSON.stringify(frame)}\n`;

describe('foldProviderStream', () => {
  it('folds Ollama NDJSON: thinking frames, then the answer, then usage on the done frame', async () => {
    const seen: number[] = [];
    const folded = await foldProviderStream(
      chunksOf(
        ollamaFrame({ message: { role: 'assistant', content: '', thinking: 'Let me think. ' } }),
        ollamaFrame({ message: { role: 'assistant', content: '', thinking: 'Done thinking.' } }),
        ollamaFrame({ message: { role: 'assistant', content: 'Hello ' } }),
        ollamaFrame({ message: { role: 'assistant', content: 'world' } }),
        ollamaFrame({
          message: { role: 'assistant', content: '' },
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 12,
          eval_count: 34,
        }),
      ),
      AiStreamProtocol.OLLAMA_NDJSON,
      (chars) => seen.push(chars),
    );

    expect(folded.thinking).toBe('Let me think. Done thinking.');
    expect(folded.content).toBe('Hello world');
    expect(folded.promptTokens).toBe(12);
    expect(folded.completionTokens).toBe(34);
    expect(folded.finishReason).toBe('stop');
    // One report per chunk the provider sent, thinking frames included.
    expect(seen).toHaveLength(5);
  });

  it('reassembles a frame that arrives split across chunks', async () => {
    const whole = ollamaFrame({ message: { role: 'assistant', content: 'split answer' } });
    const cut = Math.floor(whole.length / 2);
    const done = ollamaFrame({ message: { content: '' }, done: true, done_reason: 'stop' });

    const folded = await foldProviderStream(
      chunksOf(whole.slice(0, cut), whole.slice(cut), done.slice(0, 7), done.slice(7)),
      AiStreamProtocol.OLLAMA_NDJSON,
      ignore,
    );

    expect(folded.content).toBe('split answer');
    expect(folded.finishReason).toBe('stop');
  });

  it('counts a chunk as life even when it holds no complete frame yet', async () => {
    const seen: number[] = [];
    await foldProviderStream(
      chunksOf('{"message":{"con', 'tent":"x"}}\n'),
      AiStreamProtocol.OLLAMA_NDJSON,
      (chars) => seen.push(chars),
    );

    expect(seen).toEqual(['{"message":{"con'.length, 'tent":"x"}}\n'.length]);
  });

  it('folds OpenAI-style SSE including comments, reasoning, usage and [DONE]', async () => {
    const sse = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;
    const folded = await foldProviderStream(
      chunksOf(
        ': keep-alive\n\n',
        sse({ choices: [{ delta: { reasoning_content: 'hmm ' } }] }),
        sse({ choices: [{ delta: { content: 'The ' } }] }),
        sse({ choices: [{ delta: { content: 'answer' }, finish_reason: 'stop' }] }),
        sse({
          choices: [],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 9,
            total_tokens: 29,
            prompt_tokens_details: { cached_tokens: 5 },
            completion_tokens_details: { reasoning_tokens: 3 },
          },
        }),
        'data: [DONE]\n\n',
      ),
      AiStreamProtocol.OPENAI_SSE,
      ignore,
    );

    expect(folded.content).toBe('The answer');
    expect(folded.thinking).toBe('hmm ');
    expect(folded.finishReason).toBe('stop');
    expect(folded.promptTokens).toBe(20);
    expect(folded.completionTokens).toBe(9);
    expect(folded.cachedPromptTokens).toBe(5);
    expect(folded.reasoningTokens).toBe(3);
  });

  it('reports a keep-alive comment as activity even though it carries nothing', async () => {
    const seen: number[] = [];
    const folded = await foldProviderStream(
      chunksOf(': ping\n\n', ': ping\n\n'),
      AiStreamProtocol.OPENAI_SSE,
      (chars) => seen.push(chars),
    );

    expect(seen).toHaveLength(2);
    expect(folded.content).toBe('');
    expect(folded.sawFragment).toBe(false);
  });

  it('keeps usage absent when the provider reports none', async () => {
    const folded = await foldProviderStream(
      chunksOf(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hi' } }] })}\n\n`),
      AiStreamProtocol.OPENAI_SSE,
      ignore,
    );

    expect(folded.promptTokens).toBeUndefined();
    expect(folded.completionTokens).toBeUndefined();
    expect(folded.cachedPromptTokens).toBeUndefined();
  });

  it('keeps the raw body of a provider that ignored stream:true, and drops it once a real stream shows', async () => {
    const plain = JSON.stringify({
      id: 'x',
      choices: [{ message: { role: 'assistant', content: 'buffered' }, finish_reason: 'stop' }],
    });
    const asPlainJson = await foldProviderStream(
      chunksOf(plain.slice(0, 20), plain.slice(20)),
      AiStreamProtocol.OPENAI_SSE,
      ignore,
    );
    expect(asPlainJson.sawFragment).toBe(false);
    expect(parseJsonObject(asPlainJson.rawBody)).toMatchObject({ id: 'x' });

    const asStream = await foldProviderStream(
      chunksOf(`data: ${JSON.stringify({ choices: [{ delta: { content: 'a' } }] })}\n\n`),
      AiStreamProtocol.OPENAI_SSE,
      ignore,
    );
    expect(asStream.rawBody).toBe('');
  });
});

describe('resolveFoldedAnswer', () => {
  it('splits inline thinking tags out of the answer and joins them with the thinking field', async () => {
    const folded = await foldProviderStream(
      chunksOf(
        ollamaFrame({ message: { content: '', thinking: 'field thought' } }),
        ollamaFrame({ message: { content: '<think>inline thought</think>The answer' } }),
      ),
      AiStreamProtocol.OLLAMA_NDJSON,
      ignore,
    );

    const { content, reasoning } = resolveFoldedAnswer(folded);

    expect(content).toBe('The answer');
    expect(reasoning).toContain('field thought');
    expect(reasoning).toContain('inline thought');
  });
});

describe('assertAnswered', () => {
  const codeOf = (run: () => void): string | undefined => {
    try {
      run();
    } catch (error: unknown) {
      return error instanceof BusinessException ? error.code : 'NOT_BUSINESS';
    }
    return undefined;
  };

  it('passes when there is an answer, even beside reasoning', () => {
    expect(codeOf(() => assertAnswered('text', 'thought', 'OLLAMA', 'kimi'))).toBeUndefined();
  });

  it('names a model that reasoned and wrote nothing', () => {
    expect(codeOf(() => assertAnswered('  ', 'long thought', 'OLLAMA', 'kimi'))).toBe(
      'MODEL_REASONED_NO_ANSWER',
    );
  });

  it('keeps the existing code for a provider that returned an empty envelope', () => {
    expect(codeOf(() => assertAnswered('', '', 'OLLAMA', 'kimi'))).toBe(
      'CLOUD_PROVIDER_EMPTY_RESPONSE',
    );
  });
});

describe('assertOllamaReplyAnswered', () => {
  const codeOf = (run: () => void): string | undefined => {
    try {
      run();
    } catch (error: unknown) {
      return error instanceof BusinessException ? error.code : 'NOT_BUSINESS';
    }
    return undefined;
  };

  it('tells a thinking-only buffered reply from an empty one', () => {
    expect(
      codeOf(() =>
        assertOllamaReplyAnswered(
          { model: 'kimi', message: { content: '', thinking: 'spent it all' }, done: true },
          'OLLAMA',
          'kimi',
        ),
      ),
    ).toBe('MODEL_REASONED_NO_ANSWER');
    expect(
      codeOf(() =>
        assertOllamaReplyAnswered(
          { model: 'kimi', message: { content: '' }, done: true },
          'OLLAMA',
          'kimi',
        ),
      ),
    ).toBe('CLOUD_PROVIDER_EMPTY_RESPONSE');
  });

  it('lets a tool-call turn through: the model is asking for a tool, not answering', () => {
    expect(
      codeOf(() =>
        assertOllamaReplyAnswered(
          {
            model: 'kimi',
            message: {
              content: '',
              tool_calls: [{ function: { name: 'web_search', arguments: {} } }],
            },
            done: true,
          },
          'OLLAMA',
          'kimi',
        ),
      ),
    ).toBeUndefined();
  });
});

describe('parseJsonObject', () => {
  it('returns objects only', () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(parseJsonObject('[1]')).toBeUndefined();
    expect(parseJsonObject('"text"')).toBeUndefined();
    expect(parseJsonObject('not json')).toBeUndefined();
    expect(parseJsonObject('')).toBeUndefined();
  });
});
