import { type Mock, vi } from 'vitest';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { FetchStrategyStatusService } from '../fetch-strategy-status.service';
import type { FetchStrategyConfigRepository } from '../../repositories/fetch-strategy-config.repository';

describe('FetchStrategyStatusService', () => {
  let repository: { listAll: Mock; findByKind: Mock; update: Mock };
  let service: FetchStrategyStatusService;

  beforeEach(() => {
    repository = { listAll: vi.fn(), findByKind: vi.fn(), update: vi.fn() };
    service = new FetchStrategyStatusService(
      repository as unknown as FetchStrategyConfigRepository,
    );
  });

  it('lists every strategy config row', async () => {
    repository.listAll.mockResolvedValue([{ kind: FetchStrategyKind.HTTP_PLAIN }]);
    const result = await service.list();
    expect(result).toHaveLength(1);
  });

  it('throws EntityNotFoundException when updating an unknown kind', async () => {
    repository.findByKind.mockResolvedValue(null);
    await expect(
      service.update(FetchStrategyKind.READER_PROXY, { enabled: true }),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates an existing config row with only the provided fields', async () => {
    repository.findByKind.mockResolvedValue({ kind: FetchStrategyKind.READER_PROXY });
    repository.update.mockResolvedValue({ kind: FetchStrategyKind.READER_PROXY, enabled: true });

    const result = await service.update(FetchStrategyKind.READER_PROXY, { enabled: true });

    expect(repository.update).toHaveBeenCalledWith(
      FetchStrategyKind.READER_PROXY,
      expect.objectContaining({ enabled: true }),
    );
    expect(result.enabled).toBe(true);
  });
});
