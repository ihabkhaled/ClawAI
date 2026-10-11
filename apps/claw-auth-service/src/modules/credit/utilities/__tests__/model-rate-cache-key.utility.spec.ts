import { canonicalRateModelId, rateModelFamily } from '../model-rate-cache-key.utility';

describe('canonicalRateModelId', () => {
  it.each([
    ['models/gemini-2.5-flash', 'gemini-2.5-flash'],
    ['gpt-4o:batch', 'gpt-4o'],
    ['gpt-4o~latest', 'gpt-4o'],
    ['  models/gpt-4o:BATCH ', 'gpt-4o'],
    ['gpt-4o-2024-08-06', 'gpt-4o-2024-08-06'],
    ['~odd', '~odd'],
    ['gpt-oss:120b', 'gpt-oss:120b'],
  ])('%s -> %s', (input, expected) => {
    expect(canonicalRateModelId(input)).toBe(expected);
  });
});

describe('rateModelFamily', () => {
  it('drops a trailing release date after decoration', () => {
    expect(rateModelFamily('models/claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
    expect(rateModelFamily('gpt-4o-2024-08-06:batch')).toBe('gpt-4o');
  });

  it('keeps a version marker', () => {
    expect(rateModelFamily('gpt-4.1-mini')).toBe('gpt-4.1-mini');
  });
});
