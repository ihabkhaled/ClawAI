import { describe, expect, it } from 'vitest';

import { isThreadCreditModel, pickDistinctModels } from '../thread-model-defaults.utility';

const model = (provider: string, name: string) => ({
  provider,
  model: name,
  displayName: name,
});

describe('isThreadCreditModel', () => {
  it('flags credit providers and not included ones', () => {
    expect(isThreadCreditModel({ provider: 'OPENAI' })).toBe(true);
    expect(isThreadCreditModel({ provider: 'OLLAMA' })).toBe(false);
  });
});

describe('pickDistinctModels with credit models', () => {
  it('prefers models the plan includes over credit models', () => {
    const picked = pickDistinctModels(
      [
        model('OPENAI', 'a'),
        model('ANTHROPIC', 'b'),
        model('OLLAMA', 'c'),
        model('OPENROUTER', 'd'),
      ],
      4,
    );
    expect(picked.map(({ model: name }) => name)).toEqual(['c', 'd', 'c', 'd']);
  });

  it('still returns credit models when nothing else exists', () => {
    const picked = pickDistinctModels([model('OPENAI', 'a')], 2);
    expect(picked.map(({ model: name }) => name)).toEqual(['a', 'a']);
  });
});
