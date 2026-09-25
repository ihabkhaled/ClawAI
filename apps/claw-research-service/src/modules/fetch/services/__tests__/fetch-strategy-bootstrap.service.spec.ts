import { vi, type Mock } from 'vitest';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { FetchStrategyBootstrapService } from '../fetch-strategy-bootstrap.service';
import type { FetchStrategyConfigRepository } from '../../repositories/fetch-strategy-config.repository';

type SeededRow = {
  kind: FetchStrategyKind;
  enabled: boolean;
  publicConfig: Record<string, unknown>;
};

describe('FetchStrategyBootstrapService', () => {
  let repository: { findByKind: Mock; create: Mock };
  let service: FetchStrategyBootstrapService;

  function seeded(kind: FetchStrategyKind): SeededRow | undefined {
    const calls = repository.create.mock.calls as Array<[SeededRow]>;
    return calls.find(([row]) => row.kind === kind)?.[0];
  }

  beforeEach(() => {
    repository = { findByKind: vi.fn(), create: vi.fn() };
    service = new FetchStrategyBootstrapService(
      repository as unknown as FetchStrategyConfigRepository,
    );
  });

  it('seeds one row per strategy kind', async () => {
    repository.findByKind.mockResolvedValue(null);

    await service.onModuleInit();

    expect(repository.create).toHaveBeenCalledTimes(Object.values(FetchStrategyKind).length);
  });

  it('enables every in-process strategy and disables the three sidecars (owner decision)', async () => {
    repository.findByKind.mockResolvedValue(null);

    await service.onModuleInit();

    for (const kind of [
      FetchStrategyKind.OFFICIAL_API,
      FetchStrategyKind.HTTP_PLAIN,
      FetchStrategyKind.HTTP_TLS_IMPERSONATE,
      FetchStrategyKind.HEADLESS_BROWSER,
      FetchStrategyKind.READER_PROXY,
      FetchStrategyKind.ARCHIVE_SNAPSHOT,
    ]) {
      expect(seeded(kind)?.enabled).toBe(true);
    }
    for (const kind of [
      FetchStrategyKind.CRAWL4AI,
      FetchStrategyKind.FLARESOLVERR,
      FetchStrategyKind.FIRECRAWL,
    ]) {
      expect(seeded(kind)?.enabled).toBe(false);
    }
  });

  it('seeds sidecar base URLs on the internal network', async () => {
    repository.findByKind.mockResolvedValue(null);

    await service.onModuleInit();

    expect(seeded(FetchStrategyKind.CRAWL4AI)?.publicConfig).toEqual({
      baseUrl: 'http://crawl4ai:11235',
    });
    expect(seeded(FetchStrategyKind.HTTP_PLAIN)?.publicConfig).toEqual({});
  });

  it('never overwrites an existing row', async () => {
    repository.findByKind.mockResolvedValue({ kind: FetchStrategyKind.HTTP_PLAIN, enabled: false });

    await service.onModuleInit();

    expect(repository.create).not.toHaveBeenCalled();
  });
});
