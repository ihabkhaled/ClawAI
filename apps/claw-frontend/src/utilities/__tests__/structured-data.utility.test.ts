import { describe, expect, it } from 'vitest';

import { buildPublicPageJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

describe('public page structured data', () => {
  it('describes only visible, verifiable WebPage facts', () => {
    expect(
      buildPublicPageJsonLd({
        name: 'Security controls',
        description: 'Repository-backed security and privacy controls.',
        canonicalUrl: 'https://claw.example/ja/security-and-privacy',
        language: 'ja',
        lastReviewed: '2026-07-27',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Security controls',
      description: 'Repository-backed security and privacy controls.',
      url: 'https://claw.example/ja/security-and-privacy',
      inLanguage: 'ja',
      dateModified: '2026-07-27',
      isPartOf: {
        '@type': 'WebSite',
        name: 'ClawAI',
        url: 'https://claw.example',
      },
    });
  });

  it('escapes script-closing content before inline embedding', () => {
    expect(serializeJsonLd({ name: '</script>' })).toBe('{"name":"\\u003c/script>"}');
  });
});
