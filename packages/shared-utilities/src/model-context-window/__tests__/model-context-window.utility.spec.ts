import { describe, expect, it } from 'vitest';

import { knownContextWindow } from '../model-context-window.utility';

describe('knownContextWindow', () => {
  it.each([
    ['OPENAI', 'gpt-4.1-mini', 1_047_576],
    ['OPENAI', 'gpt-5.5', 400_000],
    ['OPENAI', 'o3-mini', 200_000],
    ['OPENAI', 'gpt-4o-mini', 128_000],
    ['OPENAI', 'gpt-4', 8_192],
    ['ANTHROPIC', 'claude-sonnet-5', 200_000],
    ['GEMINI', 'models/gemini-3.6-flash', 1_048_576],
    ['gemini', 'gemini-1.5-pro-002', 2_097_152],
    ['DEEPSEEK', 'deepseek-chat', 65_536],
    ['GROK', 'grok-4', 256_000],
    ['GROK', 'grok-3-mini', 131_072],
  ])('%s %s -> %d', (provider, model, tokens) => {
    expect(knownContextWindow(provider, model)).toBe(tokens);
  });

  it('knows nothing about an unknown family or provider', () => {
    expect(knownContextWindow('OPENAI', 'whisper-1')).toBeUndefined();
    expect(knownContextWindow('OLLAMA', 'glm-5.2')).toBeUndefined();
  });
});
