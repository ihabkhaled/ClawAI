import { describe, expect, it } from 'vitest';

import {
  buildThreadHtmlDocument,
  buildThreadJsonDocument,
  buildThreadMarkdownDocument,
  buildThreadTextDocument,
  markdownToHtml,
  markdownToPlainText,
  withoutLeadingTitle,
} from '@/utilities/thread-document-export.utility';
import { buildThreadShareLinks } from '@/utilities/thread-share-links.utility';
import { createZipBytes, crc32 } from '@/utilities/zip-store.utility';

const SOURCE = {
  title: 'Vector <databases> & "search"',
  markdown:
    '## Why\n\nA **vector** store finds *similar* text with `cosine`.\n\n- one\n- two\n\n1. first\n\n> quoted\n\n[docs](https://example.org/a?b=1&c=2)',
  citations: [{ url: 'https://example.org/source' }, { url: 'javascript:alert(1)' }],
  url: 'https://claw.local/en/threads/vector',
  language: 'en',
};

describe('markdownToHtml', () => {
  it('renders the Markdown a Thread uses', () => {
    const html = markdownToHtml(SOURCE.markdown);
    expect(html).toContain('<h2>Why</h2>');
    expect(html).toContain('<strong>vector</strong>');
    expect(html).toContain('<em>similar</em>');
    expect(html).toContain('<code>cosine</code>');
    expect(html).toContain('<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
    expect(html).toContain('<ol>\n<li>first</li>\n</ol>');
    expect(html).toContain('<blockquote>quoted</blockquote>');
    expect(html).toContain(
      '<a href="https://example.org/a?b=1&amp;c=2" rel="noopener noreferrer">docs</a>',
    );
  });

  it('cannot be made to emit a script, an event handler or a javascript link', () => {
    const html = markdownToHtml(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))\n\n```\n<b>raw</b>\n```',
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<pre><code>&lt;b&gt;raw&lt;/b&gt;</code></pre>');
  });
});

describe('document builders', () => {
  it('builds plain text without markup, with sources and the address', () => {
    const text = buildThreadTextDocument(SOURCE, 'Sources');
    expect(text.startsWith('Vector <databases> & "search"\n')).toBe(true);
    expect(text).toContain('Why');
    expect(text).not.toContain('**');
    expect(text).toContain('docs (https://example.org/a?b=1&c=2)');
    expect(text).toContain('Sources\n1. https://example.org/source');
    expect(text.trimEnd().endsWith('https://claw.local/en/threads/vector')).toBe(true);
    expect(markdownToPlainText('# H\n\n```js\ncode\n```')).toBe('H\n\ncode');
  });

  it('builds Markdown with a title and numbered sources', () => {
    const markdown = buildThreadMarkdownDocument(SOURCE, 'Sources');
    expect(markdown.startsWith('# Vector <databases> & "search"\n')).toBe(true);
    expect(markdown).toContain('## Sources\n1. https://example.org/source');
  });

  it('builds JSON that parses back to the article', () => {
    const parsed = JSON.parse(buildThreadJsonDocument(SOURCE)) as Record<string, unknown>;
    expect(parsed['title']).toBe(SOURCE.title);
    expect(parsed['url']).toBe(SOURCE.url);
    expect(parsed['citations']).toEqual(SOURCE.citations);
  });

  it('builds a self-contained, escaped HTML page that drops unsafe source links', () => {
    const html = buildThreadHtmlDocument(SOURCE, 'Sources');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>Vector &lt;databases&gt; &amp; &quot;search&quot;</title>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('https://example.org/source');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/<link|<img|src=/u);
  });

  it('leaves out the sources block and the address when there are none', () => {
    const html = buildThreadHtmlDocument({ ...SOURCE, citations: [], url: null }, 'Sources');
    expect(html).not.toContain('Sources');
    expect(
      buildThreadTextDocument({ ...SOURCE, citations: [], url: null }, 'Sources'),
    ).not.toContain('Sources');
  });
});

describe('a draft that starts with its own title', () => {
  const titled = { ...SOURCE, markdown: '# Vector <databases> & "search"\n\nBody text.' };

  it('prints the title once in Markdown, text and HTML', () => {
    const markdown = buildThreadMarkdownDocument(titled, 'Sources');
    expect(markdown.match(/^# /gmu)).toHaveLength(1);
    expect(markdown).toContain('Body text.');
    const text = buildThreadTextDocument(titled, 'Sources');
    expect(text.split('Vector <databases>')).toHaveLength(2);
    expect(buildThreadHtmlDocument(titled, 'Sources').match(/<h1>/gu)).toHaveLength(1);
  });

  it('keeps a draft whose first heading is not a title', () => {
    expect(withoutLeadingTitle('## Why\n\nText')).toBe('## Why\n\nText');
    expect(withoutLeadingTitle('\n# Title\nText')).toBe('Text');
  });
});

describe('share links', () => {
  it('encodes the address and title into each network link', () => {
    const links = buildThreadShareLinks('https://claw.local/en/threads/a b', 'A & B');
    const byId = Object.fromEntries(links.map((link) => [link.id, link.href]));
    expect(Object.keys(byId)).toEqual([
      'whatsapp',
      'facebook',
      'linkedin',
      'x',
      'telegram',
      'reddit',
      'email',
    ]);
    expect(byId['whatsapp']).toBe(
      `https://wa.me/?text=${encodeURIComponent('A & B https://claw.local/en/threads/a b')}`,
    );
    expect(byId['facebook']).toContain(encodeURIComponent('https://claw.local/en/threads/a b'));
    expect(byId['linkedin']).toContain('share-offsite');
    expect(byId['x']).toContain('text=A%20%26%20B');
    expect(byId['email']?.startsWith('mailto:?subject=')).toBe(true);
    for (const link of links) {
      expect(link.href).not.toMatch(/\s/u);
    }
  });
});

describe('zip store', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes a readable archive with local headers, a central directory and the end record', () => {
    const encoder = new TextEncoder();
    const bytes = createZipBytes(
      [
        { name: 'a.md', data: encoder.encode('hello') },
        { name: 'مقال.txt', data: encoder.encode('world!') },
      ],
      new Date(2026, 9, 7, 12, 0, 0),
    );
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const endOffset = bytes.length - 22;
    expect(view.getUint32(endOffset, true)).toBe(0x06054b50);
    expect(view.getUint16(endOffset + 10, true)).toBe(2);
    const centralOffset = view.getUint32(endOffset + 16, true);
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    expect(view.getUint32(14, true)).toBe(crc32(encoder.encode('hello')));
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
    expect(new TextDecoder().decode(bytes.slice(30, 34))).toBe('a.md');
    expect(new TextDecoder().decode(bytes.slice(34, 39))).toBe('hello');
  });
});
