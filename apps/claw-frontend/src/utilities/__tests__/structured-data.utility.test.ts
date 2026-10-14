import { describe, expect, it } from 'vitest';

import {
  buildComparisonHubJsonLd,
  buildComparisonJsonLd,
  buildThreadArticleJsonLd,
  buildThreadDescription,
  buildPublicBoardJsonLd,
  buildPublicPageJsonLd,
  serializeJsonLd,
} from '@/utilities/structured-data.utility';

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

describe('comparison structured data', () => {
  const base = {
    name: 'ClawAI vs ChatGPT',
    description: 'One polished assistant versus nine model families.',
    canonicalUrl: 'https://claw.example/en/compare/chatgpt',
    language: 'en',
    lastReviewed: '2026-08-27',
  };

  it('connects the page, its trail and its questions in one graph', () => {
    const jsonLd = buildComparisonJsonLd({
      ...base,
      hubUrl: 'https://claw.example/en/compare',
      hubName: 'Compare ClawAI with other AI assistants',
      faq: [{ question: 'Is it a client?', answer: 'No.' }],
    });

    expect(jsonLd['@context']).toBe('https://schema.org');
    const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
    expect(graph).toHaveLength(3);
    expect(graph[1]?.['itemListElement']).toEqual([
      { '@type': 'ListItem', position: 1, name: 'ClawAI', item: 'https://claw.example' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Compare ClawAI with other AI assistants',
        item: 'https://claw.example/en/compare',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'ClawAI vs ChatGPT',
        item: 'https://claw.example/en/compare/chatgpt',
      },
    ]);
    expect(graph[2]?.['mainEntity']).toEqual([
      {
        '@type': 'Question',
        name: 'Is it a client?',
        acceptedAnswer: { '@type': 'Answer', text: 'No.' },
      },
    ]);
  });

  it('claims no rating, review or product comparison', () => {
    // A vendor-authored page that markets itself as a reviewed Product is the
    // fabricated-review case search engines demote. WebPage + FAQPage is the
    // most this page is entitled to claim.
    const serialized = serializeJsonLd(
      buildComparisonJsonLd({
        ...base,
        hubUrl: 'https://claw.example/en/compare',
        hubName: 'Compare',
        faq: [{ question: 'Q', answer: 'A' }],
      }),
    );

    expect(serialized).not.toContain('AggregateRating');
    expect(serialized).not.toContain('"Review"');
    expect(serialized).not.toContain('"Product"');
  });

  it('numbers the hub list in render order', () => {
    const graph = buildComparisonHubJsonLd({
      ...base,
      name: 'Compare',
      items: [
        { name: 'ChatGPT', url: 'https://claw.example/en/compare/chatgpt' },
        { name: 'Claude', url: 'https://claw.example/en/compare/claude' },
      ],
    })['@graph'] as Array<Record<string, unknown>>;

    expect(graph[2]?.['itemListElement']).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'ChatGPT',
        url: 'https://claw.example/en/compare/chatgpt',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Claude',
        url: 'https://claw.example/en/compare/claude',
      },
    ]);
  });
});

describe('thread article structured data', () => {
  it('describes an approved Thread as a plain Article with its real sources', () => {
    const jsonLd = buildThreadArticleJsonLd({
      canonicalUrl: 'https://claw.example/en/threads/a',
      title: 'A',
      description: 'About A',
      publishedAt: '2026-10-06T00:00:00.000Z',
      language: 'en',
      sourceUrls: ['https://example.com/s'],
    });
    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd['citation']).toEqual(['https://example.com/s']);
    expect(JSON.stringify(jsonLd)).not.toMatch(/ScholarlyArticle|peer/iu);
  });

  it('builds a heading-free description capped at 160 characters', () => {
    const text = buildThreadDescription(`# Title

${'word '.repeat(80)}`);
    expect(text.startsWith('word')).toBe(true);
    expect(text).toHaveLength(160);
  });
});

describe('public Threads board structured data', () => {
  const input = {
    name: 'Public Threads board',
    description: 'Browse every public Thread.',
    canonicalUrl: 'https://claw.example/en/threads/board',
    language: 'en',
    lastReviewed: '2026-10-14',
    totalItems: 42,
    items: [
      { name: 'First', url: 'https://claw.example/en/threads/first' },
      { name: 'Second', url: 'https://claw.example/en/threads/second' },
    ],
  };

  it('describes a CollectionPage whose ItemList is the first page of Threads', () => {
    const graph = buildPublicBoardJsonLd(input)['@graph'] as Array<Record<string, unknown>>;

    expect(graph[0]).toEqual(
      expect.objectContaining({
        '@type': 'CollectionPage',
        url: 'https://claw.example/en/threads/board',
        inLanguage: 'en',
      }),
    );
    expect(graph[0]?.['mainEntity']).toEqual({
      '@type': 'ItemList',
      numberOfItems: 42,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'First', url: input.items[0]?.url },
        { '@type': 'ListItem', position: 2, name: 'Second', url: input.items[1]?.url },
      ],
    });
  });

  it('adds a breadcrumb back to the site root', () => {
    const graph = buildPublicBoardJsonLd(input)['@graph'] as Array<Record<string, unknown>>;

    expect(graph[1]).toEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ClawAI', item: 'https://claw.example' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Public Threads board',
          item: 'https://claw.example/en/threads/board',
        },
      ],
    });
  });

  it('emits an empty list for an empty board and never a rating or author field', () => {
    const serialized = serializeJsonLd(
      buildPublicBoardJsonLd({ ...input, items: [], totalItems: 0 }),
    );

    expect(serialized).toContain('"numberOfItems":0');
    expect(serialized).not.toContain('AggregateRating');
    expect(serialized).not.toContain('author');
  });
});
