import { describe, expect, it } from 'vitest';

import { resolveOllamaCloudBaseUrl } from '../ollama-cloud-base-url.utility';

describe('resolveOllamaCloudBaseUrl', () => {
  it.each([
    [null, 'https://ollama.com/api'],
    ['', 'https://ollama.com/api'],
    ['http://localhost:11434', 'https://ollama.com/api'],
    ['http://127.0.0.1:11434/', 'https://ollama.com/api'],
    ['https://ollama.com/api', 'https://ollama.com/api'],
    ['https://ollama.com/api/', 'https://ollama.com/api'],
    ['https://ollama.com/v1', 'https://ollama.com/api'],
    ['https://ollama.com', 'https://ollama.com/api'],
  ])('maps %s to %s', (stored, expected) => {
    expect(resolveOllamaCloudBaseUrl(stored)).toBe(expected);
  });
});
