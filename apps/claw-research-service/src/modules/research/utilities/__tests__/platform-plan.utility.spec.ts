import { describe, expect, it } from 'vitest';

import {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
  type ResearchPlatform,
} from '../../../../generated/prisma';
import {
  hostMatchesDomain,
  platformForUrl,
  siteQueryOf,
  urlMatchesPlatform,
} from '../../../platforms/utilities/platform-matching.utility';
import {
  languageFilterOf,
  searchCacheKey,
} from '../../../search/utilities/search-cache-key.utility';
import { ResearchWorkflowKind } from '../../../../common/enums/research-workflow-kind.enum';
import {
  isPlatformRun,
  planPlatformRun,
  servesLanguages,
  splitQueryBudget,
  tagItemByHost,
  wikipediaLanguagesFor,
} from '../platform-plan.utility';
import type { EvidenceItem } from '../../types/evidence-bundle.types';

const row = (slug: string, overrides: Partial<ResearchPlatform> = {}): ResearchPlatform => ({
  id: slug,
  slug,
  name: slug,
  category: PlatformCategory.FORUM,
  accessMethod: PlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: [`${slug}.com`],
  languages: [],
  enabled: true,
  priority: 50,
  maxResults: 5,
  timeoutMs: 8000,
  notes: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

describe('isPlatformRun', () => {
  const dto = {
    intent: 'x y',
    workflow: ResearchWorkflowKind.SEARCH_ONLY,
    platforms: [PlatformCategory.NEWS],
  };
  it('needs depth >= 2 AND at least one category', () => {
    expect(isPlatformRun(dto, 2)).toBe(true);
    expect(isPlatformRun(dto, 5)).toBe(true);
    expect(isPlatformRun(dto, 1)).toBe(false);
    expect(isPlatformRun(dto, null)).toBe(false);
    expect(isPlatformRun({ ...dto, platforms: [] }, 3)).toBe(false);
    expect(isPlatformRun({ ...dto, platforms: undefined }, 3)).toBe(false);
  });
});

describe('splitQueryBudget', () => {
  it.each([
    // cap, expansions wanted, sites wanted → expansions, site
    [3, 3, 4, 1, 2],
    [3, 0, 4, 0, 3],
    [3, 3, 0, 3, 0],
    [5, 2, 4, 2, 3],
    [13, 12, 4, 9, 4],
    [0, 3, 4, 0, 0],
    [1, 0, 2, 0, 1],
  ])(
    'cap %i, %i expansions, %i sites → %i expansions + %i sites',
    (cap, e, s, expansions, site) => {
      expect(splitQueryBudget(cap, e, s)).toEqual({ expansions, site });
      expect(expansions + site).toBeLessThanOrEqual(cap);
    },
  );
});

describe('planPlatformRun', () => {
  const registry = [
    row('wikipedia', {
      category: PlatformCategory.REFERENCE,
      accessMethod: PlatformAccessMethod.OFFICIAL_API,
      apiKind: PlatformApiKind.WIKIPEDIA,
      priority: 5,
    }),
    row('reddit', { priority: 10 }),
    row('lihkg', { priority: 1, languages: ['zh'] }),
    row('quora', { priority: 20 }),
    row('broken-api', { accessMethod: PlatformAccessMethod.OFFICIAL_API, apiKind: null }),
    row('no-domain', { domains: [] }),
    row('off', { enabled: false, priority: 0 }),
    row('bbc', { category: PlatformCategory.NEWS }),
  ];

  it('asked categories only, enabled, usable, language-compatible, priority order', () => {
    const plan = planPlatformRun(
      registry,
      [PlatformCategory.FORUM, PlatformCategory.REFERENCE],
      ['en'],
      false,
    );
    expect(plan.api.map((p) => p.slug)).toEqual(['wikipedia']);
    expect(plan.site.map((p) => p.slug)).toEqual(['reddit', 'quora']);
    expect(plan.all.map((p) => p.slug)).not.toContain('off');
    expect(plan.wikipediaLanguages).toEqual(['en']);
    expect(plan.queryLanguage).toBe('en');
  });

  it('a platform restricted to a language runs only when the run asks for it (or names none)', () => {
    expect(planPlatformRun(registry, [PlatformCategory.FORUM], ['zh'], false).site[0]?.slug).toBe(
      'lihkg',
    );
    expect(planPlatformRun(registry, [PlatformCategory.FORUM], [], false).site[0]?.slug).toBe(
      'lihkg',
    );
    expect(servesLanguages(row('x', { languages: ['zh'] }), ['de'])).toBe(false);
  });

  it('two languages: no single query language; an explicit provider: no API', () => {
    const plan = planPlatformRun(registry, [PlatformCategory.REFERENCE], ['de', 'fr'], true);
    expect(plan.api).toEqual([]);
    expect(plan.queryLanguage).toBeNull();
  });

  it('Wikipedia editions: requested (else en), the row list if any, deduped, max 3', () => {
    expect(wikipediaLanguagesFor(row('w'), [])).toEqual(['en']);
    expect(wikipediaLanguagesFor(row('w'), ['ar', 'ar', 'de', 'fr', 'es'])).toEqual([
      'ar',
      'de',
      'fr',
    ]);
    expect(wikipediaLanguagesFor(row('w', { languages: ['de'] }), ['ar', 'de'])).toEqual(['de']);
  });
});

describe('platform host matching', () => {
  it('suffix match on a label boundary, www ignored', () => {
    expect(hostMatchesDomain('old.reddit.com', 'reddit.com')).toBe(true);
    expect(hostMatchesDomain('reddit.com', 'www.reddit.com')).toBe(true);
    expect(hostMatchesDomain('notreddit.com', 'reddit.com')).toBe(false);
    expect(hostMatchesDomain('reddit.com.evil.example', 'reddit.com')).toBe(false);
    expect(
      urlMatchesPlatform(
        'https://www.youtu.be/x',
        row('yt', { domains: ['youtube.com', 'youtu.be'] }),
      ),
    ).toBe(true);
    expect(urlMatchesPlatform('not a url', row('yt'))).toBe(false);
  });

  it('the first platform in order wins; tags never overwrite an explicit tag', () => {
    const rows = [
      row('gov-uk', { domains: ['gov.uk'], category: PlatformCategory.OFFICIAL }),
      row('nhs', { domains: ['nhs.gov.uk'] }),
    ];
    expect(platformForUrl('https://www.nhs.gov.uk/x', rows)?.slug).toBe('gov-uk');
    const item = { url: 'https://ons.gov.uk/x' } as EvidenceItem;
    tagItemByHost(item, rows);
    expect(item).toMatchObject({ platform: 'gov-uk', platformCategory: PlatformCategory.OFFICIAL });
    const own = { url: 'https://ons.gov.uk/y', platform: 'openalex' } as EvidenceItem;
    tagItemByHost(own, rows);
    expect(own.platform).toBe('openalex');
  });

  it('site query: site:<first domain> <query>, clamped', () => {
    expect(siteQueryOf(row('x', { domains: ['x.com', 'twitter.com'] }), 'eu ai act')).toBe(
      'site:x.com eu ai act',
    );
    expect(siteQueryOf(row('x'), 'q '.repeat(400)).length).toBeLessThanOrEqual(500);
  });
});

describe('search cache key with a language filter (B3)', () => {
  it('no language = exactly the B2 key; a language gets its own key', () => {
    const b2 = searchCacheKey('eu ai act', ['p1'], 10);
    expect(searchCacheKey('eu ai act', ['p1'], 10, null)).toBe(b2);
    expect(searchCacheKey('eu ai act', ['p1'], 10, 'de')).not.toBe(b2);
    expect(languageFilterOf({ language: 'de', researchWorkflow: 'SEARCH_ONLY' })).toBe('de');
    expect(languageFilterOf({ language: 7 })).toBeNull();
    expect(languageFilterOf(undefined)).toBeNull();
  });
});
