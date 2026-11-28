import { parseOllamaContextLength } from '../ollama-context-length.utility';

function show(arch: string, contextLength: unknown): { model_info: Record<string, unknown> } {
  return {
    model_info: {
      'general.architecture': arch,
      [`${arch}.context_length`]: contextLength,
    },
  };
}

describe('parseOllamaContextLength', () => {
  it('reads the architecture-prefixed key', () => {
    expect(parseOllamaContextLength(show('qwen3', 40_960))).toBe(40_960);
    expect(parseOllamaContextLength(show('deepseek2', 262_144))).toBe(262_144);
  });

  it('prefers the architecture key over another *.context_length', () => {
    expect(
      parseOllamaContextLength({
        model_info: {
          'general.architecture': 'gemma3',
          'gemma3.context_length': 131_072,
          'clip.vision.context_length': 4_096,
        },
      }),
    ).toBe(131_072);
  });

  it('takes the largest *.context_length when the architecture key is missing', () => {
    expect(
      parseOllamaContextLength({
        model_info: {
          'llama.context_length': 8_192,
          'clip.context_length': 77,
        },
      }),
    ).toBe(8_192);
  });

  it('falls back to another *.context_length when the architecture names no window', () => {
    expect(
      parseOllamaContextLength({
        model_info: {
          'general.architecture': 'mllama',
          'other.context_length': 32_768,
        },
      }),
    ).toBe(32_768);
  });

  it('is undefined when model_info has no context_length key at all', () => {
    expect(
      parseOllamaContextLength({
        model_info: { 'general.architecture': 'llama', 'llama.embedding_length': 4_096 },
      }),
    ).toBeUndefined();
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['a float', 8_192.5],
    ['a string', '8192'],
    ['null', null],
    ['NaN', Number.NaN],
  ])('never reads %s as a window', (_label, value) => {
    expect(parseOllamaContextLength(show('llama', value))).toBeUndefined();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'nope'],
    ['an empty object', {}],
    ['model_info as an array', { model_info: [] }],
    ['model_info as null', { model_info: null }],
  ])('is undefined for a malformed body (%s)', (_label, body) => {
    expect(parseOllamaContextLength(body)).toBeUndefined();
  });

  it('ignores an unusable architecture name and still finds a window', () => {
    expect(
      parseOllamaContextLength({
        model_info: { 'general.architecture': 42, 'llama.context_length': 16_384 },
      }),
    ).toBe(16_384);
  });
});
