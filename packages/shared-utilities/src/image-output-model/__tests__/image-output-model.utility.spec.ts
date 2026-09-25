import { describe, expect, it } from 'vitest';

import {
  inferImageCapabilityProvider,
  resolveImageCapabilityProvider,
} from '../image-output-model.utility';

describe('resolveImageCapabilityProvider', () => {
  it.each([
    ['GEMINI', 'models/gemini-3-pro-image', 'IMAGE_GEMINI'],
    ['GEMINI', 'models/gemini-2.5-flash-image', 'IMAGE_GEMINI'],
    ['GEMINI', 'models/gemini-3.1-flash-image-preview', 'IMAGE_GEMINI'],
    ['GEMINI', 'models/imagen-4.0-ultra-generate-001', 'IMAGE_GEMINI'],
    ['GEMINI', 'gemini-2.5-flash-image', 'IMAGE_GEMINI'],
    ['GROK', 'grok-imagine-image', 'IMAGE_GROK'],
    ['GROK', 'grok-imagine-image-2.0', 'IMAGE_GROK'],
    ['GROK', 'grok-imagine-image-quality', 'IMAGE_GROK'],
    ['OPENAI', 'gpt-image-1', 'IMAGE_OPENAI'],
    ['OPENAI', 'gpt-image-1-mini', 'IMAGE_OPENAI'],
    ['OPENAI', 'dall-e-3', 'IMAGE_OPENAI'],
    ['OPENAI', 'chatgpt-image-latest', 'IMAGE_OPENAI'],
    // The connector key is case-insensitive.
    ['grok', 'grok-imagine-image', 'IMAGE_GROK'],
  ])('redirects %s/%s to %s', (provider, model, expected) => {
    expect(resolveImageCapabilityProvider(provider, model)).toBe(expected);
  });

  it.each([
    ['GEMINI', 'models/gemini-3.6-flash'],
    ['GEMINI', 'gemini-2.5-flash'],
    ['GEMINI', 'models/gemini-3.7-flash-video-understanding-eap'],
    ['GROK', 'grok-4'],
    ['GROK', 'grok-4.5'],
    // Video is out of scope: there is no video-generation capability.
    ['GROK', 'grok-imagine-video'],
    ['GROK', 'grok-imagine-video-1.5'],
    ['OPENAI', 'gpt-5.4'],
    ['ANTHROPIC', 'claude-sonnet-4'],
    // A model of one connector under another connector is not redirected.
    ['OPENAI', 'grok-imagine-image'],
  ])('leaves %s/%s as an ordinary chat model', (provider, model) => {
    expect(resolveImageCapabilityProvider(provider, model)).toBeUndefined();
  });

  it('ignores a connector this map does not know', () => {
    expect(resolveImageCapabilityProvider('DEEPSEEK', 'deepseek-image')).toBeUndefined();
  });
});

describe('inferImageCapabilityProvider', () => {
  it.each([
    ['grok-imagine-image', 'IMAGE_GROK'],
    ['models/gemini-2.5-flash-image', 'IMAGE_GEMINI'],
    ['gemini-3-pro-image', 'IMAGE_GEMINI'],
    ['gpt-image-1', 'IMAGE_OPENAI'],
  ])('%s -> %s', (model, expected) => {
    expect(inferImageCapabilityProvider(model)).toBe(expected);
  });

  it.each(['grok-4', 'gemini-2.5-flash', 'gpt-4o', 'claude-sonnet-4', 'grok-imagine-video'])(
    'leaves %s undefined',
    (model) => {
      expect(inferImageCapabilityProvider(model)).toBeUndefined();
    },
  );
});
