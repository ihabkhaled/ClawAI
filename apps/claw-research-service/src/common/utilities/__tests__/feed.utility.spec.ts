import { parseFeedXml } from '../feed.utility';

describe('parseFeedXml', () => {
  it('parses an RSS 2.0 feed', () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <title>Example Blog</title>
          <item>
            <title>First Post</title>
            <link>https://example.com/first-post</link>
            <pubDate>Mon, 01 Sep 2026 00:00:00 GMT</pubDate>
          </item>
          <item>
            <title>Second Post</title>
            <link>https://example.com/second-post</link>
          </item>
        </channel>
      </rss>`;

    const result = parseFeedXml(xml);

    expect(result.kind).toBe('rss');
    if (result.kind !== 'rss') throw new Error('expected rss');
    expect(result.entries).toEqual([
      {
        title: 'First Post',
        url: 'https://example.com/first-post',
        publishedAt: 'Mon, 01 Sep 2026 00:00:00 GMT',
      },
      { title: 'Second Post', url: 'https://example.com/second-post', publishedAt: null },
    ]);
  });

  it('parses an Atom feed', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example Blog</title>
      <entry>
        <title>First Post</title>
        <link rel="alternate" href="https://example.com/first-post"/>
        <updated>2026-09-01T00:00:00Z</updated>
      </entry>
      <entry>
        <title>Second Post</title>
        <link rel="self" href="https://example.com/feed.atom"/>
        <link href="https://example.com/second-post"/>
      </entry>
    </feed>`;

    const result = parseFeedXml(xml);

    expect(result.kind).toBe('atom');
    if (result.kind !== 'atom') throw new Error('expected atom');
    expect(result.entries).toEqual([
      {
        title: 'First Post',
        url: 'https://example.com/first-post',
        publishedAt: '2026-09-01T00:00:00Z',
      },
      { title: 'Second Post', url: 'https://example.com/second-post', publishedAt: null },
    ]);
  });

  it('unwraps CDATA and decodes entities in RSS titles', () => {
    const xml = `<rss version="2.0"><channel>
      <item>
        <title><![CDATA[Cats & Dogs]]></title>
        <link>https://example.com/cats-and-dogs</link>
      </item>
    </channel></rss>`;

    const result = parseFeedXml(xml);

    expect(result.kind).toBe('rss');
    if (result.kind !== 'rss') throw new Error('expected rss');
    expect(result.entries[0]?.title).toBe('Cats & Dogs');
  });

  it('skips an RSS item with no link', () => {
    const xml = `<rss version="2.0"><channel>
      <item><title>No link here</title></item>
      <item><title>Has a link</title><link>https://example.com/real</link></item>
    </channel></rss>`;

    const result = parseFeedXml(xml);

    expect(result.kind).toBe('rss');
    if (result.kind !== 'rss') throw new Error('expected rss');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.url).toBe('https://example.com/real');
  });

  it('returns unrecognized for neither RSS nor Atom', () => {
    expect(parseFeedXml('<html><body>not a feed</body></html>')).toEqual({
      kind: 'unrecognized',
    });
    expect(parseFeedXml('')).toEqual({ kind: 'unrecognized' });
  });

  it('is safe to call repeatedly without state leaking between calls', () => {
    const xml = `<rss version="2.0"><channel>
      <item><title>A</title><link>https://example.com/a</link></item>
      <item><title>B</title><link>https://example.com/b</link></item>
    </channel></rss>`;

    const first = parseFeedXml(xml);
    const second = parseFeedXml(xml);

    expect(first).toEqual(second);
    if (first.kind === 'rss') {
      expect(first.entries).toHaveLength(2);
    }
  });
});
