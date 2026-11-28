import { describe, expect, it } from 'vitest';

import {
  RESEARCH_PLATFORM_DISPLAY_NAMES,
  INITIAL_RESEARCH_PLATFORM_FORM,
} from '@/constants/research-platform.constants';
import { Locale } from '@/enums/locale.enum';
import { ResearchPlatformAccessMethod } from '@/enums/research-platform-access-method.enum';
import { ResearchPlatformApiKind } from '@/enums/research-platform-api-kind.enum';
import { ResearchPlatformCategory } from '@/enums/research-platform-category.enum';
import { ResearchPlatformTestOutcome } from '@/enums/research-platform-test-outcome.enum';
import { getTranslation } from '@/lib/i18n/translations';
import { ApiClientError } from '@/services/shared/api-client';
import type { ResearchPlatform, ResearchPlatformFormState } from '@/types/research-platform.types';
import {
  isResearchPlatformDomain,
  isResearchPlatformLanguage,
} from '@/utilities/research-platform-validation.utility';
import {
  buildResearchPlatformRequest,
  describeResearchPlatformTest,
  groupResearchPlatforms,
  parseResearchPlatformCategoryFilter,
  parseResearchPlatformList,
  researchPlatformSaveErrorKey,
  researchPlatformToForm,
  researchPlatformValidationErrorKey,
  toResearchPlatformUpdate,
} from '@/utilities/research-platform.utility';

const form = (overrides: Partial<ResearchPlatformFormState>): ResearchPlatformFormState => ({
  ...INITIAL_RESEARCH_PLATFORM_FORM,
  slug: 'reddit',
  name: 'Reddit',
  domains: 'reddit.com',
  ...overrides,
});

const platform = (overrides: Partial<ResearchPlatform>): ResearchPlatform => ({
  id: 'p',
  slug: 'p',
  name: 'P',
  category: ResearchPlatformCategory.NEWS,
  accessMethod: ResearchPlatformAccessMethod.SITE_SEARCH,
  apiKind: null,
  domains: ['p.com'],
  languages: [],
  enabled: true,
  priority: 100,
  maxResults: 5,
  timeoutMs: 8000,
  notes: null,
  ...overrides,
});

describe('parseResearchPlatformList', () => {
  it('splits on commas, spaces and new lines and drops blanks and repeats', () => {
    expect(parseResearchPlatformList(' Reddit.com,reddit.com\n old.reddit.com ', true)).toEqual([
      'reddit.com',
      'old.reddit.com',
    ]);
    expect(parseResearchPlatformList('en, pt-BR', false)).toEqual(['en', 'pt-BR']);
    expect(parseResearchPlatformList('   ', false)).toEqual([]);
  });
});

