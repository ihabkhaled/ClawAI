import { describe, expect, it } from 'vitest';

import { modelCanCallMediaTools, providerHasToolDialect } from '../tool-dialect-provider.utility';

describe('modelCanCallMediaTools', () => {
  it.each([
    ['GROK', 'grok-4.20-0309-non-reasoning'],
    ['GROK', 'grok-4.20-0309-reasoning'],
    ['OPENAI', 'gpt-4o'],
    ['GEMINI', 'models/gemini-2.5-pro'],
    ['ANTHROPIC', 'claude-sonnet-5'],
  ])('%s %s can', (provider, model) => {
    expect(modelCanCallMediaTools(provider, model)).toBe(true);
  });

  it.each([
    ['GROK', 'grok-4.20-multi-agent'],
    ['GROK', 'grok-imagine-image'],
    ['GEMINI', 'veo-3.1-generate-preview'],
    ['OPENAI', 'gpt-4o-mini-tts'],
    ['OPENAI', 'text-embedding-3-small'],
    ['OPENAI', 'gpt-realtime'],
    ['OPENROUTER', 'openai/gpt-4o'],
    ['GROQ', 'llama-3.3-70b'],
  ])('%s %s cannot', (provider, model) => {
    expect(modelCanCallMediaTools(provider, model)).toBe(false);
  });

  it('keeps Ollama on the router redirect: it has a dialect but is not offered the media tools', () => {
    expect(modelCanCallMediaTools('OLLAMA', 'kimi-k2.6:cloud')).toBe(false);
    expect(modelCanCallMediaTools('local-ollama', 'qwen3:7b')).toBe(false);
  });

  it('knows local runtimes', () => {
    expect(providerHasToolDialect('local-ollama')).toBe(true);
    expect(providerHasToolDialect('OLLAMA')).toBe(true);
  });
});
