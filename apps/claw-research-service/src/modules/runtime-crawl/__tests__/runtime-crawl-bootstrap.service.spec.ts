import { describe, expect, it, vi } from 'vitest';

import { RUNTIME_CRAWL_DEFAULTS } from '../constants/runtime-crawl.constants';
import { RuntimeCrawlBootstrapService } from '../services/runtime-crawl-bootstrap.service';
import { RuntimeCrawlConfigService } from '../services/runtime-crawl-config.service';

describe('runtime crawl seeding', () => {
  it('creates the default row once and never overwrites an existing one', async () => {
    const stored = {
      id: 'default',
      ...RUNTIME_CRAWL_DEFAULTS,
      maxPagesPerRun: 7,
      updatedBy: 'admin',
      updatedAt: new Date(0),
    };
    const repo = { find: vi.fn().mockResolvedValue(stored), create: vi.fn(), update: vi.fn() };
    const service = new RuntimeCrawlConfigService(repo as never);
    await expect(service.get()).resolves.toBe(stored);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('seeds the defaults when the row is missing', async () => {
    const repo = {
      find: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn(),
    };
    await new RuntimeCrawlConfigService(repo as never).get();
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ maxPagesPerRun: 50, dailyPageBudgetPerUser: 200 }),
    );
  });

  it('records who changed the limits', async () => {
    const repo = {
      find: vi.fn().mockResolvedValue({}),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    };
    await new RuntimeCrawlConfigService(repo as never).update({ maxPagesPerRun: 10 }, 'admin-1');
    expect(repo.update).toHaveBeenCalledWith({ maxPagesPerRun: 10, updatedBy: 'admin-1' });
  });

  it('boot sweep fails stale RUNNING rows with a truthful code', async () => {
    const config = { get: vi.fn().mockResolvedValue({ runTimeoutSeconds: 300 }) };
    const runs = { failStale: vi.fn().mockResolvedValue(2) };
    await new RuntimeCrawlBootstrapService(config as never, runs as never).onModuleInit();
    expect(runs.failStale).toHaveBeenCalledWith(
      expect.any(Date),
      'RUNTIME_CRAWL_INTERRUPTED',
      expect.stringContaining('interrupted'),
    );
  });
});