describe('buildResearchPlatformRequest and validation', () => {
  it('builds a valid site-search body with the defaults', () => {
    const request = buildResearchPlatformRequest(form({}));
    expect(request).toEqual({
      slug: 'reddit',
      name: 'Reddit',
      category: ResearchPlatformCategory.NEWS,
      accessMethod: ResearchPlatformAccessMethod.SITE_SEARCH,
      apiKind: null,
      domains: ['reddit.com'],
      languages: [],
      priority: 100,
      maxResults: 5,
      timeoutMs: 8000,
      notes: null,
    });
    expect(researchPlatformValidationErrorKey(request)).toBeNull();
  });

  it('drops a leftover API kind from a site-search platform', () => {
    const request = buildResearchPlatformRequest(form({ apiKind: ResearchPlatformApiKind.ARXIV }));
    expect(request.apiKind).toBeNull();
  });

  it('needs an API kind for an official API, but no domain', () => {
    const missing = buildResearchPlatformRequest(
      form({ accessMethod: ResearchPlatformAccessMethod.OFFICIAL_API, domains: '' }),
    );
    expect(researchPlatformValidationErrorKey(missing)).toBe('researchPlatforms.errors.apiKind');
    const ok = buildResearchPlatformRequest(
      form({
        accessMethod: ResearchPlatformAccessMethod.OFFICIAL_API,
        apiKind: ResearchPlatformApiKind.WIKIPEDIA,
        domains: '',
      }),
    );
    expect(researchPlatformValidationErrorKey(ok)).toBeNull();
  });

  it('names the first field that is wrong', () => {
    const check = (overrides: Partial<ResearchPlatformFormState>): string | null =>
      researchPlatformValidationErrorKey(buildResearchPlatformRequest(form(overrides)));
    expect(check({ slug: 'A' })).toBe('researchPlatforms.errors.slug');
    expect(check({ name: '   ' })).toBe('researchPlatforms.errors.name');
    expect(check({ domains: '' })).toBe('researchPlatforms.errors.domains');
    expect(check({ domains: 'not a domain' })).toBe('researchPlatforms.errors.domains');
    expect(check({ languages: 'english!' })).toBe('researchPlatforms.errors.languages');
    expect(check({ priority: '' })).toBe('researchPlatforms.errors.number');
    expect(check({ maxResults: '0' })).toBe('researchPlatforms.errors.number');
    expect(check({ timeoutMs: '1.5' })).toBe('researchPlatforms.errors.number');
  });

  it('round-trips a stored platform through the form, and edits never carry the slug', () => {
    const stored = platform({ languages: ['en', 'es'], domains: ['a.com', 'b.org'], notes: 'n' });
    const request = buildResearchPlatformRequest(researchPlatformToForm(stored));
    expect(request).toMatchObject({
      domains: ['a.com', 'b.org'],
      languages: ['en', 'es'],
      notes: 'n',
    });
    expect(toResearchPlatformUpdate(request)).not.toHaveProperty('slug');
  });
});

describe('isResearchPlatformDomain', () => {
  it('accepts hosts with two or more labels, with an optional path', () => {
    expect(isResearchPlatformDomain('reddit.com')).toBe(true);
    expect(isResearchPlatformDomain('gov.uk')).toBe(true);
    expect(isResearchPlatformDomain('github.com/topics')).toBe(false);
    expect(isResearchPlatformDomain('-bad.com')).toBe(false);
    expect(isResearchPlatformDomain('example.c0m')).toBe(false);
    expect(isResearchPlatformDomain('localhost')).toBe(false);
    expect(isResearchPlatformDomain('bad..com')).toBe(false);
    expect(isResearchPlatformDomain('Upper.com')).toBe(false);
  });
});

describe('isResearchPlatformLanguage', () => {
  it('accepts a primary tag with at most one subtag', () => {
    expect(isResearchPlatformLanguage('en')).toBe(true);
    expect(isResearchPlatformLanguage('pt-BR')).toBe(false);
    expect(isResearchPlatformLanguage('zh-Hans')).toBe(false);
    expect(isResearchPlatformLanguage('fil')).toBe(true);
    expect(isResearchPlatformLanguage('e')).toBe(false);
    expect(isResearchPlatformLanguage('english')).toBe(false);
    expect(isResearchPlatformLanguage('en-')).toBe(false);
    expect(isResearchPlatformLanguage('zh-Hans-CN')).toBe(false);
  });
});

describe('researchPlatformSaveErrorKey', () => {
  it('maps a taken slug, refused values and anything else, never the server text', () => {
    expect(researchPlatformSaveErrorKey(new ApiClientError({ message: 'x', status: 409 }))).toBe(
      'researchPlatforms.errors.slugTaken',
    );
    expect(researchPlatformSaveErrorKey(new ApiClientError({ message: 'x', status: 400 }))).toBe(
      'researchPlatforms.errors.invalid',
    );
    expect(researchPlatformSaveErrorKey(new ApiClientError({ message: 'x', status: 500 }))).toBe(
      'researchPlatforms.errors.saveFailed',
    );
    expect(researchPlatformSaveErrorKey(new Error('x'))).toBe(
      'researchPlatforms.errors.saveFailed',
    );
  });
});

