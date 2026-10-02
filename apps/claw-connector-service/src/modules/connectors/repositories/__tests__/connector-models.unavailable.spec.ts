import { type Mock, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConnectorModelsRepository } from '../connector-models.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  MODEL_UNAVAILABLE_RETIRE_THRESHOLD,
  MODEL_UNAVAILABLE_WINDOW_MS,
} from '../../constants/model-unavailable.constants';

describe('ConnectorModelsRepository retired models (ADR-151)', () => {
  let repository: ConnectorModelsRepository;
  let updateMany: Mock;
  let transaction: Mock;

  beforeEach(async () => {
    updateMany = vi.fn().mockImplementation((args: unknown) => ({ args }));
    transaction = vi.fn();
    const module = await Test.createTestingModule({
      providers: [
        ConnectorModelsRepository,
        {
          provide: PrismaService,
          useValue: { connectorModel: { updateMany, upsert: vi.fn() }, $transaction: transaction },
        },
      ],
    }).compile();
    repository = module.get(ConnectorModelsRepository);
  });

  it('recordUnavailable resets stale reports, counts this one, then retires at the threshold', async () => {
    transaction.mockResolvedValue([{ count: 0 }, { count: 1 }, { count: 1 }]);

    const result = await repository.recordUnavailable('OPENAI' as never, ['gpt-5-chat-latest']);

    expect(result).toEqual({ counted: 1, retired: 1 });
    const calls = updateMany.mock.calls.map(
      (call) => call[0] as { where: Record<string, unknown>; data: Record<string, unknown> },
    );
    expect(calls).toHaveLength(3);
    expect(calls[0]?.where).toMatchObject({
      provider: 'OPENAI',
      modelKey: { in: ['gpt-5-chat-latest'] },
      unavailableAt: { lt: expect.any(Date) },
    });
    const staleBefore = (calls[0]?.where['unavailableAt'] as { lt: Date }).lt.getTime();
    expect(Date.now() - staleBefore).toBeGreaterThanOrEqual(MODEL_UNAVAILABLE_WINDOW_MS - 1000);
    expect(calls[0]?.data).toEqual({ unavailableCount: 0 });
    expect(calls[1]?.data).toMatchObject({ unavailableCount: { increment: 1 } });
    expect(calls[2]?.where).toMatchObject({
      unavailableCount: { gte: MODEL_UNAVAILABLE_RETIRE_THRESHOLD },
      lifecycle: 'ACTIVE',
    });
    expect(calls[2]?.data).toEqual({ lifecycle: 'SUNSET', exposure: 'UNEXPOSED' });
  });

  it('a sync keeps a model with enough unavailable reports retired', async () => {
    transaction.mockResolvedValue([{ count: 0 }, {}, { count: 1 }]);

    await repository.replaceMany('c1', 'OPENAI' as never, []);

    const retire = updateMany.mock.calls
      .map((call) => call[0] as { where: Record<string, unknown>; data: Record<string, unknown> })
      .find((arg) => arg.where['unavailableCount'] !== undefined);
    expect(retire?.where).toEqual({
      connectorId: 'c1',
      unavailableCount: { gte: MODEL_UNAVAILABLE_RETIRE_THRESHOLD },
      lifecycle: 'ACTIVE',
    });
    expect(retire?.data).toEqual({ lifecycle: 'SUNSET', exposure: 'UNEXPOSED' });
  });

  it('exposing a model clears its unavailable reports; unexposing leaves them', async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await repository.setExposure('c1', ['m'], true);
    await repository.setExposure('c1', ['m'], false);

    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      data: { exposure: 'EXPOSED', unavailableCount: 0, unavailableAt: null },
    });
    expect(updateMany.mock.calls[1]?.[0]).toMatchObject({ data: { exposure: 'UNEXPOSED' } });
  });
});
