import { describe, expect, it } from 'vitest';

import { NarrationKind } from '../../../../common/enums/narration-kind.enum';
import { NARRATION_MAX_PAGE_READ_LINES } from '../../constants/narration.constants';
import type { ResearchEvidenceItem } from '../../types/research.types';
import { fetchStrategiesOf, pageReadNarrations } from '../research-orchestration.utility';

const item = (url: string, fetch?: ResearchEvidenceItem['fetch']): ResearchEvidenceItem => ({
  id: url,
  title: null,
  url,
  snippet: 's',
  source: 'fetch',
  providerKind: null,
  publishedAt: null,
  fetchedAt: null,
  confidence: 0.9,
  ...(fetch === undefined ? {} : { fetch }),
});

const escalated = {
  strategy: 'CRAWL4AI',
  attempts: [
    { kind: 'HTTP_PLAIN', outcome: 'BLOCKED' },
    { kind: 'CRAWL4AI', outcome: 'SUCCESS' },
  ],
};

describe('pageReadNarrations', () => {
  it('narrates a page an escalated tier served: host, strategy and what was blocked first', () => {
    const lines = pageReadNarrations([item('https://shop.example.com/a?token=secret', escalated)]);
    expect(lines).toEqual([
      {
        kind: NarrationKind.PAGE_READ,
        params: { host: 'shop.example.com', strategy: 'CRAWL4AI', blocked: 'HTTP_PLAIN' },
      },
    ]);
    expect(JSON.stringify(lines)).not.toContain('secret');
  });

  it('says nothing for a plain GET that worked, a search hit, or a cache hit', () => {
    const lines = pageReadNarrations([
      item('https://a.example.com/', { strategy: 'HTTP_PLAIN', attempts: [] }),
      item('https://b.example.com/'),
    ]);
    expect(lines).toEqual([]);
  });

  it('leaves blocked empty when the first attempt succeeded on an escalated tier', () => {
    const lines = pageReadNarrations([
      item('https://a.example.com/', {
        strategy: 'OFFICIAL_API',
        attempts: [{ kind: 'OFFICIAL_API', outcome: 'SUCCESS' }],
      }),
    ]);
    expect(lines[0]?.params?.['blocked']).toBe('');
  });

  it('caps the lines so a big crawl cannot bury the log', () => {
    const many = Array.from({ length: 40 }, (_, index) =>
      item(`https://example.com/${String(index)}`, escalated),
    );
    expect(pageReadNarrations(many)).toHaveLength(NARRATION_MAX_PAGE_READ_LINES);
  });

  it('ignores malformed stored provenance instead of throwing', () => {
    const bad = { ...item('https://a.example.com/'), fetch: { strategy: 7, attempts: 'x' } };
    expect(pageReadNarrations([bad as unknown as ResearchEvidenceItem])).toEqual([]);
  });
});

describe('fetchStrategiesOf', () => {
  it('lists distinct strategies in first-seen order, reading untyped JSON', () => {
    expect(
      fetchStrategiesOf([
        { fetch: { strategy: 'HTTP_PLAIN', attempts: [] } },
        { fetch: { strategy: 'FIRECRAWL', attempts: [] } },
        { fetch: { strategy: 'HTTP_PLAIN', attempts: [] } },
        { url: 'no provenance' },
        null,
        'junk',
      ]),
    ).toEqual(['HTTP_PLAIN', 'FIRECRAWL']);
  });
});
