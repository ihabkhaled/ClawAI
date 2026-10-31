import { clipUserAgent, parseUserAgent } from '../user-agent.utility';

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const EDGE_WIN = `${CHROME_WIN} Edg/130.0.2849.46`;
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0';
const SAFARI_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const CHROME_ANDROID_TABLET =
  'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('parseUserAgent', () => {
  it.each([
    [CHROME_WIN, 'Windows', 'Chrome 130', 'DESKTOP'],
    [EDGE_WIN, 'Windows', 'Edge 130', 'DESKTOP'],
    [FIREFOX_LINUX, 'Linux', 'Firefox 131', 'DESKTOP'],
    [SAFARI_MAC, 'macOS', 'Safari 17', 'DESKTOP'],
    [SAFARI_IPHONE, 'iOS 17', 'Safari 17', 'MOBILE'],
    [CHROME_ANDROID, 'Android 14', 'Chrome 130', 'MOBILE'],
    [CHROME_ANDROID_TABLET, 'Android 13', 'Chrome 130', 'TABLET'],
  ])('reads sample %#', (ua, os, browser, kind) => {
    expect(parseUserAgent(ua)).toEqual({ os, browser, deviceKind: kind });
  });

  it('labels command-line and library clients as TOOL', () => {
    expect(parseUserAgent('curl/8.4.0')).toEqual({
      os: null,
      browser: 'curl 8',
      deviceKind: 'TOOL',
    });
    expect(parseUserAgent('python-requests/2.31.0').browser).toBe('Python requests 2');
  });

  it('returns UNKNOWN for empty, missing or unrecognised input', () => {
    expect(parseUserAgent(undefined)).toEqual({ os: null, browser: null, deviceKind: 'UNKNOWN' });
    expect(parseUserAgent('')).toEqual({ os: null, browser: null, deviceKind: 'UNKNOWN' });
    expect(parseUserAgent('???')).toEqual({ os: null, browser: null, deviceKind: 'UNKNOWN' });
  });

  it('survives a hostile, huge string quickly and bounds every label', () => {
    const hostile = `${'Mozilla/5.0 ('.repeat(5_000)}\u0000Chrome/1`;
    const started = Date.now();
    const parsed = parseUserAgent(hostile);
    expect(Date.now() - started).toBeLessThan(500);
    expect((parsed.browser ?? '').length).toBeLessThanOrEqual(64);
  });
  it('matches hostile Version/ and node inputs in linear time', () => {
    const hostile = [
      `Version/${'1'.repeat(400)}`,
      `Version/1${'.1'.repeat(200)} Mobile/${'a'.repeat(100)}`,
      `node${'/'.repeat(400)}`,
    ].join(' ');
    const started = Date.now();
    parseUserAgent(hostile);
    parseUserAgent(`Version/${'1'.repeat(500)}`);
    expect(Date.now() - started).toBeLessThan(200);
    expect(
      parseUserAgent('Mozilla/5.0 (iPhone) Version/17.5 Mobile/15E148 Safari/604.1').browser,
    ).toBe('Safari 17');
  });
});

describe('clipUserAgent', () => {
  it('strips control characters and clips to 512', () => {
    expect(clipUserAgent(`a\u0000b${'x'.repeat(600)}`)?.length).toBe(512);
    expect(clipUserAgent('a\u0007b')).toBe('a b');
    expect(clipUserAgent('   ')).toBeNull();
    expect(clipUserAgent(null)).toBeNull();
  });
});
