import { detectUrlsInText, hasFetchableUrl } from '../url-detection.utility';
import { DIRECT_FETCH_MAX_URLS } from '../../constants/url-detection.constants';

/**
 * The step that did not exist.
 *
 * A prompt like `summarize https://example.com/post` used to reach the search
 * engine as a keyword query that happened to contain a URL. The page the user
 * named was opened only if the engine happened to return it.
 */
describe('detectUrlsInText', () => {
  it('finds a URL inside an ordinary sentence', () => {
    expect(detectUrlsInText('summarize https://example.com/post please')).toEqual([
      'https://example.com/post',
    ]);
  });

  it('trims the sentence punctuation people actually type', () => {
    expect(detectUrlsInText('read https://example.com/post.')).toEqual([
      'https://example.com/post',
    ]);
    expect(detectUrlsInText('see (https://example.com/a) for more')).toEqual([
      'https://example.com/a',
    ]);
    expect(detectUrlsInText('links: https://example.com/a, https://example.com/b;')).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
  });

  it('keeps a trailing slash, which is part of the URL and not punctuation', () => {
    expect(detectUrlsInText('open https://example.com/dir/')).toEqual(['https://example.com/dir/']);
  });

  it('keeps query strings and fragments intact', () => {
    expect(detectUrlsInText('https://example.com/s?q=a&b=c#frag')).toEqual([
      'https://example.com/s?q=a&b=c#frag',
    ]);
  });

  it('returns URLs in the order they were written', () => {
    expect(detectUrlsInText('compare https://b.example.com and https://a.example.com')).toEqual([
      'https://b.example.com',
      'https://a.example.com',
    ]);
  });

  it('deduplicates the same page written twice', () => {
    expect(detectUrlsInText('https://example.com/x and again https://EXAMPLE.com/x')).toHaveLength(
      1,
    );
  });

  it('caps how many pages one run will open', () => {
    // A bound, not a preference: each fetch is a network round trip. A prompt
    // can contain a hundred links.
    const many = Array.from({ length: 10 }, (_unused, index) => `https://e${String(index)}.com`);
    expect(detectUrlsInText(many.join(' '))).toHaveLength(DIRECT_FETCH_MAX_URLS);
  });

  it('refuses every scheme that is not http or https', () => {
    // These would be fetched if returned, so the exclusion is deliberate and
    // not an accident of the pattern.
    expect(detectUrlsInText('javascript:alert(1)')).toEqual([]);
    expect(detectUrlsInText('data:text/html,<h1>x</h1>')).toEqual([]);
    expect(detectUrlsInText('file:///etc/passwd')).toEqual([]);
    expect(detectUrlsInText('vbscript:msgbox(1)')).toEqual([]);
    expect(detectUrlsInText('ftp://example.com/x')).toEqual([]);
  });

  it('ignores a bare domain, which is a search term rather than a link', () => {
    expect(detectUrlsInText('what is example.com')).toEqual([]);
  });

  it('rejects a URL longer than the fetch DTO would accept', () => {
    const tooLong = `https://example.com/${'a'.repeat(2100)}`;
    expect(detectUrlsInText(tooLong)).toEqual([]);
  });

  it('returns nothing for empty or link-free text', () => {
    expect(detectUrlsInText('')).toEqual([]);
    expect(detectUrlsInText('explain quantum tunnelling')).toEqual([]);
  });

  it('does not carry regex state between calls', () => {
    // A /g regex keeps `lastIndex`, so a shared instance makes every second
    // call start halfway through the string. This is that bug's regression.
    const text = 'read https://example.com/one';
    expect(detectUrlsInText(text)).toEqual(detectUrlsInText(text));
  });
});

describe('hasFetchableUrl', () => {
  it('agrees with the detector', () => {
    expect(hasFetchableUrl('go to https://example.com')).toBe(true);
    expect(hasFetchableUrl('no links here')).toBe(false);
    expect(hasFetchableUrl('file:///etc/passwd')).toBe(false);
  });
});
