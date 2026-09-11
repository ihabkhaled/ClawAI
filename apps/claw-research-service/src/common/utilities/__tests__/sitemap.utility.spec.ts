import { parseSitemapXml } from '../sitemap.utility';

describe('parseSitemapXml', () => {
  it('parses a urlset with loc, lastmod, changefreq and priority', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://example.com/</loc>
          <lastmod>2026-09-01</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://example.com/about</loc>
        </url>
      </urlset>`;

    const result = parseSitemapXml(xml);

    expect(result.kind).toBe('urlset');
    if (result.kind !== 'urlset') throw new Error('expected urlset');
    expect(result.entries).toEqual([
      {
        loc: 'https://example.com/',
        lastmod: '2026-09-01',
        changefreq: 'daily',
        priority: 0.8,
        hreflangAlternates: [],
      },
      {
        loc: 'https://example.com/about',
        lastmod: null,
        changefreq: null,
        priority: null,
        hreflangAlternates: [],
      },
    ]);
  });

  it('parses a sitemapindex with nested sitemap references', () => {
    const xml = `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>https://example.com/sitemap-en.xml</loc>
        <lastmod>2026-09-01</lastmod>
      </sitemap>
      <sitemap>
        <loc>https://example.com/sitemap-fr.xml</loc>
      </sitemap>
    </sitemapindex>`;

    const result = parseSitemapXml(xml);

    expect(result.kind).toBe('sitemapindex');
    if (result.kind !== 'sitemapindex') throw new Error('expected sitemapindex');
    expect(result.sitemaps).toEqual([
      { loc: 'https://example.com/sitemap-en.xml', lastmod: '2026-09-01' },
      { loc: 'https://example.com/sitemap-fr.xml', lastmod: null },
    ]);
  });

  it('collects hreflang alternates from xhtml:link tags inside a url entry', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
      <url>
        <loc>https://example.com/en/</loc>
        <xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/"/>
        <xhtml:link rel="alternate" hreflang="fr" href="https://example.com/fr/"/>
        <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/"/>
      </url>
    </urlset>`;

    const result = parseSitemapXml(xml);

    expect(result.kind).toBe('urlset');
    if (result.kind !== 'urlset') throw new Error('expected urlset');
    expect(result.entries[0]?.hreflangAlternates).toEqual([
      { lang: 'en', url: 'https://example.com/en/' },
      { lang: 'fr', url: 'https://example.com/fr/' },
      { lang: 'x-default', url: 'https://example.com/' },
    ]);
  });

  it('unwraps CDATA and decodes entities inside <loc>', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc><![CDATA[https://example.com/search?q=cats&amp;lang=en]]></loc></url>
    </urlset>`;

    const result = parseSitemapXml(xml);

    expect(result.kind).toBe('urlset');
    if (result.kind !== 'urlset') throw new Error('expected urlset');
    expect(result.entries[0]?.loc).toBe('https://example.com/search?q=cats&lang=en');
  });

  it('skips a url entry with no loc rather than throwing', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><changefreq>daily</changefreq></url>
      <url><loc>https://example.com/real</loc></url>
    </urlset>`;

    const result = parseSitemapXml(xml);

    expect(result.kind).toBe('urlset');
    if (result.kind !== 'urlset') throw new Error('expected urlset');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.loc).toBe('https://example.com/real');
  });

  it('returns unrecognized for text that is neither a urlset nor a sitemapindex', () => {
    expect(parseSitemapXml('<html><body>not a sitemap</body></html>')).toEqual({
      kind: 'unrecognized',
    });
    expect(parseSitemapXml('')).toEqual({ kind: 'unrecognized' });
  });

  it('is safe to call repeatedly without state leaking between calls', () => {
    // The internal /g regexes are cloned per call specifically to guard
    // against this — a shared module-level regex's lastIndex carrying over
    // would make the SECOND call silently return fewer entries than the
    // first.
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/a</loc></url>
      <url><loc>https://example.com/b</loc></url>
    </urlset>`;

    const first = parseSitemapXml(xml);
    const second = parseSitemapXml(xml);

    expect(first).toEqual(second);
    if (first.kind === 'urlset') {
      expect(first.entries).toHaveLength(2);
    }
  });
});
