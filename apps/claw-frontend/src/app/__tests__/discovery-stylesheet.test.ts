import { describe, expect, it } from 'vitest';

import { DISCOVERY_STYLESHEET_XSL } from '@/constants/discovery-stylesheet.constants';
import { XSL_CONTENT_TYPE } from '@/constants/seo-discovery.constants';
import { buildRssXml, buildSitemapIndexXml, buildSitemapUrlSetXml } from '@/utilities/xml.utility';

import { GET } from '../discovery.xsl/route';

// Chrome 151 dropped the built-in XML pretty-printer, so a sitemap opened in a
// browser rendered as one run-together wall of text — valid XML that looks like
// a corrupt file. Author XSLT still runs, so the documents carry a stylesheet.
describe('discovery stylesheet', () => {
  it('is stated as an XSL type, because nosniff makes a wrong one fatal', () => {
    const response = GET();

    expect(response.headers.get('Content-Type')).toBe(XSL_CONTENT_TYPE);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('parses as XML, or the browser silently falls back to the unreadable view', () => {
    const parsed = new DOMParser().parseFromString(DISCOVERY_STYLESHEET_XSL, 'application/xml');

    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.documentElement.localName).toBe('stylesheet');
  });

  it('renders all three discovery document shapes', () => {
    // A stylesheet that only knows sitemaps would leave the feed as soup.
    for (const match of ['sm:sitemapindex', 'sm:urlset', 'rss']) {
      expect(DISCOVERY_STYLESHEET_XSL).toContain(`match="${match}"`);
    }
  });

  it('is referenced by every discovery document', () => {
    const documents = [
      buildSitemapIndexXml(['https://claw.example/sitemaps/en/pages-1.xml']),
      buildSitemapUrlSetXml([{ url: 'https://claw.example/en', lastModified: '2026-07-27' }]),
      buildRssXml({
        title: 'ClawAI',
        description: 'feed',
        url: 'https://claw.example/rss.xml',
        siteUrl: 'https://claw.example',
        language: 'en',
        lastBuildDate: '2026-07-27',
        items: [],
      }),
    ];

    for (const document of documents) {
      expect(document.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(document).toContain('<?xml-stylesheet type="text/xsl" href="/discovery.xsl"?>');
    }
  });

  it('leaves the data untouched — the instruction is presentation only', () => {
    const xml = buildSitemapUrlSetXml([
      { url: 'https://claw.example/en', lastModified: '2026-07-27' },
    ]);
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');

    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.getElementsByTagName('url')).toHaveLength(1);
    expect(parsed.getElementsByTagName('loc')[0]?.textContent).toBe('https://claw.example/en');
  });
});
