import { extractPageContent } from '../page-content.utility';
import { assertPublicThirdPartyUrl } from '../public-url.utility';
import { joinUrl, resolveStrategyBaseUrl } from '../strategy-config.utility';
import { readBodyPrefix, readLimitedBody, parseMimeType } from '../limited-body.utility';
import { toRawSnapshotUrl, waybackTimestampToIso } from '../wayback-snapshot.utility';
import { buildResultFromRawBody } from '../raw-body-result.utility';
import { followRedirectsSafely } from '../safe-redirect.utility';

function stream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
}

const ARTICLE_HTML = `<html><head><title>Story</title></head><body>
  <nav><a href="/">Home</a> <a href="/about">About</a></nav>
  <article><h1>Big story</h1>
  ${'<p>This is a long paragraph of real article text that Readability should keep. '.repeat(12)}</p>
  <p>See <a href="/more">more</a>.</p></article>
  <footer>Copyright footer text</footer></body></html>`;

describe('extractPageContent', () => {
  it('uses the Readability article as Markdown when it finds one', () => {
    const page = extractPageContent(ARTICLE_HTML, 'https://news.example/story');

    expect(page.readable).toBe(true);
    expect(page.title).toBe('Story');
    expect(page.content).toContain('real article text');
    expect(page.content).not.toContain('Copyright footer text');
    expect(page.content).toContain('](https://news.example/more)');
  });

  it('falls back to the plain text for a page with no article', () => {
    const page = extractPageContent(
      '<html><body><p>Short.</p></body></html>',
      'https://x.example/',
    );

    expect(page.readable).toBe(false);
    expect(page.content).toContain('Short.');
  });
});

describe('assertPublicThirdPartyUrl', () => {
  it('accepts an ordinary public URL', () => {
    expect(assertPublicThirdPartyUrl('https://example.com/a?page=2').hostname).toBe('example.com');
  });

  it.each([
    'http://localhost/',
    'http://10.0.0.1/',
    'https://example.com/?api_key=1',
    'https://mail.google.com/mail/u/0',
    'https://team.notion.so/page',
  ])('refuses %s', (url) => {
    expect(() => assertPublicThirdPartyUrl(url)).toThrow();
  });
});

describe('resolveStrategyBaseUrl / joinUrl', () => {
  it('prefers a configured http(s) base and falls back otherwise', () => {
    expect(resolveStrategyBaseUrl({ baseUrl: 'http://x:1' }, 'http://d')).toBe('http://x:1');
    expect(resolveStrategyBaseUrl({ baseUrl: 'ftp://x' }, 'http://d')).toBe('http://d');
    expect(resolveStrategyBaseUrl(undefined, 'http://d')).toBe('http://d');
    expect(() => resolveStrategyBaseUrl(undefined, undefined)).toThrow();
  });

  it('joins without doubling slashes', () => {
    expect(joinUrl('http://a/', '/b')).toBe('http://a/b');
  });
});

describe('body readers', () => {
  it('readLimitedBody fails past the limit', async () => {
    await expect(readLimitedBody(stream('abcdef'), 3)).rejects.toThrow(/max size/u);
    expect((await readLimitedBody(stream('ab', 'c'), 3)).toString()).toBe('abc');
    expect((await readLimitedBody(null, 3)).length).toBe(0);
  });

  it('readBodyPrefix keeps the first bytes and ignores the rest', async () => {
    expect((await readBodyPrefix(stream('abc', 'def'), 4)).toString()).toBe('abcd');
    expect((await readBodyPrefix(undefined, 4)).length).toBe(0);
  });

  it('parseMimeType strips parameters', () => {
    expect(parseMimeType('Text/HTML; charset=utf-8')).toBe('text/html');
    expect(parseMimeType(null)).toBeNull();
  });
});

describe('wayback helpers', () => {
  it('builds the raw https snapshot URL', () => {
    expect(
      toRawSnapshotUrl(
        'http://web.archive.org/web/20200101000000/https://x.example/',
        '20200101000000',
      ),
    ).toBe('https://web.archive.org/web/20200101000000id_/https://x.example/');
  });

  it('converts a timestamp to ISO and leaves junk alone', () => {
    expect(waybackTimestampToIso('20200102030405')).toBe('2020-01-02T03:04:05.000Z');
    expect(waybackTimestampToIso('20200102')).toBe('2020-01-02T00:00:00.000Z');
    expect(waybackTimestampToIso('bad')).toBe('bad');
  });
});

describe('buildResultFromRawBody', () => {
  const base = {
    url: 'https://x.example/',
    finalUrl: 'https://x.example/',
    httpStatus: 200,
    byteSize: 5,
    startedAt: Date.now(),
  };

  it('pretty-prints JSON and keeps raw HTML for HTML', () => {
    expect(
      buildResultFromRawBody({ ...base, mimeType: 'application/json', body: '{"a":1}' }).content,
    ).toContain('"a": 1');
    expect(
      buildResultFromRawBody({ ...base, mimeType: 'application/json', body: 'not json' }).content,
    ).toBe('not json');
    expect(
      buildResultFromRawBody({ ...base, mimeType: 'text/html', body: '<p>hi</p>' }).rawHtml,
    ).toBe('<p>hi</p>');
    expect(buildResultFromRawBody({ ...base, mimeType: 'text/plain', body: 'plain' }).content).toBe(
      'plain',
    );
  });

  it('refuses a content type we never parse', () => {
    expect(() => buildResultFromRawBody({ ...base, mimeType: 'image/png', body: '' })).toThrow(
      /Unsupported content-type/u,
    );
  });
});

describe('followRedirectsSafely', () => {
  it('returns the chain and final URL', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ status: 301, location: 'https://b.example/', response: 'r1' })
      .mockResolvedValueOnce({ status: 200, location: null, response: 'r2' });

    const result = await followRedirectsSafely('https://a.example/', send, {
      maxRedirects: 3,
      allowlist: [],
    });

    expect(result).toEqual({
      response: 'r2',
      finalUrl: 'https://b.example/',
      chain: ['https://a.example/', 'https://b.example/'],
    });
  });

  it('lets an operator-allowlisted private host through', async () => {
    const send = vi.fn().mockResolvedValue({ status: 200, location: null, response: 'ok' });

    const result = await followRedirectsSafely('http://wiki.internal/', send, {
      maxRedirects: 1,
      allowlist: ['wiki.internal'],
    });

    expect(result.finalUrl).toBe('http://wiki.internal/');
  });
});
