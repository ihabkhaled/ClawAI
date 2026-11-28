import { describe, expect, it } from 'vitest';

import {
  GOOGLE_MAX_PAGES_CONFIG_KEY,
  GOOGLE_MAX_QUERIES_CONFIG_KEY,
  NO_GOOGLE_ROUTE,
  RESEARCH_GOOGLE_BUDGETS,
} from '../../../../common/constants/research-engine.constants';
import { SearchProviderKind } from '../../../../common/enums/search-provider-kind.enum';
import { SearchProviderRunStatus } from '../../../../common/enums/search-provider-run-status.enum';
import {
  dominantScriptOf,
  googleCountsOf,
  googlePageStarts,
  pickGoogleExpansions,
  planGoogleRun,
  resolveGoogleBudget,
} from '../google-budget.utility';
import type { SearchExecutionResult } from '../../../search/types/search-execution-result.types';

const queriesKey = GOOGLE_MAX_QUERIES_CONFIG_KEY;
const pagesKey = GOOGLE_MAX_PAGES_CONFIG_KEY;

// Arabic, Chinese and Japanese test queries (no Latin letters, so the script differs from English).
const ARABIC_AI_ACT = 'قانون الذكاء';
const ARABIC_MIXED = 'ما هي غرامات EU AI Act';
const ARABIC_WORD = 'قانون';
const ARABIC_FINES_LAW = 'غرامات القانون';
const ARABIC_OTHER_LAW = 'قانون آخر';
const JAPANESE_ECONOMY = '日本の経済';
const CHINESE_ECONOMY = '中国经济';
const CHINESE_TRADITIONAL = '中國經濟';
const CHINESE_AI_ACT = '欧盟人工智能法案';

describe('the Google budget table (ADR-228)', () => {
  it('is [1,1,2,3,4,6] Google queries and [1,1,1,2,3,5] primary pages for depth 0-5', () => {
    expect(RESEARCH_GOOGLE_BUDGETS.map((row) => row.queries)).toEqual([1, 1, 2, 3, 4, 6]);
    expect(RESEARCH_GOOGLE_BUDGETS.map((row) => row.primaryPages)).toEqual([1, 1, 1, 2, 3, 5]);
  });

  it.each([0, 1, 2, 3, 4, 5])('depth %i without an override is its table row', (depth) => {
    expect(resolveGoogleBudget(depth, {})).toEqual(RESEARCH_GOOGLE_BUDGETS[depth]);
  });

  it('an absent depth is depth 0; so is anything outside the table', () => {
    expect(resolveGoogleBudget(null, {})).toEqual({ queries: 1, primaryPages: 1 });
    expect(resolveGoogleBudget(9, {})).toEqual({ queries: 1, primaryPages: 1 });
    expect(resolveGoogleBudget(-1, {})).toEqual({ queries: 1, primaryPages: 1 });
  });
});

describe('the SERPAPI publicConfig override', () => {
  it('from depth 3 a valid value REPLACES the default, up or down', () => {
    expect(resolveGoogleBudget(3, { [queriesKey]: 10, [pagesKey]: 8 })).toEqual({
      queries: 10,
      primaryPages: 8,
    });
    expect(resolveGoogleBudget(5, { [queriesKey]: 2, [pagesKey]: 1 })).toEqual({
      queries: 2,
      primaryPages: 1,
    });
    expect(resolveGoogleBudget(4, { [queriesKey]: 20, [pagesKey]: 10 })).toEqual({
      queries: 20,
      primaryPages: 10,
    });
  });

  it('below depth 3 it is only an upper cap: it can lower the default, never raise it', () => {
    expect(resolveGoogleBudget(2, { [queriesKey]: 20, [pagesKey]: 10 })).toEqual({
      queries: 2,
      primaryPages: 1,
    });
    expect(resolveGoogleBudget(0, { [queriesKey]: 5 })).toEqual({ queries: 1, primaryPages: 1 });
    expect(resolveGoogleBudget(2, { [queriesKey]: 1 })).toEqual({ queries: 1, primaryPages: 1 });
    expect(resolveGoogleBudget(null, { [queriesKey]: 0 })).toEqual({ queries: 0, primaryPages: 1 });
  });

  it('0 Google queries is valid (Google off for research runs); 0 pages is not', () => {
    expect(resolveGoogleBudget(5, { [queriesKey]: 0 }).queries).toBe(0);
    expect(resolveGoogleBudget(5, { [pagesKey]: 0 }).primaryPages).toBe(5);
  });

  it.each([
    ['queries above 20', { [queriesKey]: 21 }, 'queries', 6],
    ['negative queries', { [queriesKey]: -1 }, 'queries', 6],
    ['a fractional number', { [queriesKey]: 2.5 }, 'queries', 6],
    ['a numeric string', { [queriesKey]: '3' }, 'queries', 6],
    ['null', { [queriesKey]: null }, 'queries', 6],
    ['a boolean', { [queriesKey]: true }, 'queries', 6],
    ['NaN', { [queriesKey]: Number.NaN }, 'queries', 6],
    ['pages above 10', { [pagesKey]: 11 }, 'primaryPages', 5],
    ['a fractional page count', { [pagesKey]: 1.5 }, 'primaryPages', 5],
  ] as const)('%s is ignored (the depth default stays)', (_name, config, field, expected) => {
    expect(resolveGoogleBudget(5, config)[field]).toBe(expected);
  });

  it('a config that is not an object is no override at all', () => {
    for (const config of [null, undefined, [], 'x', 4]) {
      expect(resolveGoogleBudget(5, config)).toEqual({ queries: 6, primaryPages: 5 });
    }
  });
});

