import { HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH } from '../../constants/hf-discovery.constants';
import { forwardableContextWindow, parseGgufContextLength } from '../gguf-context-length.utility';

describe('parseGgufContextLength (HuggingFace gguf.context_length)', () => {
  it('reads the window stored in the GGUF metadata', () => {
    expect(parseGgufContextLength({ gguf: { context_length: 131_072 } })).toBe(131_072);
    expect(parseGgufContextLength({ gguf: { context_length: 1_048_576 } })).toBe(1_048_576);
  });

  it('is null when the repo reports no GGUF block, or no context_length in it', () => {
    expect(parseGgufContextLength({})).toBeNull();
    expect(parseGgufContextLength({ gguf: {} })).toBeNull();
    expect(parseGgufContextLength(null)).toBeNull();
    expect(parseGgufContextLength(undefined)).toBeNull();
  });

  it.each([
    ['zero', 0],
    ['negative', -4_096],
    ['a float', 8_192.5],
    ['a string', '131072'],
    ['null', null],
    ['NaN', Number.NaN],
    ['an object', { value: 131_072 }],
  ])('never reads %s as a window', (_label, value) => {
    expect(parseGgufContextLength({ gguf: { context_length: value } })).toBeNull();
  });
});

describe('forwardableContextWindow (what the routing snapshot may carry)', () => {
  it('forwards the published window of a curated entry', () => {
    expect(forwardableContextWindow({ contextLength: 128_000, license: 'apache-2.0' })).toBe(
      128_000,
    );
    expect(forwardableContextWindow({ contextLength: 262_144, license: 'MIT' })).toBe(262_144);
  });

  it('forwards a curated entry whose window happens to equal the placeholder', () => {
    expect(
      forwardableContextWindow({
        contextLength: HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH,
        license: 'apache-2.0',
      }),
    ).toBe(HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH);
  });

  it('forwards the window an import read from the GGUF file', () => {
    expect(forwardableContextWindow({ contextLength: 131_072, license: 'Unknown' })).toBe(131_072);
  });

  // The column is not nullable, so an import with no GGUF window carries the placeholder, and a
  // placeholder is not a window.
  it('does not forward the placeholder of an import that reported no window', () => {
    expect(
      forwardableContextWindow({
        contextLength: HF_IMPORT_PLACEHOLDER_CONTEXT_LENGTH,
        license: 'Unknown',
      }),
    ).toBeUndefined();
  });

  it.each([0, -1, 1.5, Number.NaN])('does not forward %s', (contextLength) => {
    expect(forwardableContextWindow({ contextLength, license: 'apache-2.0' })).toBeUndefined();
  });
});
