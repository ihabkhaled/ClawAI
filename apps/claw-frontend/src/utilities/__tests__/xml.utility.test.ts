import { describe, expect, it } from 'vitest';

import { buildRssXml, buildSitemapUrlSetXml, escapeXml } from '../xml.utility';

describe('XML discovery utilities', () => {
  it('escapes every XML metacharacter and removes invalid controls', () => {
    expect(escapeXml(`A&B <tag> "quoted" 'single'\u0001`)).toBe(
      'A&amp;B &lt;tag&gt; &quot;quoted&quot; &apos;single&apos;',
    );
  });

  it('escapes user-controlled chat feed fields', () => {
    const xml = buildRssXml({
      title: 'ClawAI',
      description: 'Updates',
      url: 'https://claw.example/en/feed.xml',
      siteUrl: 'https://claw.example/en',
      language: 'en',
      lastBuildDate: '2026-07-26T10:00:00.000Z',
      items: [
        {
          title: '</title><script>alert(1)</script>',
          description: 'A & B',
          url: 'https://claw.example/en/share/chat/id?a=1&b=2',
          guid: 'chat&id',
          publishedAt: '2026-07-26T10:00:00.000Z',
          category: 'public-chat',
        },
      ],
    });

    expect(xml).not.toContain('<script>');
    expect(xml).toContain('&lt;/title&gt;&lt;script&gt;');
    expect(xml).toContain('A &amp; B');
  });

  it('emits valid localized alternate links in URL sets', () => {
    const xml = buildSitemapUrlSetXml([
      {
        url: 'https://claw.example/en',
        lastModified: '2026-07-26',
        alternates: [{ language: 'ja', url: 'https://claw.example/ja' }],
      },
    ]);

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain('hreflang="ja"');
  });
});