describe('dominantScriptOf', () => {
  it('names the script most of the letters are in; -1 when there are none', () => {
    expect(dominantScriptOf('eu ai act fines')).toBe(dominantScriptOf('fines for the act'));
    expect(dominantScriptOf(ARABIC_AI_ACT)).not.toBe(dominantScriptOf('ai act'));
    expect(dominantScriptOf(ARABIC_MIXED)).toBe(dominantScriptOf(ARABIC_WORD));
    expect(dominantScriptOf('12345 ---')).toBe(-1);
  });

  it('any kana makes a query Japanese, so it differs from Chinese Han text', () => {
    expect(dominantScriptOf(JAPANESE_ECONOMY)).not.toBe(dominantScriptOf(CHINESE_ECONOMY));
    expect(dominantScriptOf(CHINESE_ECONOMY)).toBe(dominantScriptOf(CHINESE_TRADITIONAL));
  });
});

describe('pickGoogleExpansions', () => {
  const primary = 'eu ai act fines';

  it('prefers queries in another script than the primary, then the order given', () => {
    const extras = ['gpai obligations', ARABIC_AI_ACT, 'ai act penalties', CHINESE_AI_ACT];

    expect(pickGoogleExpansions(primary, extras, 2)).toEqual([ARABIC_AI_ACT, CHINESE_AI_ACT]);
    expect(pickGoogleExpansions(primary, extras, 3)).toEqual([
      ARABIC_AI_ACT,
      CHINESE_AI_ACT,
      'gpai obligations',
    ]);
  });

  it('keeps the order given when nothing differs from the primary', () => {
    expect(pickGoogleExpansions(primary, ['b one', 'a two', 'c three'], 2)).toEqual([
      'b one',
      'a two',
    ]);
  });

  it('measures against the primary: an Arabic primary prefers a Latin query', () => {
    expect(pickGoogleExpansions(ARABIC_FINES_LAW, [ARABIC_OTHER_LAW, 'ai act fines'], 1)).toEqual([
      'ai act fines',
    ]);
  });

  it('a count of 0 or less picks nothing; more than there is picks all', () => {
    expect(pickGoogleExpansions(primary, ['a b'], 0)).toEqual([]);
    expect(pickGoogleExpansions(primary, ['a b'], -3)).toEqual([]);
    expect(pickGoogleExpansions(primary, ['a b', 'c d'], 9)).toEqual(['a b', 'c d']);
  });
});

