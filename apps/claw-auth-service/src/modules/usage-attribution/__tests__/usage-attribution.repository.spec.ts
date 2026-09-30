import { vi } from 'vitest';

import { Test } from '@nestjs/testing';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { UsageAttributionRepository } from '../repositories/usage-attribution.repository';
import { resolveUsageWindow } from '../utilities/usage-window.utility';

describe('UsageAttributionRepository', () => {
  const groupBy = vi.fn();
  let repo: UsageAttributionRepository;
  const window = { from: new Date('2026-09-01T00:00:00Z'), to: new Date('2026-09-30T00:00:00Z') };

  beforeEach(async () => {
    groupBy.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        UsageAttributionRepository,
        { provide: PrismaService, useValue: { weightedUsageRecord: { groupBy } } },
      ],
    }).compile();
    repo = module.get(UsageAttributionRepository);
  });

  it('scopes every sum to the given users, counted states and window', async () => {
    groupBy.mockResolvedValue([
      {
        workflow: null,
        _count: { _all: 3 },
        _sum: { weightedTokens: 90, rawInputTokens: null, rawOutputTokens: 4 },
      },
    ]);

    const rows = await repo.sumByWorkflow(['user-1'], window);

    expect(rows).toEqual([
      { key: { workflow: null }, requests: 3, weightedTokens: 90, inputTokens: 0, outputTokens: 4 },
    ]);
    const args = groupBy.mock.calls[0]?.[0];
    expect(args.by).toEqual(['workflow']);
    expect(args.where).toEqual({
      userId: { in: ['user-1'] },
      state: { in: ['RESERVED', 'FINALIZED'] },
      createdAt: { gte: window.from, lt: window.to },
    });
  });

  it('groups by provider and model, and by user', async () => {
    groupBy.mockResolvedValueOnce([
      {
        provider: 'openai',
        model: 'gpt',
        _count: { _all: 1 },
        _sum: { weightedTokens: 5, rawInputTokens: 2, rawOutputTokens: 3 },
      },
    ]);
    groupBy.mockResolvedValueOnce([
      {
        userId: 'u2',
        _count: { _all: 1 },
        _sum: { weightedTokens: 5, rawInputTokens: 2, rawOutputTokens: 3 },
      },
    ]);

    expect((await repo.sumByModel(['u2'], window))[0]?.key).toEqual({
      provider: 'openai',
      model: 'gpt',
    });
    expect((await repo.sumByUser(['u2'], window))[0]?.key).toEqual({ userId: 'u2' });
    expect(groupBy.mock.calls[1]?.[0].by).toEqual(['userId']);
  });
});

describe('resolveUsageWindow', () => {
  const now = new Date('2026-09-30T12:00:00Z');

  it('defaults to the thirty days ending now', () => {
    expect(resolveUsageWindow({}, now)).toEqual({
      from: new Date('2026-08-31T12:00:00Z'),
      to: now,
    });
  });

  it('accepts an explicit window up to the cap and refuses an empty one', () => {
    expect(
      resolveUsageWindow({ from: '2026-07-01T00:00:00Z', to: '2026-09-30T00:00:00Z' }, now),
    ).not.toBeNull();
    expect(
      resolveUsageWindow({ from: '2026-09-01T00:00:00Z', to: '2026-09-01T00:00:00Z' }, now),
    ).toBeNull();
  });
});