describe('groupResearchPlatforms', () => {
  const list = [
    platform({ id: 'b', name: 'B', category: ResearchPlatformCategory.FORUM, priority: 5 }),
    platform({ id: 'a', name: 'A', category: ResearchPlatformCategory.FORUM, priority: 5 }),
    platform({ id: 'c', name: 'C', category: ResearchPlatformCategory.FORUM, priority: 1 }),
    platform({ id: 'n', name: 'N', category: ResearchPlatformCategory.NEWS }),
  ];

  it('orders groups by category and rows by priority then name, leaving empty groups out', () => {
    const groups = groupResearchPlatforms(list, null);
    expect(groups.map((g) => g.category)).toEqual([
      ResearchPlatformCategory.NEWS,
      ResearchPlatformCategory.FORUM,
    ]);
    expect(groups[1]?.platforms.map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('keeps one category when filtered', () => {
    expect(
      groupResearchPlatforms(list, ResearchPlatformCategory.NEWS).map((g) => g.category),
    ).toEqual([ResearchPlatformCategory.NEWS]);
    expect(groupResearchPlatforms(list, ResearchPlatformCategory.VIDEO)).toEqual([]);
  });

  it('reads the filter value', () => {
    expect(parseResearchPlatformCategoryFilter('ACADEMIC')).toBe(ResearchPlatformCategory.ACADEMIC);
    expect(parseResearchPlatformCategoryFilter('ALL')).toBeNull();
    expect(parseResearchPlatformCategoryFilter('nope')).toBeNull();
  });
});

describe('describeResearchPlatformTest', () => {
  const t = (key: string, params?: Record<string, string | number>): string =>
    getTranslation(Locale.EN, key, params);
  const ru = (key: string, params?: Record<string, string | number>): string =>
    getTranslation(Locale.RU, key, params);

  it('describes a pass, a failure with and without a code, and a request that never ran', () => {
    const result = { ok: true, resultCount: 3, latencyMs: 120.6 };
    expect(
      describeResearchPlatformTest(
        { outcome: ResearchPlatformTestOutcome.PASSED, result },
        t,
        'en',
      ),
    ).toEqual({ outcome: ResearchPlatformTestOutcome.PASSED, label: 'Works: 3 results in 121 ms' });
    expect(
      describeResearchPlatformTest(
        { outcome: ResearchPlatformTestOutcome.FAILED, result: { ...result, ok: false } },
        t,
        'en',
      ).label,
    ).toBe('Failed after 121 ms');
    expect(
      describeResearchPlatformTest(
        {
          outcome: ResearchPlatformTestOutcome.FAILED,
          result: { ...result, ok: false, errorCode: 'BLOCKED' },
        },
        t,
        'en',
      ).label,
    ).toBe('Failed (BLOCKED) after 121 ms');
    expect(
      describeResearchPlatformTest(
        { outcome: ResearchPlatformTestOutcome.REQUEST_FAILED, result: null },
        t,
        'en',
      ).label,
    ).toBe('The test could not run.');
  });

  it('picks the plural form of the reader language', () => {
    const view = describeResearchPlatformTest(
      {
        outcome: ResearchPlatformTestOutcome.PASSED,
        result: { ok: true, resultCount: 5, latencyMs: 1 },
      },
      ru,
      'ru',
    );
    expect(view.label).toBe('Работает: 5 результатов за 1 мс');
  });
});

/** Every slug research-service seeds (`platform-seed.constants.ts`): each must have its brand name here. */
const SEEDED_PLATFORM_SLUGS = [
  'openalex',
  'semantic-scholar',
  'arxiv',
  'pubmed',
  'crossref',
  'stack-overflow',
  'github',
  'hacker-news',
  'wikipedia',
  'nature',
  'sciencedirect',
  'mdn',
  'dev-to',
  'npm',
  'pypi',
  'reddit',
  'quora',
  'x-twitter',
  'linkedin',
  'medium',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'reuters',
  'ap-news',
  'bbc',
  'the-guardian',
  'al-jazeera',
  'bloomberg',
  'who',
  'cdc',
  'gov-uk',
  'europa-eu',
  'amazon',
  'product-hunt',
];

describe('researchPlatformDisplayName for seeded platforms', () => {
  it('has a brand name for every seeded slug, never a title-cased guess', () => {
    const missing = SEEDED_PLATFORM_SLUGS.filter(
      (slug) => RESEARCH_PLATFORM_DISPLAY_NAMES[slug] === undefined,
    );
    expect(missing).toEqual([]);
  });
});
