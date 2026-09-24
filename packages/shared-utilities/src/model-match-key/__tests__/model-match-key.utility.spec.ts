import { describe, expect, it } from 'vitest';

import { bareModelKey, modelMatchKey } from '../model-match-key.utility';

describe('bareModelKey', () => {
  it.each([
    ['models/gemini-2.5-flash', 'gemini-2.5-flash'],
    ['  Models/Gemini-2.5-Pro ', 'gemini-2.5-pro'],
    ['glm-4.7:cloud', 'glm-4.7'],
    ['gpt-4o', 'gpt-4o'],
    // Only a leading prefix and a trailing suffix are decoration.
    ['my-models/x', 'my-models/x'],
    ['cloud:model', 'cloud:model'],
  ])('%s -> %s', (raw, expected) => {
    expect(bareModelKey(raw)).toBe(expected);
  });
});

describe('modelMatchKey', () => {
  it('upper-cases the provider and strips model decoration', () => {
    expect(modelMatchKey(' gemini ', 'models/gemini-2.5-flash')).toBe('GEMINI/gemini-2.5-flash');
  });

  it('makes the catalog and the bare spelling of one model equal', () => {
    expect(modelMatchKey('GEMINI', 'models/gemini-2.5-flash')).toBe(
      modelMatchKey('GEMINI', 'gemini-2.5-flash'),
    );
  });
});
