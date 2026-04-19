import {
  buildCanonicalKey,
  extractFamily,
  normalizeDisplayName,
  parseOllamaName,
  parseParameterSizeToBytes,
} from '../model-normalizer.utility';

describe('parseOllamaName', () => {
  it('splits name:tag cleanly', () => {
    expect(parseOllamaName('qwen3:1.7b')).toEqual({ name: 'qwen3', tag: '1.7b' });
  });

  it('defaults to latest when no tag provided', () => {
    expect(parseOllamaName('llama3')).toEqual({ name: 'llama3', tag: 'latest' });
  });

  it('lowercases model name', () => {
    expect(parseOllamaName('Qwen3:1.7B')).toEqual({ name: 'qwen3', tag: '1.7b' });
  });

  it('trims whitespace', () => {
    expect(parseOllamaName('  qwen3 : 1.7b  ')).toEqual({ name: 'qwen3', tag: '1.7b' });
  });

  it('handles namespace/model syntax', () => {
    expect(parseOllamaName('library/qwen3:1.7b')).toEqual({ name: 'qwen3', tag: '1.7b' });
  });

  it('throws on empty input', () => {
    expect(() => parseOllamaName('')).toThrow();
  });

  it('throws on whitespace-only input', () => {
    expect(() => parseOllamaName('   ')).toThrow();
  });
});

describe('buildCanonicalKey', () => {
  it('joins name and tag with colon', () => {
    expect(buildCanonicalKey('qwen3', '1.7b')).toBe('qwen3:1.7b');
  });

  it('lowercases both', () => {
    expect(buildCanonicalKey('Qwen3', '1.7B')).toBe('qwen3:1.7b');
  });

  it('defaults tag to latest', () => {
    expect(buildCanonicalKey('qwen3', '')).toBe('qwen3:latest');
  });
});

describe('extractFamily', () => {
  it('maps qwen2.5-coder to qwen-coder family', () => {
    expect(extractFamily('qwen2.5-coder')).toBe('qwen-coder');
  });

  it('maps qwen3 to qwen family', () => {
    expect(extractFamily('qwen3')).toBe('qwen');
  });

  it('maps llama3.3 to llama family', () => {
    expect(extractFamily('llama3.3')).toBe('llama');
  });

  it('maps deepseek-coder-v2 to deepseek-coder family', () => {
    expect(extractFamily('deepseek-coder-v2')).toBe('deepseek-coder');
  });

  it('maps phi4-mini to phi family', () => {
    expect(extractFamily('phi4-mini')).toBe('phi');
  });

  it('returns null for unknown family', () => {
    expect(extractFamily('random-obscure-model')).toBeNull();
  });
});

describe('normalizeDisplayName', () => {
  it('capitalizes each word in name', () => {
    expect(normalizeDisplayName('qwen3', '1.7b')).toBe('Qwen3 1.7B');
  });

  it('handles hyphenated names', () => {
    expect(normalizeDisplayName('qwen2.5-coder', '32b')).toBe('Qwen2.5 Coder 32B');
  });

  it('uppercases parameter tag', () => {
    expect(normalizeDisplayName('llama3', '70b')).toBe('Llama3 70B');
  });

  it('handles latest tag gracefully', () => {
    expect(normalizeDisplayName('llama3', 'latest')).toBe('Llama3');
  });
});

describe('parseParameterSizeToBytes', () => {
  it('parses 7b to ~5 GiB', () => {
    const result = parseParameterSizeToBytes('7b');
    expect(result).toBeGreaterThan(3_000_000_000n);
    expect(result).toBeLessThan(6_000_000_000n);
  });

  it('parses 70b to ~42 GiB', () => {
    const result = parseParameterSizeToBytes('70b');
    expect(result).toBeGreaterThan(35_000_000_000n);
  });

  it('parses 1.7b correctly', () => {
    const result = parseParameterSizeToBytes('1.7b');
    expect(result).toBeGreaterThan(800_000_000n);
    expect(result).toBeLessThan(2_000_000_000n);
  });

  it('returns null for invalid input', () => {
    expect(parseParameterSizeToBytes('invalid')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseParameterSizeToBytes('')).toBeNull();
  });
});
