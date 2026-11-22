import { PageExtractionKind } from '../../enums/page-extraction-kind.enum';
import { extractChatGptShare, isChatGptShareUrl } from '../chatgpt-share.utility';
import { extractPageContent } from '../page-content.utility';
// Saved from the real share page (2026-11-22), stream payload trimmed to the conversation.
import SHARE_HTML from '../__fixtures__/chatgpt-share.html?raw';
// The rendered "octane" frontend (crawl4ai, 2026-11-22), data trimmed to the conversation.
import RENDERED_HTML from '../__fixtures__/chatgpt-share-rendered.html?raw';
// What chatgpt.com serves a bot User-Agent: a link preview with no conversation.
import PREVIEW_HTML from '../__fixtures__/chatgpt-share-bot-preview.html?raw';

const SHARE_URL = 'https://chatgpt.com/share/6b02f500-3a54-83e9-ba54-d4754582dfc2';

describe('isChatGptShareUrl', () => {
  it.each([
    [SHARE_URL, true],
    ['https://chat.openai.com/share/abc-123', true],
    ['https://chatgpt.com/c/abc-123', false],
    ['https://chatgpt.com/', false],
    ['https://evil.example/share/abc', false],
  ])('%s → %s', (url, expected) => {
    expect(isChatGptShareUrl(new URL(url))).toBe(expected);
  });
});

describe('extractChatGptShare', () => {
  it('reads the user and assistant turns, in order, from the real page data', () => {
    const extracted = extractChatGptShare(SHARE_HTML);

    expect(extracted?.title).toBe('تصميم نظام RFID');
    const text = extracted?.text ?? '';
    expect(text.startsWith('# تصميم نظام RFID\n\n**User:**\n')).toBe(true);
    expect(text).toContain('warehouses');
    expect(text).toContain('**ChatGPT:**');
    expect(text.indexOf('**User:**')).toBeLessThan(text.indexOf('**ChatGPT:**'));
  });

  it('leaves hidden system and tool messages out', () => {
    const text = extractChatGptShare(SHARE_HTML)?.text ?? '';
    expect(text).not.toMatch(/\*\*(?:system|tool):\*\*/iu);
    const labels = text.match(/^\*\*(\w+):\*\*$/gmu) ?? [];
    expect(new Set(labels)).toEqual(new Set(['**User:**', '**ChatGPT:**']));
  });

  it('reads the rendered "octane" variant (__WEB_MOBILE_DATA__ messages) a browser gets', () => {
    const extracted = extractChatGptShare(RENDERED_HTML);

    expect(extracted?.title).toBe('تصميم نظام RFID');
    const text = extracted?.text ?? '';
    expect(text).toContain('**User:**\nلو عندنا مئات الwarehouses');
    expect(text).toContain('**ChatGPT:**\n# RFID System Architecture');
    // The empty user part (an upload placeholder) is not a turn.
    expect(text).not.toContain('**User:**\n\n');
  });

  it('returns null for the bot link-preview page (nothing to read)', () => {
    expect(extractChatGptShare(PREVIEW_HTML)).toBeNull();
  });

  it('reads the older mapping/current_node shape (__NEXT_DATA__)', () => {
    const data = {
      props: {
        pageProps: {
          serverResponse: {
            data: {
              title: 'Old share',
              current_node: 'b',
              mapping: {
                a: {
                  id: 'a',
                  parent: null,
                  message: {
                    author: { role: 'user' },
                    content: { content_type: 'text', parts: ['Question?'] },
                  },
                },
                b: {
                  id: 'b',
                  parent: 'a',
                  message: {
                    author: { role: 'assistant' },
                    content: { content_type: 'text', parts: ['Answer.'] },
                  },
                },
              },
            },
          },
        },
      },
    };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
    expect(extractChatGptShare(html)?.text).toBe(
      '# Old share\n\n**User:**\nQuestion?\n\n**ChatGPT:**\nAnswer.',
    );
  });

  it('is what extractPageContent uses for a share URL', () => {
    const page = extractPageContent(SHARE_HTML, SHARE_URL);
    expect(page.extraction).toBe(PageExtractionKind.SITE_ADAPTER);
    expect(page.siteAdapter).toBe('chatgpt-share');
    expect(page.content.length).toBeGreaterThan(3_000);
  });
});
