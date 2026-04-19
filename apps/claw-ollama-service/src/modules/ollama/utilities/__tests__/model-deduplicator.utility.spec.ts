import {
  buildCandidateDedupKey,
  isDuplicateOfCatalog,
  isDuplicateOfInstalled,
} from '../model-deduplicator.utility';

describe('buildCandidateDedupKey', () => {
  it('builds canonical key from name and tag', () => {
    expect(buildCandidateDedupKey('qwen3', '1.7b')).toBe('qwen3:1.7b');
  });

  it('normalizes case', () => {
    expect(buildCandidateDedupKey('Qwen3', '1.7B')).toBe('qwen3:1.7b');
  });
});

describe('isDuplicateOfCatalog', () => {
  const existingCatalog = [
    { name: 'qwen3', tag: '1.7b', ollamaName: 'qwen3:1.7b' },
    { name: 'llama3.3', tag: '70b', ollamaName: 'llama3.3:70b' },
  ];

  it('detects exact match', () => {
    const result = isDuplicateOfCatalog('qwen3', '1.7b', existingCatalog);
    expect(result).toBe(true);
  });

  it('detects case-insensitive match', () => {
    const result = isDuplicateOfCatalog('QWEN3', '1.7B', existingCatalog);
    expect(result).toBe(true);
  });

  it('detects match via ollamaName mapping', () => {
    const customCatalog = [{ name: 'qwen-1.7', tag: 'base', ollamaName: 'qwen3:1.7b' }];
    const result = isDuplicateOfCatalog('qwen3', '1.7b', customCatalog);
    expect(result).toBe(true);
  });

  it('returns false for new model', () => {
    const result = isDuplicateOfCatalog('brand-new-model', 'latest', existingCatalog);
    expect(result).toBe(false);
  });

  it('returns false for same name different tag', () => {
    const result = isDuplicateOfCatalog('qwen3', '7b', existingCatalog);
    expect(result).toBe(false);
  });
});

describe('isDuplicateOfInstalled', () => {
  const installed = [
    { name: 'qwen3', tag: '1.7b' },
    { name: 'llama3.3', tag: '70b' },
  ];

  it('detects exact match', () => {
    expect(isDuplicateOfInstalled('qwen3', '1.7b', installed)).toBe(true);
  });

  it('returns false for not installed', () => {
    expect(isDuplicateOfInstalled('qwen3', '7b', installed)).toBe(false);
  });
});
