import { vi } from 'vitest';

import { FetchStrategyKind } from '../../../../generated/prisma';
import { internalFetchSchema } from '../../dto/internal-fetch.dto';
import { FetchService } from '../../services/fetch.service';
import { FetchInternalController } from '../fetch-internal.controller';
import type { FetchResult } from '../../types/fetch.types';

describe('FetchInternalController', () => {
  it('names the user explicitly and delegates the rest to the tool fetch', async () => {
    const view = {
      url: 'https://example.com/',
      title: 'T',
      content: 'c',
      links: [],
      servedBy: null,
      archivedAt: null,
    };
    const fetchPageForTool = vi.fn().mockResolvedValue(view);
    const controller = new FetchInternalController({ fetchPageForTool } as unknown as FetchService);

    await expect(
      controller.fetch({ userId: 'u1', url: 'https://example.com/', render: undefined }),
    ).resolves.toBe(view);
    expect(fetchPageForTool).toHaveBeenCalledWith('u1', {
      url: 'https://example.com/',
      render: undefined,
    });
  });

  it('does not accept refresh (a tool call may not bypass the cache) and requires a user', () => {
    expect(
      internalFetchSchema.safeParse({ userId: 'u', url: 'https://a.example/', refresh: true }).data,
    ).not.toHaveProperty('refresh');
    expect(internalFetchSchema.safeParse({ url: 'https://a.example/' }).success).toBe(false);
  });
});

describe('FetchService.fetchPageForTool', () => {
  it('returns text, links and provenance, never the raw HTML', async () => {
    const service = Object.create(FetchService.prototype) as FetchService;
    const result: FetchResult = {
      url: 'https://example.com/a',
      finalUrl: 'https://www.example.com/a',
      httpStatus: 200,
      mimeType: 'text/html',
      title: 'Title',
      content: 'readable',
      links: ['https://www.example.com/b'],
      byteSize: 10,
      cacheHit: false,
      latencyMs: 1,
      rawHtml: '<html>secret markup</html>',
      servedBy: FetchStrategyKind.CRAWL4AI,
    };
    vi.spyOn(service, 'fetchPage').mockResolvedValue(result);

    const view = await service.fetchPageForTool('u1', { url: 'https://example.com/a' });

    expect(view).toEqual({
      url: 'https://www.example.com/a',
      title: 'Title',
      content: 'readable',
      links: ['https://www.example.com/b'],
      servedBy: FetchStrategyKind.CRAWL4AI,
      archivedAt: null,
    });
    expect(JSON.stringify(view)).not.toContain('secret markup');
  });
});
