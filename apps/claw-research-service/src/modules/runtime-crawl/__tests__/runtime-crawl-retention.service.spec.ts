import { describe, expect, it, vi } from 'vitest';

import { RUNTIME_CRAWL_DAY_MS } from '../constants/runtime-crawl.constants';
import { updateRuntimeCrawlConfigSchema } from '../dto/update-runtime-crawl-config.dto';
import { RuntimeCrawlRetentionService } from '../services/runtime-crawl-retention.service';

const NOW = new Date('2026-10-10T12:00:00.000Z');

function build(retentionDays: number | null): {
  service: RuntimeCrawlRetentionService;
  deleteFinishedBefore: ReturnType<typeof vi.fn>;
} {
  const deleteFinishedBefore = vi.fn().mockResolvedValue(3);
  const service = new RuntimeCrawlRetentionService(
    { get: vi.fn().mockResolvedValue({ retentionDays }) } as never,
    { deleteFinishedBefore } as never,
  );
  return { service, deleteFinishedBefore };
}

describe('RuntimeCrawlRetentionService', () => {
  it('purges finished runs older than the configured days', async () => {
    const { service, deleteFinishedBefore } = build(7);

    await expect(service.purge(NOW)).resolves.toBe(3);
    expect(deleteFinishedBefore).toHaveBeenCalledWith(
      new Date(NOW.getTime() - 7 * RUNTIME_CRAWL_DAY_MS),
    );
  });

  it('null means unlimited: nothing is deleted', async () => {
    const { service, deleteFinishedBefore } = build(null);

    await expect(service.purge(NOW)).resolves.toBe(0);
    expect(deleteFinishedBefore).not.toHaveBeenCalled();
  });

  it('0 keeps nothing past the 24 h cap window, never the cap window itself', async () => {
    const { service, deleteFinishedBefore } = build(0);

    await service.purge(NOW);

    expect(deleteFinishedBefore).toHaveBeenCalledWith(
      new Date(NOW.getTime() - RUNTIME_CRAWL_DAY_MS),
    );
  });

  it('is idempotent: a second sweep over the same state deletes nothing more', async () => {
    const { service, deleteFinishedBefore } = build(7);
    deleteFinishedBefore.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    await expect(service.purge(NOW)).resolves.toBe(2);
    await expect(service.purge(NOW)).resolves.toBe(0);
  });
});

describe('retention repository query', () => {
  it('excludes RUNNING runs and ages by completion, falling back to start', async () => {
    const { RuntimeCrawlRunRepository } =
      await import('../repositories/runtime-crawl-run.repository');
    const deleteMany = vi.fn().mockResolvedValue({ count: 5 });
    const repo = new RuntimeCrawlRunRepository({ runtimeCrawlRun: { deleteMany } } as never);
    const cutoff = new Date(0);

    await expect(repo.deleteFinishedBefore(cutoff)).resolves.toBe(5);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        status: { not: 'RUNNING' },
        OR: [{ completedAt: { lt: cutoff } }, { completedAt: null, startedAt: { lt: cutoff } }],
      },
    });
  });
});

describe('retentionDays on the admin DTO', () => {
  it.each([0, 1, 7, 3650, null])('accepts %s', (value) => {
    expect(updateRuntimeCrawlConfigSchema.safeParse({ retentionDays: value }).success).toBe(true);
  });

  it.each([-1, 1.5, 3651, '7'])('rejects %s', (value) => {
    expect(updateRuntimeCrawlConfigSchema.safeParse({ retentionDays: value }).success).toBe(false);
  });
});
