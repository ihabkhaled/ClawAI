import { describe, expect, it, vi } from 'vitest';

import { ResearchErrorCode } from '../../../../common/enums/research-error-code.enum';
import {
  PlatformAccessMethod,
  PlatformApiKind,
  PlatformCategory,
  type ResearchPlatform,
} from '../../../../generated/prisma';
import { PlatformHostRefusedError } from '../../errors/platform-host-refused.error';
import { PlatformSearchService } from '../platform-search.service';
import type { PlatformApiContext, PlatformApiRequest } from '../../types/platform.types';

const api = (
  slug: string,
  apiKind: PlatformApiKind,
  overrides: Partial<ResearchPlatform> = {},
): ResearchPlatform => ({
  id: slug,
  slug,
  name: slug.toUpperCase(),
  category: PlatformCategory.ACADEMIC,
  accessMethod: PlatformAccessMethod.OFFICIAL_API,
  apiKind,
  domains: [`${slug}.example`],
  languages: [],
  enabled: true,
  priority: 10,
  maxResults: 3,
  timeoutMs: 2000,
  notes: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
  ...overrides,
});

const build = (
  search: (request: PlatformApiRequest, context: PlatformApiContext) => Promise<unknown>,
) => {
  const adapter = { search: vi.fn(search) };
  const record = vi.fn(async () => {});
  const service = new PlatformSearchService(
    { findEnabled: vi.fn(async () => []) } as never,
    { getAdapter: vi.fn(() => adapter) } as never,
    { record } as never,
  );
  const debug = vi.spyOn(
    (service as unknown as { logger: { debug: (m: string) => void } }).logger,
    'debug',
  );
  return { service, adapter, record, debug };
};

const hits = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `T${String(i)}`,
    url: `https://x.example/${String(i)}`,
    snippet: null,
    publishedAt: null,
  }));

describe('PlatformSearchService', () => {
  it('stamps results as PLATFORM:<slug> with platform + category, rank-scored, capped', async () => {
    const { service } = build(async () => hits(5));

    const outcome = await service.callOne(api('openalex', PlatformApiKind.OPENALEX), {
      query: 'q',
      maxResults: 2,
      language: null,
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.results).toHaveLength(2);
    expect(outcome.results[0]).toMatchObject({
      providerKind: 'PLATFORM:openalex',
      platform: 'openalex',
      platformCategory: PlatformCategory.ACADEMIC,
      score: 1,
    });
    expect(outcome.results[1]?.score).toBeLessThan(1);
  });

  it('runs every platform in parallel, Wikipedia once per language, one unit per network request', async () => {
    const { service, adapter, record } = build(async (_request, context) => {
      await context.onNetworkCall?.();
      return hits(1);
    });

    const outcomes = await service.runApiPlatforms(
      'u1',
      [
        api('openalex', PlatformApiKind.OPENALEX),
        api('wikipedia', PlatformApiKind.WIKIPEDIA, { category: PlatformCategory.REFERENCE }),
      ],
      'eu ai act',
      ['de', 'fr'],
    );

    expect(outcomes.map((outcome) => [outcome.slug, outcome.language])).toEqual([
      ['openalex', null],
      ['wikipedia', 'de'],
      ['wikipedia', 'fr'],
    ]);
    expect(adapter.search).toHaveBeenCalledTimes(3);
    expect(record).toHaveBeenCalledTimes(3);
    const requestIds = record.mock.calls.map((call) => (call as unknown[])[2] as string);
    expect(new Set(requestIds).size).toBe(3);
    expect(record.mock.calls.every((call) => (call as unknown[])[1] === 'WEB_SEARCH')).toBe(true);
  });

  it('never rejects: a refused host is UNSAFE_URL, a timeout SEARCH_TIMEOUT, a 429 rate-limited', async () => {
    const errors: unknown[] = [
      new PlatformHostRefusedError('evil.example'),
      Object.assign(new Error('aborted'), { name: 'TimeoutError' }),
      new Error('GITHUB API answered HTTP 429'),
    ];
    const { service } = build(async () => {
      throw errors.shift();
    });
    const platform = api('github', PlatformApiKind.GITHUB);
    const request = { query: 'q', maxResults: 3, language: null };

    await expect(service.callOne(platform, request)).resolves.toMatchObject({
      ok: false,
      errorCode: ResearchErrorCode.UNSAFE_URL,
    });
    await expect(service.callOne(platform, request)).resolves.toMatchObject({
      errorCode: ResearchErrorCode.SEARCH_TIMEOUT,
    });
    await expect(service.callOne(platform, request)).resolves.toMatchObject({
      errorCode: ResearchErrorCode.PROVIDER_RATE_LIMITED,
    });
  });

  it('bounds the whole call by the row timeout (one signal)', async () => {
    const { service } = build(
      (_request, context) =>
        new Promise((_resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(context.signal.reason as Error));
        }),
    );

    const started = Date.now();
    const outcome = await service.callOne(api('arxiv', PlatformApiKind.ARXIV, { timeoutMs: 50 }), {
      query: 'q',
      maxResults: 3,
      language: null,
    });

    expect(Date.now() - started).toBeLessThan(2_000);
    expect(outcome).toMatchObject({ ok: false, errorCode: ResearchErrorCode.SEARCH_TIMEOUT });
  });

  it('logs one research.platform debug line per call: slug, ok, count, ms, code; never the query', async () => {
    const { service, debug } = build(async () => hits(2));

    await service.callOne(api('crossref', PlatformApiKind.CROSSREF), {
      query: 'my secret medical question',
      maxResults: 3,
      language: null,
    });

    expect(debug).toHaveBeenCalledTimes(1);
    const line = String(debug.mock.calls[0]?.[0]);
    expect(line).toMatch(/^research\.platform slug=crossref ok=true count=2 ms=\d+ code=none$/u);
    expect(line).not.toContain('secret');
  });
});
