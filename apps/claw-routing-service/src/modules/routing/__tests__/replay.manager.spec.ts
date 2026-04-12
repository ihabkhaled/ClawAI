import { ReplayManager } from '../managers/replay.manager';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { type RoutingManager } from '../managers/routing.manager';
import { RoutingMode } from '../../../generated/prisma';

const mockDecision = {
  id: 'decision-1',
  messageId: 'msg-1',
  threadId: 'thread-1',
  selectedProvider: 'anthropic',
  selectedModel: 'claude-sonnet-4',
  routingMode: RoutingMode.AUTO,
  confidence: 0.75,
  reasonTags: ['auto'],
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackProvider: null,
  fallbackModel: null,
  createdAt: new Date(),
};

const mockNewDecisionResult = {
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  routingMode: RoutingMode.AUTO,
  confidence: 0.9,
  reasonTags: ['auto', 'category_match'],
  privacyClass: 'cloud',
  costClass: 'low',
  fallbackChain: [],
  detectedCategory: 'coding',
  estimatedCostPer1M: 5,
  latencySlaMs: 3000,
};

describe('ReplayManager', () => {
  let manager: ReplayManager;
  let decisionsRepo: { findRecent: jest.Mock };
  let routingManager: { evaluateRoute: jest.Mock };

  beforeEach(() => {
    decisionsRepo = {
      findRecent: jest.fn().mockResolvedValue([mockDecision]),
    };
    routingManager = {
      evaluateRoute: jest.fn().mockResolvedValue(mockNewDecisionResult),
    };
    manager = new ReplayManager(
      decisionsRepo as unknown as RoutingDecisionsRepository,
      routingManager as unknown as RoutingManager,
    );
  });

  it('should replay decisions and detect changes', async () => {
    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.totalReplayed).toBe(1);
    expect(result.changed).toBe(1);
    expect(result.unchanged).toBe(0);
    const first = result.results[0]!;
    expect(first.changed).toBe(true);
    expect(first.originalDecision.selectedProvider).toBe('anthropic');
    expect(first.replayDecision.selectedProvider).toBe('openai');
  });

  it('should report unchanged when provider and model match', async () => {
    routingManager.evaluateRoute.mockResolvedValue({
      ...mockNewDecisionResult,
      selectedProvider: 'anthropic',
      selectedModel: 'claude-sonnet-4',
    });

    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.changed).toBe(0);
    expect(result.unchanged).toBe(1);
    expect(result.results[0]!.changed).toBe(false);
  });

  it('should calculate positive improvement when new confidence is higher', async () => {
    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.results[0]!.improvementScore).toBeGreaterThan(0);
    expect(result.averageConfidenceNew).toBeGreaterThan(result.averageConfidenceOld);
  });

  it('should calculate negative improvement when new confidence is lower', async () => {
    routingManager.evaluateRoute.mockResolvedValue({
      ...mockNewDecisionResult,
      confidence: 0.3,
      costClass: 'high',
    });

    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.results[0]!.improvementScore).toBeLessThan(0);
  });

  it('should handle empty decision list', async () => {
    decisionsRepo.findRecent.mockResolvedValue([]);

    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.totalReplayed).toBe(0);
    expect(result.changed).toBe(0);
    expect(result.unchanged).toBe(0);
    expect(result.averageConfidenceOld).toBe(0);
    expect(result.averageConfidenceNew).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('should handle null confidence in original decision', async () => {
    decisionsRepo.findRecent.mockResolvedValue([
      { ...mockDecision, confidence: null },
    ]);

    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.results[0]!.originalDecision.confidence).toBeNull();
    expect(result.averageConfidenceOld).toBe(0);
  });

  it('should pass filters to repository', async () => {
    const filters = {
      threadId: 'thread-1',
      routingMode: 'AUTO',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      limit: 25,
    };

    await manager.replayDecisions(filters);

    expect(decisionsRepo.findRecent).toHaveBeenCalledWith(filters);
  });

  it('should build routing context from decision', async () => {
    await manager.replayDecisions({ limit: 50 });

    expect(routingManager.evaluateRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '',
        threadId: 'thread-1',
        userMode: RoutingMode.AUTO,
      }),
    );
  });

  it('should clamp improvement score to [-1, 1]', async () => {
    routingManager.evaluateRoute.mockResolvedValue({
      ...mockNewDecisionResult,
      confidence: 0.99,
      costClass: 'free',
    });

    const result = await manager.replayDecisions({ limit: 50 });

    expect(result.results[0]!.improvementScore).toBeLessThanOrEqual(1);
    expect(result.results[0]!.improvementScore).toBeGreaterThanOrEqual(-1);
  });
});
