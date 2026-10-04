import { chatBaseUrlWithPrefix, isValidChatCompletionsPath } from '../chat-path.utility';

describe('chat path', () => {
  it('folds a path prefix into the base URL and leaves the default alone', () => {
    expect(chatBaseUrlWithPrefix('https://gen.pollinations.ai', '/v1/chat/completions')).toBe(
      'https://gen.pollinations.ai/v1',
    );
    expect(chatBaseUrlWithPrefix('https://x.test/', '/v1/chat/completions')).toBe(
      'https://x.test/v1',
    );
    expect(chatBaseUrlWithPrefix('https://x.test/v1', '/chat/completions')).toBe(
      'https://x.test/v1',
    );
  });

  it('accepts only safe paths ending in /chat/completions', () => {
    expect(isValidChatCompletionsPath('/v1/chat/completions')).toBe(true);
    expect(isValidChatCompletionsPath('/chat/completions')).toBe(true);
    expect(isValidChatCompletionsPath('/v1/completions')).toBe(false);
    expect(isValidChatCompletionsPath('//evil.test/chat/completions')).toBe(false);
    expect(isValidChatCompletionsPath('/v1/chat/completions?x=1')).toBe(false);
  });
});