describe('googlePageStarts', () => {
  it('pages 2..N start at 10, 20, ... (page 1 is the primary call itself)', () => {
    expect(googlePageStarts(1)).toEqual([]);
    expect(googlePageStarts(2)).toEqual([10]);
    expect(googlePageStarts(5)).toEqual([10, 20, 30, 40]);
    expect(googlePageStarts(10)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(googlePageStarts(0)).toEqual([]);
  });
});

describe('planGoogleRun', () => {
  const google = { id: 'g1', publicConfig: {} };
  const extras = ['one', 'two', 'three', 'four', 'five', 'six'];
  const base = { google, depth: 5, round: 1, primary: 'p query', expansions: extras };

  it('no Google provider: nothing routed to Google, no pages', () => {
    const plan = planGoogleRun({ ...base, google: null });

    expect(plan.primary).toEqual(NO_GOOGLE_ROUTE);
    expect([...plan.expansions]).toEqual([]);
    expect(plan.pages).toEqual([]);
  });

  it('round 1 at depth 5: the primary, 5 expansions and 4 extra primary pages', () => {
    const plan = planGoogleRun(base);

    expect(plan.primary).toEqual({ providerId: 'g1' });
    expect([...plan.expansions]).toEqual(['one', 'two', 'three', 'four', 'five']);
    expect(plan.pages).toEqual([10, 20, 30, 40].map((start) => ({ providerId: 'g1', start })));
  });

  it('round 1 at depth 0 or with no depth: the primary only, page 1 only', () => {
    for (const depth of [0, null]) {
      const plan = planGoogleRun({ ...base, depth });
      expect(plan.primary).toEqual({ providerId: 'g1' });
      expect(plan.expansions.size).toBe(0);
      expect(plan.pages).toEqual([]);
    }
  });

  it('round >= 2: Google gets the round primary only: one call, no extra queries, no pages', () => {
    for (const round of [2, 3, 5]) {
      const plan = planGoogleRun({ ...base, round });
      expect(plan.primary).toEqual({ providerId: 'g1' });
      expect(plan.expansions.size).toBe(0);
      expect(plan.pages).toEqual([]);
    }
  });

  it('never more expansions than the run has, whatever the budget allows', () => {
    const plan = planGoogleRun({ ...base, expansions: ['only one'] });

    expect([...plan.expansions]).toEqual(['only one']);
  });

  it('an override of 0 queries takes Google out of the run entirely, pages included', () => {
    for (const round of [1, 2]) {
      const plan = planGoogleRun({
        ...base,
        round,
        google: { id: 'g1', publicConfig: { [queriesKey]: 0, [pagesKey]: 9 } },
      });
      expect(plan.primary).toEqual(NO_GOOGLE_ROUTE);
      expect(plan.expansions.size).toBe(0);
      expect(plan.pages).toEqual([]);
    }
  });

  it('the override sizes the plan: depth 3 with 4 queries and 3 pages', () => {
    const plan = planGoogleRun({
      ...base,
      depth: 3,
      google: { id: 'g1', publicConfig: { [queriesKey]: 4, [pagesKey]: 3 } },
    });

    expect([...plan.expansions]).toEqual(['one', 'two', 'three']);
    expect(plan.pages.map((page) => page.start)).toEqual([10, 20]);
  });
});

describe('googleCountsOf', () => {
  type Outcome = [string, SearchProviderRunStatus, number];
  const answer = (providers: Outcome[]): SearchExecutionResult =>
    ({
      providers: providers.map(([kind, status, resultCount]) => ({
        name: `P-${kind}`,
        kind,
        status,
        latencyMs: 1,
        resultCount,
        errorCode: null,
      })),
    }) as unknown as SearchExecutionResult;
  const google = SearchProviderKind.SERPAPI;
  const ok = SearchProviderRunStatus.OK;
  const failed = SearchProviderRunStatus.FAILED;
  const timeout = SearchProviderRunStatus.TIMEOUT;

  it('counts only what Google answered: queries with an OK Google outcome, its pages, its results', () => {
    const counts = googleCountsOf(
      [
        answer([
          [google, ok, 10],
          [SearchProviderKind.EXA, ok, 8],
        ]),
        answer([[SearchProviderKind.OLLAMA_WEB, ok, 5]]),
        answer([[google, failed, 0]]),
        answer([[google, ok, 7]]),
      ],
      [answer([[google, ok, 10]]), answer([[google, ok, 9]]), answer([[google, timeout, 0]])],
    );

    expect(counts).toEqual({ queries: 2, pages: 4, results: 36 });
  });

  it('nothing from Google is all zeros', () => {
    expect(googleCountsOf([answer([[SearchProviderKind.EXA, ok, 3]])], [])).toEqual({
      queries: 0,
      pages: 0,
      results: 0,
    });
    expect(googleCountsOf([], [])).toEqual({ queries: 0, pages: 0, results: 0 });
  });
});
