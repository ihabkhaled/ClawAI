import { THIN_PAGE_NOTICE_PREFIX } from '../../constants/thin-content.constants';
import SHARE_HTML from '../__fixtures__/chatgpt-share.html?raw';
import PREVIEW_HTML from '../__fixtures__/chatgpt-share-bot-preview.html?raw';
import { extractPageContent } from '../page-content.utility';
import { isLoginWall, isThinContent, markThinResult } from '../thin-content.utility';
import type { FetchResult } from '../../types/fetch.types';

function htmlResult(rawHtml: string, url = 'https://example.com/'): FetchResult {
  const page = extractPageContent(rawHtml, url);
  return {
    url,
    finalUrl: url,
    httpStatus: 200,
    mimeType: 'text/html',
    title: page.title,
    content: page.content,
    links: page.links,
    byteSize: rawHtml.length,
    cacheHit: false,
    latencyMs: 1,
    rawHtml,
    metadata: page.metadata,
  };
}

const ARTICLE = `<html><head><title>Real</title><script src="app.js"></script></head><body><article>${'<p>This is a real paragraph of public text that a reader can use.</p>'.repeat(20)}</article></body></html>`;

describe('isThinContent', () => {
  it('flags the real chatgpt.com link-preview stub (no scripts, social card only)', () => {
    expect(isThinContent(htmlResult(PREVIEW_HTML, 'https://chatgpt.com/share/6b02f500'))).toBe(
      true,
    );
  });

  it('flags an SPA mount with no text', () => {
    expect(isThinContent(htmlResult('<div id="root"></div><script src="/a.js"></script>'))).toBe(
      true,
    );
  });

  it('flags a noscript "enable JavaScript" wall even above the 200-char floor', () => {
    const wall = `You need to enable JavaScript to run this app. ${'More footer words here. '.repeat(12)}`;
    expect(
      isThinContent(htmlResult(`<body><noscript>${wall}</noscript><p>${wall}</p></body>`)),
    ).toBe(true);
  });

  it('flags tiny text on a huge script payload', () => {
    const html = `<body><p>Loading the application shell, please wait a moment.</p><script>${'x'.repeat(160_000)}</script></body>`;
    expect(isThinContent(htmlResult(html))).toBe(true);
  });

  it('keeps an honest short static page (example.com) as read', () => {
    const html =
      '<html><head><title>Example Domain</title></head><body><h1>Example Domain</h1><p>This domain is for use in illustrative examples in documents.</p></body></html>';
    expect(isThinContent(htmlResult(html))).toBe(false);
  });

  it('keeps a real article as read, scripts or not', () => {
    expect(isThinContent(htmlResult(ARTICLE))).toBe(false);
  });

  it('keeps a page whose embedded state supplied the text as read', () => {
    expect(
      isThinContent(
        htmlResult(SHARE_HTML, 'https://chatgpt.com/share/6b02f500-3a54-83e9-ba54-d4754582dfc2'),
      ),
    ).toBe(false);
  });

  it('judges a sidecar page reported with its redirect status (302 to a sign-in page)', () => {
    const signIn =
      '<html><head><title>Gemini</title><script src="/a.js"></script></head><body>Gemini Sign in Google apps</body></html>';
    expect(isThinContent({ ...htmlResult(signIn), httpStatus: 302 })).toBe(true);
  });

  it('never judges an error status or a non-HTML result', () => {
    expect(
      isThinContent({ ...htmlResult('<div id="root"></div><script></script>'), httpStatus: 500 }),
    ).toBe(false);
    expect(
      isThinContent({
        ...htmlResult('<div id="root"></div><script></script>'),
        mimeType: 'application/json',
      }),
    ).toBe(false);
  });
});

describe('markThinResult', () => {
  it('prefixes a notice and sets thinContent', () => {
    const marked = markThinResult(htmlResult('<div id="root">Hi</div><script></script>'));
    expect(marked.content.startsWith(THIN_PAGE_NOTICE_PREFIX)).toBe(true);
    expect(marked.thinContent).toBe(true);
  });

  it('recognises a login wall', () => {
    expect(isLoginWall('Please sign in to continue to Docs')).toBe(true);
    expect(isLoginWall('Public article text')).toBe(false);
  });
});
