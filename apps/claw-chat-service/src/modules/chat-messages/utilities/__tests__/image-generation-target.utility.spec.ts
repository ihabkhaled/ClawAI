import { resolveImageCapabilityProvider } from '../image-generation-target.utility';

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
  ])('redirects %s/%s to %s', (provider, model, expected) => {
    expect(resolveImageCapabilityProvider(provider, model)).toBe(expected);
  });

  it.each([
    ['GEMINI', 'models/gemini-3.6-flash'],
    ['GEMINI', 'models/gemini-3.7-flash-video-understanding-eap'],
    ['GROK', 'grok-4.5'],
    // Video is out of scope: this service has no video-generation capability.
    ['GROK', 'grok-imagine-video'],
    ['GROK', 'grok-imagine-video-1.5'],
    ['OPENAI', 'gpt-5.4'],
    ['ANTHROPIC', 'claude-sonnet-4'],
  ])('leaves %s/%s as an ordinary chat model', (provider, model) => {
    expect(resolveImageCapabilityProvider(provider, model)).toBeUndefined();
  });

  it('ignores a connector this map does not know', () => {
    expect(resolveImageCapabilityProvider('DEEPSEEK', 'deepseek-image')).toBeUndefined();
  });
});
