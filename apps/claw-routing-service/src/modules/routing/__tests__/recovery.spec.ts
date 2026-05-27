import { RoutingService } from '../services/routing.service';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { type RawRecoveryData } from '../types/recovery.types';

const mockRawData: RawRecoveryData = {
  total: 100,
  withFallback: 20,
  providerCounts: [
    { selectedProvider: 'anthropic', _count: { selectedProvider: 12 } },
    { selectedProvider: 'openai', _count: { selectedProvider: 8 } },
  ],
  recent: [
    {
      id: 'decision-1',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      selectedProvider: 'anthropic',
      selectedModel: 'claude-sonnet-4',
      fallbackProvider: 'openai',
      fallbackModel: 'gpt-4o-mini',
      routingMode: 'AUTO',
    },
  ],
};

describe('RoutingService.getRecoveryStats', () => {
  let service: RoutingService;
  let decisionsRepo: { getRecoveryStats: jest.Mock };

  beforeEach(() => {
    decisionsRepo = {
      getRecoveryStats: jest.fn().mockResolvedValue(mockRawData),
    };

    service = new RoutingService(
      {} as any,
      decisionsRepo as unknown as RoutingDecisionsRepository,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        subscribe: jest.fn(),
        publish: jest.fn(),
      } as any,
      {} as any,
      { isFrontierAvailable: () => false } as any,
      // Phase 2 — SemanticIntentAnalyzerManager; not exercised here.
      { analyze: jest.fn() } as any,
    );
  });

  it('returns computed fallbackRate', async () => {
    const result = await service.getRecoveryStats(20);
    expect(result.totalDecisions).toBe(100);
    expect(result.totalWithFallback).toBe(20);
    expect(result.fallbackRate).toBeCloseTo(0.2);
  });

  it('maps providerCounts to providerStats', async () => {
    const result = await service.getRecoveryStats(20);
    expect(result.providerStats).toHaveLength(2);
    expect(result.providerStats[0]).toMatchObject({
      provider: 'anthropic',
      fallbackCount: 12,
      totalCount: 100,
      fallbackRate: 0.12,
    });
  });

  it('maps recent fallbacks correctly', async () => {
    const result = await service.getRecoveryStats(20);
    expect(result.recentFallbacks).toHaveLength(1);
    expect(result.recentFallbacks[0]).toMatchObject({
      id: 'decision-1',
      selectedProvider: 'anthropic',
      fallbackProvider: 'openai',
    });
  });

  it('returns fallbackRate of 0 when total is 0', async () => {
    decisionsRepo.getRecoveryStats.mockResolvedValue({
      total: 0,
      withFallback: 0,
      providerCounts: [],
      recent: [],
    });
    const result = await service.getRecoveryStats(20);
    expect(result.fallbackRate).toBe(0);
    expect(result.providerStats).toHaveLength(0);
  });

  it('calls repository with the given limit', async () => {
    await service.getRecoveryStats(50);
    expect(decisionsRepo.getRecoveryStats).toHaveBeenCalledWith(50);
  });

  it('handles null fallbackProvider and fallbackModel in recent fallbacks', async () => {
    decisionsRepo.getRecoveryStats.mockResolvedValue({
      ...mockRawData,
      recent: [
        {
          id: 'decision-null',
          createdAt: new Date('2024-01-02T10:00:00Z'),
          selectedProvider: 'gemini',
          selectedModel: 'gemini-2.5-flash',
          fallbackProvider: null,
          fallbackModel: null,
          routingMode: 'AUTO',
        },
      ],
    });
    const result = await service.getRecoveryStats(20);
    expect(result.recentFallbacks[0]?.fallbackProvider).toBeNull();
    expect(result.recentFallbacks[0]?.fallbackModel).toBeNull();
  });

  it('preserves routingMode in recentFallbacks', async () => {
    const result = await service.getRecoveryStats(20);
    expect(result.recentFallbacks[0]?.routingMode).toBe('AUTO');
  });

  it('returns empty providerStats and recentFallbacks when no fallback events exist', async () => {
    decisionsRepo.getRecoveryStats.mockResolvedValue({
      total: 50,
      withFallback: 0,
      providerCounts: [],
      recent: [],
    });
    const result = await service.getRecoveryStats(20);
    expect(result.totalWithFallback).toBe(0);
    expect(result.providerStats).toEqual([]);
    expect(result.recentFallbacks).toEqual([]);
  });

  it('sorts providerStats by fallbackCount descending based on raw data order', async () => {
    const result = await service.getRecoveryStats(20);
    // anthropic (12) comes before openai (8) as provided by the groupBy result
    expect(result.providerStats[0]?.provider).toBe('anthropic');
    expect(result.providerStats[1]?.provider).toBe('openai');
  });
});
