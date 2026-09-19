import { PROMPT_URL_MAX_PER_MESSAGE } from '../../constants/prompt-url.constants';
import { detectPromptUrls } from '../prompt-url.utility';

describe('detectPromptUrls', () => {
  it('finds a link the user pasted', () => {
    expect(detectPromptUrls('summarise https://example.com/post please')).toEqual([
      'https://example.com/post',
    ]);
  });

  it('finds EVERY link, not just the first', () => {
    // A message naming three pages is asking about three pages.
    const urls = detectPromptUrls(
      'compare https://a.example/1 with https://b.example/2 and https://c.example/3',
    );
    expect(urls).toHaveLength(3);
  });

  it('drops the sentence punctuation after a link', () => {
    // People write "see https://x.example/a." and the full stop is grammar.
    expect(detectPromptUrls('see https://x.example/a.')).toEqual(['https://x.example/a']);
  });

  it('refuses a scheme that is not a web page', () => {
    // These URLs are fetched by the server on behalf of an untrusted prompt.
    expect(detectPromptUrls('read file:///etc/passwd')).toEqual([]);
    expect(detectPromptUrls('read ftp://example.com/x')).toEqual([]);
  });

  it('refuses a URL carrying credentials', () => {
    expect(detectPromptUrls('fetch https://user:pass@example.com/x')).toEqual([]);
  });

  it('returns each link once', () => {
    expect(detectPromptUrls('https://a.example/1 and again https://a.example/1')).toHaveLength(1);
  });

  it('bounds a pasted wall of links', () => {
    // Untrusted input: two hundred links must not become two hundred crawls.
    const many = Array.from({ length: 50 }, (_, i) => `https://e${i}.example/p`).join(' ');
    expect(detectPromptUrls(many)).toHaveLength(PROMPT_URL_MAX_PER_MESSAGE);
  });

  it('finds nothing in a message with no link', () => {
    expect(detectPromptUrls('explain how promises work')).toEqual([]);
  });

  // The reported bug: a link typed the way people type links was invisible,
  // so the page was never opened.
  it('finds a link written without a scheme or www', () => {
    expect(detectPromptUrls('summarise example.com/pricing')).toEqual([
      'https://example.com/pricing',
    ]);
    expect(detectPromptUrls('check www.example.org')).toEqual(['https://www.example.org/']);
  });

  it('does not mistake a file name or a property for a link', () => {
    expect(detectPromptUrls('edit main.py and read user.id')).toEqual([]);
  });
});
