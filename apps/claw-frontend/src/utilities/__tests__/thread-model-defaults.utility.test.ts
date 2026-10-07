import { describe, expect, it } from 'vitest';

import type { ModelSelection } from '@/types';
import {
  isThreadModelGroupKey,
  pickDistinctModels,
} from '@/utilities/thread-model-defaults.utility';

const model = (provider: string, key: string): ModelSelection => ({
  provider,
  model: key,
  displayName: key,
});

describe('pickDistinctModels', () => {
  it('gives each role a different model when enough exist', () => {
    const picked = pickDistinctModels(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((key) => model('P', key)),
      5,
    );
    expect(new Set(picked.map((entry) => entry.model)).size).toBe(5);
  });

  it('repeats from the start when fewer models exist than roles', () => {
    const picked = pickDistinctModels([model('P', 'a'), model('P', 'b')], 5);
    expect(picked.map((entry) => entry.model)).toEqual(['a', 'b', 'a', 'b', 'a']);
  });

  it('treats the same model key under two providers as two models', () => {
    const picked = pickDistinctModels([model('P', 'a'), model('Q', 'a')], 2);
    expect(picked.map((entry) => entry.provider)).toEqual(['P', 'Q']);
  });

  it('puts one model from each established provider first', () => {
    const picked = pickDistinctModels(
      [
        model('HUGGING', 'x1'),
        model('OLLAMA', 'o1'),
        model('OLLAMA', 'o2'),
        model('ANTHROPIC', 'c1'),
      ],
      3,
    );
    expect(picked.map((entry) => entry.model)).toEqual(['c1', 'o1', 'x1']);
  });

  it('returns nothing when no model is available', () => {
    expect(pickDistinctModels([], 5)).toEqual([]);
  });
});

describe('isThreadModelGroupKey', () => {
  it.each([['ANTHROPIC'], ['OLLAMA'], ['GEMINI']])('offers %s models', (key) => {
    expect(isThreadModelGroupKey(key)).toBe(true);
  });

  it.each([['local-ollama'], ['local-llamacpp'], ['IMAGE_OPENAI']])('hides %s', (key) => {
    expect(isThreadModelGroupKey(key)).toBe(false);
  });
});
