import { vi } from 'vitest';

import { WeightedUsageState } from '../../../../generated/prisma';
import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { WeightedUsageRepository } from '../weighted-usage.repository';

describe('WeightedUsageRepository.recordSettledUsage', () => {
  it('writes a FINALIZED zero-cost row that usage attribution counts', async () => {
    const create = vi.fn().mockResolvedValue({});
    const repo = new WeightedUsageRepository({
      weightedUsageRecord: { create },
    } as unknown as PrismaService);

    await repo.recordSettledUsage({
      userId: 'u1',
      planId: null,
      provider: 'OPENAI',
      model: 'gpt-4o',
      rawInputTokens: 3,
      rawOutputTokens: 4,
      weightedTokens: 7,
      dayKey: '2026-10-01',
      weekKey: '2026-W40',
      monthKey: '2026-10',
    });

    const data = create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      userId: 'u1',
      provider: 'OPENAI',
      model: 'gpt-4o',
      rawInputTokens: 3,
      rawOutputTokens: 4,
      weightedTokens: 7,
      state: WeightedUsageState.FINALIZED,
    });
    expect(data.requestId).toBe(data.reservationId);
    expect(data.estimatedCostMicroUsd).toBeUndefined();
  });
});
