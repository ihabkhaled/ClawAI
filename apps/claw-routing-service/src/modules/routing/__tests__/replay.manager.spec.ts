import { ReplayManager } from '../managers/replay.manager';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { type ReplayRunsRepository } from '../repositories/replay-runs.repository';
import { type ReplayCasesRepository } from '../repositories/replay-cases.repository';
import { type RoutingManager } from '../managers/routing.manager';
import { RoutingMode } from '../../../generated/prisma';

const mockDecision = {
  id: 'decision-1',
  messageId: 'msg-1',
  threadId: 'thread-1',
  messageContent: 'Write a Python function to sort a list',
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

const mockRun = {
  id: 'run-1',
  name: null,
  filters: {},
  totalReplayed: 1,
  changedCount: 1,
  suspiciousCount: 0,
  avgConfOld: 0.75,
  avgConfNew: 0.9,
  avgImprovement: 1,
  labelBreakdown: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ReplayManager', () => {
  let manager: ReplayManager;
  let decisionsRepo: { findRecent: jest.Mock };
  let runsRepo: { create: jest.Mock; findAll: jest.Mock; findById: jest.Mock; countAll: jest.Mock };
  let casesRepo: {
    createMany: jest.Mock;
    findByRunId: jest.Mock;
    findSuspiciousByRunId: jest.Mock;
    findById: jest.Mock;
    review: jest.Mock;
  };
  let routingManager: { evaluateRoute: jest.Mock };

  beforeEach(() => {
    decisionsRepo = {
      findRecent: jest.fn().mockResolvedValue([mockDecision]),
    };
    runsRepo = {
      create: jest.fn().mockResolvedValue(mockRun),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      countAll: jest.fn().mockResolvedValue(0),
    };
    casesRepo = {
      createMany: jest.fn().mockImplementation(() => Promise.resolve()),
      findByRunId: jest.fn().mockResolvedValue([]),
      findSuspiciousByRunId: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      review: jest.fn(),
    };
    routingManager = {
      evaluateRoute: jest.fn().mockResolvedValue(mockNewDecisionResult),
    };
    manager = new ReplayManager(
      decisionsRepo as unknown as RoutingDecisionsRepository,
      runsRepo as unknown as ReplayRunsRepository,
      casesRepo as unknown as ReplayCasesRepository,
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
    decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, confidence: null }]);

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
        message: mockDecision.messageContent,
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

  describe('saveRun: false (default)', () => {
    it('should NOT call runsRepository.create when saveRun is not set', async () => {
      await manager.replayDecisions({ limit: 50 });

      expect(runsRepo.create).not.toHaveBeenCalled();
      expect(casesRepo.createMany).not.toHaveBeenCalled();
    });

    it('should NOT call runsRepository.create when saveRun is explicitly false', async () => {
      await manager.replayDecisions({ limit: 50, saveRun: false });

      expect(runsRepo.create).not.toHaveBeenCalled();
      expect(casesRepo.createMany).not.toHaveBeenCalled();
    });

    it('should return result without runId when saveRun is false', async () => {
      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.runId).toBeUndefined();
    });
  });

  describe('saveRun: true', () => {
    it('should call runsRepository.create when saveRun is true', async () => {
      await manager.replayDecisions({ limit: 50, saveRun: true });

      expect(runsRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should call casesRepository.createMany with mapped case data when saveRun is true', async () => {
      await manager.replayDecisions({ limit: 50, saveRun: true });

      expect(casesRepo.createMany).toHaveBeenCalledTimes(1);
      const [[allCases]] = casesRepo.createMany.mock.calls as [[unknown[]]];
      const firstCase = allCases[0];
      expect(firstCase).toMatchObject({
        runId: 'run-1',
        oldProvider: 'anthropic',
        oldModel: 'claude-sonnet-4',
        newProvider: 'openai',
        newModel: 'gpt-4o',
        changed: true,
      });
    });

    it('should set runId on batch result when saveRun is true', async () => {
      const result = await manager.replayDecisions({ limit: 50, saveRun: true });

      expect(result.runId).toBe('run-1');
    });

    it('should pass runName to runsRepository.create when provided', async () => {
      await manager.replayDecisions({ limit: 50, saveRun: true, runName: 'My Test Run' });

      expect(runsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Test Run' }),
      );
    });

    it('should pass correct aggregate stats to runsRepository.create', async () => {
      await manager.replayDecisions({ limit: 50, saveRun: true });

      expect(runsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalReplayed: 1,
          changedCount: 1,
        }),
      );
    });
  });

  describe('hasOriginalContent', () => {
    it('should set hasOriginalContent to true when messageContent has text', async () => {
      decisionsRepo.findRecent.mockResolvedValue([
        { ...mockDecision, messageContent: 'Write a Python function' },
      ]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.hasOriginalContent).toBe(true);
    });

    it('should set hasOriginalContent to false when messageContent is null', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: null }]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.hasOriginalContent).toBe(false);
    });

    it('should set hasOriginalContent to false when messageContent is empty string', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: '' }]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.hasOriginalContent).toBe(false);
    });

    it('should set hasOriginalContent to false when messageContent is whitespace only', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: '   ' }]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.hasOriginalContent).toBe(false);
    });

    it('should use empty string as message when messageContent is null', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: null }]);

      await manager.replayDecisions({ limit: 50 });

      expect(routingManager.evaluateRoute).toHaveBeenCalledWith(
        expect.objectContaining({ message: '' }),
      );
    });
  });

  describe('outcomeLabel field', () => {
    it('should include outcomeLabel on each result', async () => {
      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.outcomeLabel).toBeDefined();
    });
  });

  describe('isSuspicious field', () => {
    it('should set isSuspicious false when no suspicious reasons', async () => {
      const result = await manager.replayDecisions({ limit: 50 });

      const first = result.results[0]!;
      expect(first.suspiciousReasons).toBeInstanceOf(Array);
      expect(first.isSuspicious).toBe(first.suspiciousReasons.length > 0);
    });

    it('should set isSuspicious true and include empty_message_content when messageContent is null', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: null }]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.results[0]!.isSuspicious).toBe(true);
      expect(result.results[0]!.suspiciousReasons).toContain('empty_message_content');
    });
  });

  describe('suspiciousCount and labelBreakdown aggregation', () => {
    it('should count suspicious results in suspiciousCount', async () => {
      decisionsRepo.findRecent.mockResolvedValue([{ ...mockDecision, messageContent: null }]);

      const result = await manager.replayDecisions({ limit: 50 });

      expect(result.suspiciousCount).toBe(1);
    });

    it('should populate labelBreakdown with correct counts', async () => {
      const result = await manager.replayDecisions({ limit: 50 });

      const total =
        result.labelBreakdown.correctImprovement +
        result.labelBreakdown.badRegression +
        result.labelBreakdown.costWin +
        result.labelBreakdown.qualityWin +
        result.labelBreakdown.uncertain;

      expect(total).toBe(result.totalReplayed);
    });
  });
});
