import { EmbeddedStateSource } from '../../enums/embedded-state-source.enum';
import { PageExtractionKind } from '../../enums/page-extraction-kind.enum';
import { extractEmbeddedStateText } from '../embedded-state.utility';
import { extractPageContent } from '../page-content.utility';
import { isProse } from '../prose-harvest.utility';
import { decodeReactRouterStream } from '../turbo-stream.utility';

const BODY = 'This is the first public paragraph of the article, long enough to be prose.';
const BODY_2 = 'And this is a second paragraph that carries more of the real public content.';
const BODY_3 =
  'A third sentence pushes the recovered text well past the minimum size floor for use.';

function shell(script: string): string {
  return `<html><head><title>T</title></head><body><div id="__next"></div>${script}</body></html>`;
}

describe('extractEmbeddedStateText', () => {
  it('reads JSON-LD articleBody and skips @type/url keys', () => {
    const ld = {
      '@type': 'Article',
      url: 'https://example.com/a',
      headline: 'Short',
      articleBody: `${BODY} ${BODY_2} ${BODY_3}`,
    };
    const result = extractEmbeddedStateText(
      shell(`<script type="application/ld+json">${JSON.stringify(ld)}</script>`),
    );
    expect(result?.sources).toEqual([EmbeddedStateSource.JSON_LD]);
    expect(result?.text).toContain(BODY);
    expect(result?.text).not.toContain('https://example.com/a');
  });

  it('reads __NEXT_DATA__ page props in order and dedupes', () => {
    const data = {
      props: {
        pageProps: { post: { id: 'x1', title: 'T', blocks: [BODY, BODY_2, BODY, BODY_3] } },
      },
    };
    const result = extractEmbeddedStateText(
      shell(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`),
    );
    expect(result?.sources).toEqual([EmbeddedStateSource.NEXT_DATA]);
    expect(result?.text).toBe([BODY, BODY_2, BODY_3].join('\n\n'));
  });

  it('reads window.__INITIAL_STATE__ assigned as JSON, and never evaluates JS', () => {
    const state = {
      feed: [{ text: BODY }, { text: BODY_2 }, { text: BODY_3 }],
      token: 'secret-token-should-never-appear-in-output-text ok yes',
    };
    const result = extractEmbeddedStateText(
      shell(`<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`),
    );
    expect(result?.sources).toEqual([EmbeddedStateSource.WINDOW_STATE]);
    expect(result?.text).toContain(BODY_2);
    expect(result?.text).not.toContain('secret-token');
    expect(
      extractEmbeddedStateText(shell(`<script>window.__INITIAL_STATE__ = {a: alert(1)};</script>`)),
    ).toBeNull();
  });

  it('strips markup inside CMS body strings', () => {
    const data = { content: { rendered: `<p>${BODY}</p><p>${BODY_2}</p><p>${BODY_3}</p>` } };
    const result = extractEmbeddedStateText(
      shell(`<script type="application/json">${JSON.stringify(data)}</script>`),
    );
    expect(result?.text).not.toContain('<p>');
    expect(result?.text).toContain(BODY_3);
  });

  it('returns null when the page ships no prose (config only)', () => {
    const config = { featureFlags: { a: true }, locale: 'en-US', buildId: 'abc123' };
    expect(
      extractEmbeddedStateText(
        shell(`<script type="application/json">${JSON.stringify(config)}</script>`),
      ),
    ).toBeNull();
    expect(extractEmbeddedStateText('<p>no scripts</p>')).toBeNull();
  });
});

describe('decodeReactRouterStream', () => {
  it('hydrates the flat turbo-stream array, null sentinels included', () => {
    const flat = [{ _1: 2, _3: -5 }, 'loaderData', { _4: 5 }, 'errors', 'title', 'Hello'];
    const html = `<script>window.__reactRouterContext.streamController.enqueue(${JSON.stringify(`${JSON.stringify(flat)}\n`)});</script>`;
    expect(decodeReactRouterStream(html)).toEqual({ loaderData: { title: 'Hello' }, errors: null });
  });

  it('cannot be used to pollute a prototype', () => {
    const flat = [{ _1: 2 }, '__proto__', { _3: 4 }, 'polluted', 'yes'];
    const html = `<script>x.streamController.enqueue(${JSON.stringify(JSON.stringify(flat))});</script>`;
    decodeReactRouterStream(html);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('returns null without a stream', () => {
    expect(decodeReactRouterStream('<p>plain</p>')).toBeNull();
  });
});

describe('isProse', () => {
  it.each([
    [BODY, true],
    [
      '这是一个足够长的中文句子用于测试我们的散文检测逻辑是否能够正确地识别没有空格的书写系统内容是否可用',
      true,
    ],
    ['https://example.com/a/very/long/path/that/is/not/prose/at/all/really', false],
    ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIn0', false],
    ['short text', false],
  ])('%s → %s', (text, expected) => {
    expect(isProse(text)).toBe(expected);
  });
});

describe('extractPageContent embedded-state fallback', () => {
  it('uses embedded state only when the visible text is thin', () => {
    const data = { props: { pageProps: { blocks: [BODY, BODY_2, BODY_3] } } };
    const page = extractPageContent(
      shell(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`),
      'https://example.com/',
    );
    expect(page.extraction).toBe(PageExtractionKind.EMBEDDED_STATE);
    expect(page.content).toContain(BODY_3);
  });

  it('keeps the visible article when it is substantial', () => {
    const visible = `<article>${`<p>${BODY}</p>`.repeat(12)}</article>`;
    const page = extractPageContent(
      `<html><body>${visible}<script type="application/json">{"x":"${BODY_2}"}</script></body></html>`,
      'https://example.com/',
    );
    expect(page.extraction).not.toBe(PageExtractionKind.EMBEDDED_STATE);
    expect(page.content).not.toContain(BODY_2);
  });
});
