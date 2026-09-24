import { describe, expect, it } from 'vitest';
import { resolveOpenAiImageQuality } from '../openai-image-quality.utility';

describe('resolveOpenAiImageQuality', () => {
  it('pins gpt-image-1 to the priced tier when the caller sent nothing', () => {
    expect(resolveOpenAiImageQuality('gpt-image-1', undefined)).toBe('high');
  });

  it('pins gpt-image-1 even when the caller asked for a cheaper tier it would be billed above', () => {
    expect(resolveOpenAiImageQuality('gpt-image-1', 'low')).toBe('high');
  });

  it('is case-insensitive on the model id', () => {
    expect(resolveOpenAiImageQuality('GPT-Image-1', 'medium')).toBe('high');
  });

  it("keeps a dall-e caller's quality untouched", () => {
    expect(resolveOpenAiImageQuality('dall-e-3', 'hd')).toBe('hd');
    expect(resolveOpenAiImageQuality('dall-e-3', undefined)).toBeUndefined();
  });
});
