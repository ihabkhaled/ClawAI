import { hashAnonymousViewer, hashReader, isBotUserAgent } from '../publication-viewer.utility';

const SECRET = 'k'.repeat(40);
const BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

describe('publication viewer utilities', () => {
  it.each([
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0)',
    'facebookexternalhit/1.1',
    'Slackbot-LinkExpanding 1.0',
    'curl/8.4.0',
    'python-requests/2.31',
    'Mozilla/5.0 Chrome-Lighthouse',
    'HeadlessChrome/130.0',
  ])('treats %s as a bot', (userAgent) => {
    expect(isBotUserAgent(userAgent)).toBe(true);
  });

  it('treats a missing or empty user agent as a bot', () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent('   ')).toBe(true);
  });

  it('treats an ordinary browser as a human', () => {
    expect(isBotUserAgent(BROWSER)).toBe(false);
  });

  it('hashes the same visitor to the same key and different visitors apart', () => {
    const one = hashAnonymousViewer(SECRET, '203.0.113.7', BROWSER);
    expect(hashAnonymousViewer(SECRET, '203.0.113.7', BROWSER)).toBe(one);
    expect(hashAnonymousViewer(SECRET, '203.0.113.8', BROWSER)).not.toBe(one);
    expect(one).toMatch(/^[a-f0-9]{64}$/u);
    expect(one).not.toContain('203.0.113.7');
  });

  it('does not let a different key rebuild a reader hash, and keeps readers apart from viewers', () => {
    expect(hashReader(SECRET, 'user-1')).not.toBe(hashReader('z'.repeat(40), 'user-1'));
    expect(hashReader(SECRET, 'user-1')).not.toBe(hashAnonymousViewer(SECRET, 'user-1', ''));
    expect(hashReader(SECRET, 'user-1')).not.toBe('user-1');
  });
});
