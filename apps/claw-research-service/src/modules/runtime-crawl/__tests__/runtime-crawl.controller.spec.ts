import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { describe, expect, it, vi } from 'vitest';

import { RuntimeCrawlConfigController } from '../controllers/runtime-crawl-config.controller';
import { RuntimeCrawlController } from '../controllers/runtime-crawl.controller';
import { ResearchAccessGuard } from '../guards/research-access.guard';
import { runtimeCrawlPagesQuerySchema } from '../dto/runtime-crawl-pages-query.dto';
import { startRuntimeCrawlSchema } from '../dto/start-runtime-crawl.dto';
import { updateRuntimeCrawlConfigSchema } from '../dto/update-runtime-crawl-config.dto';

const USER = { id: 'user-1', email: 'u@example.com', role: 'USER' };

describe('RuntimeCrawlController wiring', () => {
  it('sits behind RESEARCH_USE and the plan guard on every route', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, RuntimeCrawlController)).toEqual([
      Permission.RESEARCH_USE,
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, RuntimeCrawlController)).toContain(
      ResearchAccessGuard,
    );
  });

  it('passes the authenticated user id to the manager, never an id from the request', async () => {
    const manager = {
      start: vi.fn().mockResolvedValue({}),
      getRun: vi.fn().mockResolvedValue({}),
      getPages: vi.fn().mockResolvedValue({}),
      listRuns: vi.fn().mockResolvedValue([]),
    };
    const controller = new RuntimeCrawlController(manager as never);
    await controller.start(USER, { url: 'https://example.com', profile: 'crawl' });
    await controller.getOne(USER, 'r1');
    await controller.pages(USER, 'r1', { after: -1 });
    await controller.list(USER, '999');
    expect(manager.start).toHaveBeenCalledWith('user-1', expect.anything());
    expect(manager.getRun).toHaveBeenCalledWith('user-1', 'r1');
    expect(manager.getPages).toHaveBeenCalledWith('user-1', 'r1', { after: -1 });
    // An out-of-range limit falls back to the default instead of being honoured.
    expect(manager.listRuns).toHaveBeenCalledWith('user-1', 20);
  });

  it('keeps the config controller admin-only', () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, RuntimeCrawlConfigController)).toEqual([
      Permission.ADMIN_SYSTEM_VIEW,
    ]);
    const service = { get: vi.fn(), update: vi.fn().mockResolvedValue({}) };
    void new RuntimeCrawlConfigController(service as never).update(USER, { maxPagesPerRun: 5 });
    expect(service.update).toHaveBeenCalledWith({ maxPagesPerRun: 5 }, 'user-1');
  });
});

describe('runtime crawl DTOs', () => {
  it('defaults the profile to crawl and caps pages and depth at the crawler ceilings', () => {
    expect(startRuntimeCrawlSchema.parse({ url: 'https://example.com' }).profile).toBe('crawl');
    expect(
      startRuntimeCrawlSchema.safeParse({ url: 'https://example.com', maxPages: 201 }).success,
    ).toBe(false);
    expect(
      startRuntimeCrawlSchema.safeParse({ url: 'https://example.com', maxDepth: 4 }).success,
    ).toBe(false);
    expect(
      startRuntimeCrawlSchema.safeParse({ url: 'https://example.com', profile: 'admin' }).success,
    ).toBe(false);
    expect(startRuntimeCrawlSchema.safeParse({ url: 'not a url' }).success).toBe(false);
  });

  it('bounds the page-listing query', () => {
    expect(runtimeCrawlPagesQuerySchema.parse({}).after).toBe(-1);
    expect(runtimeCrawlPagesQuerySchema.safeParse({ limit: '26' }).success).toBe(false);
  });

  it('rejects unknown and over-ceiling config fields', () => {
    expect(updateRuntimeCrawlConfigSchema.safeParse({ maxPagesPerRun: 201 }).success).toBe(false);
    expect(updateRuntimeCrawlConfigSchema.safeParse({ dailyPageBudgetPerUser: 5001 }).success).toBe(
      false,
    );
    expect(updateRuntimeCrawlConfigSchema.safeParse({ notAField: 1 }).success).toBe(false);
    expect(updateRuntimeCrawlConfigSchema.safeParse({ enabled: false }).success).toBe(true);
  });
});
