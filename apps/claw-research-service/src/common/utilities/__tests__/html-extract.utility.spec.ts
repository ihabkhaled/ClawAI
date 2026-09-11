import { extractHtml } from '../html-extract.utility';

/**
 * The pre-existing extractor only produced title/text/links. Section 13 of
 * the web-intelligence spec needs canonical, hreflang, meta robots, OG,
 * Twitter card and JSON-LD to inspect a fetched page for SEO/audit-style
 * questions — none of it renders JS, so this reads only what a plain fetch
 * actually returns, not what a browser would inject client-side.
 */
describe('extractHtml', () => {
  it('still extracts title, text and links as before', () => {
    const html = `
      <html><head><title>Example Page</title></head>
      <body><p>Hello <a href="https://example.com/a">world</a></p></body></html>
    `;
    const result = extractHtml(html, 'https://example.com/');

    expect(result.title).toBe('Example Page');
    expect(result.text).toContain('Hello');
    expect(result.links).toEqual(['https://example.com/a']);
  });

  it('extracts meta description regardless of attribute order', () => {
    const nameFirst = extractHtml('<meta name="description" content="A page about cats">');
    const contentFirst = extractHtml('<meta content="A page about dogs" name="description">');

    expect(nameFirst.metadata.description).toBe('A page about cats');
    expect(contentFirst.metadata.description).toBe('A page about dogs');
  });

  it('extracts the meta robots directive', () => {
    const result = extractHtml('<meta name="robots" content="noindex, nofollow">');
    expect(result.metadata.robotsDirective).toBe('noindex, nofollow');
  });

  it('extracts and resolves a relative canonical URL against the base', () => {
    const result = extractHtml(
      '<link rel="canonical" href="/en/features">',
      'https://example.com/features?ref=x',
    );
    expect(result.metadata.canonicalUrl).toBe('https://example.com/en/features');
  });

  it('keeps an absolute canonical URL as-is', () => {
    const result = extractHtml('<link rel="canonical" href="https://example.com/en/features">');
    expect(result.metadata.canonicalUrl).toBe('https://example.com/en/features');
  });

  it('collects every hreflang alternate with its language', () => {
    const html = `
      <link rel="alternate" hreflang="en" href="https://example.com/en/">
      <link rel="alternate" hreflang="fr" href="https://example.com/fr/">
      <link rel="alternate" hreflang="x-default" href="https://example.com/">
    `;
    const result = extractHtml(html);

    expect(result.metadata.hreflangAlternates).toEqual([
      { lang: 'en', url: 'https://example.com/en/' },
      { lang: 'fr', url: 'https://example.com/fr/' },
      { lang: 'x-default', url: 'https://example.com/' },
    ]);
  });

  it('does not record an alternate link with no hreflang attribute', () => {
    // rel="alternate" is also used for RSS/JSON feed autodiscovery, which has
    // no hreflang — that is a different signal, not a broken language tag.
    const result = extractHtml(
      '<link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml">',
    );
    expect(result.metadata.hreflangAlternates).toEqual([]);
  });

  it('extracts Open Graph properties, stripping the og: prefix', () => {
    const html = `
      <meta property="og:title" content="ClawAI">
      <meta property="og:description" content="One subscription, every model">
      <meta property="og:image" content="https://example.com/preview.png">
    `;
    const result = extractHtml(html);

    expect(result.metadata.openGraph).toEqual({
      title: 'ClawAI',
      description: 'One subscription, every model',
      image: 'https://example.com/preview.png',
    });
  });

  it('extracts Twitter card properties, stripping the twitter: prefix', () => {
    const html = `
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="ClawAI">
    `;
    const result = extractHtml(html);

    expect(result.metadata.twitterCard).toEqual({
      card: 'summary_large_image',
      title: 'ClawAI',
    });
  });

  it('parses a JSON-LD block', () => {
    const html = `
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Organization","name":"ClawAI"}
      </script>
    `;
    const result = extractHtml(html);

    expect(result.metadata.jsonLd).toEqual([
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'ClawAI' },
    ]);
  });

  it('collects multiple JSON-LD blocks and skips a malformed one', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Organization"}</script>
      <script type="application/ld+json">{ this is not valid json }</script>
      <script type="application/ld+json">{"@type":"WebSite"}</script>
    `;
    const result = extractHtml(html);

    expect(result.metadata.jsonLd).toEqual([{ '@type': 'Organization' }, { '@type': 'WebSite' }]);
  });

  it('returns empty metadata for a page with no head tags at all', () => {
    const result = extractHtml('<html><body><p>Plain text only.</p></body></html>');

    expect(result.metadata).toEqual({
      description: null,
      robotsDirective: null,
      canonicalUrl: null,
      hreflangAlternates: [],
      openGraph: {},
      twitterCard: {},
      jsonLd: [],
      feedUrls: [],
    });
  });

  it('discovers RSS and Atom feed autodiscovery links', () => {
    const html = `
      <link rel="alternate" type="application/rss+xml" href="/feed.xml">
      <link rel="alternate" type="application/atom+xml" href="https://example.com/atom.xml">
      <link rel="stylesheet" type="text/css" href="/styles.css">
    `;
    const result = extractHtml(html, 'https://example.com/blog/');

    expect(result.metadata.feedUrls).toEqual([
      'https://example.com/feed.xml',
      'https://example.com/atom.xml',
    ]);
  });

  it('does not confuse a feed link with an hreflang alternate', () => {
    const html = `
      <link rel="alternate" hreflang="fr" href="https://example.com/fr/">
      <link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml">
    `;
    const result = extractHtml(html);

    expect(result.metadata.hreflangAlternates).toEqual([
      { lang: 'fr', url: 'https://example.com/fr/' },
    ]);
    expect(result.metadata.feedUrls).toEqual(['https://example.com/feed.xml']);
  });

  it('keeps the FIRST description and canonical when a page has duplicates', () => {
    const html = `
      <meta name="description" content="first">
      <meta name="description" content="second">
      <link rel="canonical" href="https://example.com/first">
      <link rel="canonical" href="https://example.com/second">
    `;
    const result = extractHtml(html);

    expect(result.metadata.description).toBe('first');
    expect(result.metadata.canonicalUrl).toBe('https://example.com/first');
  });
});
