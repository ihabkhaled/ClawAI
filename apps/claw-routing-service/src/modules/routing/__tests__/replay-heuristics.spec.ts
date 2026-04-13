import { ReplayManager } from '../managers/replay.manager';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { type ReplayRunsRepository } from '../repositories/replay-runs.repository';
import { type ReplayCasesRepository } from '../repositories/replay-cases.repository';
import { type RoutingManager } from '../managers/routing.manager';
import { ReplayOutcomeLabel } from '../../../common/enums/replay-outcome-label.enum';
import { RoutingMode } from '../../../generated/prisma';

const makeDecision = (
  overrides: Partial<{
    confidence: number | null;
    costClass: string | null;
    messageContent: string | null;
    selectedProvider: string;
    selectedModel: string;
  }> = {},
) => ({
  id: 'decision-1',
  messageId: 'msg-1',
  threadId: 'thread-1',
  messageContent: 'Explain merge sort',
  selectedProvider: 'anthropic',
  selectedModel: 'claude-sonnet-4',
  routingMode: RoutingMode.AUTO,
  confidence: 0.7,
  reasonTags: ['auto'],
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackProvider: null,
  fallbackModel: null,
  createdAt: new Date(),
  ...overrides,
});

const makeReplayResult = (
  overrides: Partial<{
    confidence: number;
    costClass: string;
    selectedProvider: string;
    selectedModel: string;
  }> = {},
) => ({
  selectedProvider: 'openai',
  selectedModel: 'gpt-4o',
  routingMode: RoutingMode.AUTO,
  confidence: 0.8,
  reasonTags: ['auto'],
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackChain: [],
  detectedCategory: 'general',
  estimatedCostPer1M: 5,
  latencySlaMs: 3000,
  ...overrides,
});

describe('ReplayManager — heuristics via public interface', () => {
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
    decisionsRepo = { findRecent: jest.fn() };
    runsRepo = {
      create: jest.fn(),
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
    routingManager = { evaluateRoute: jest.fn() };
    manager = new ReplayManager(
      decisionsRepo as unknown as RoutingDecisionsRepository,
      runsRepo as unknown as ReplayRunsRepository,
      casesRepo as unknown as ReplayCasesRepository,
      routingManager as unknown as RoutingManager,
    );
  });

  const run = async (
    decisionOverrides: Parameters<typeof makeDecision>[0],
    replayOverrides: Parameters<typeof makeReplayResult>[0],
  ) => {
    decisionsRepo.findRecent.mockResolvedValue([makeDecision(decisionOverrides)]);
    routingManager.evaluateRoute.mockResolvedValue(makeReplayResult(replayOverrides));
    const batch = await manager.replayDecisions({ limit: 50 });
    return batch.results[0]!;
  };

  // ---------------------------------------------------------------------------
  // outcomeLabel
  // ---------------------------------------------------------------------------

  describe('outcomeLabel: QUALITY_WIN', () => {
    it('assigns QUALITY_WIN when confidence improves by >= 0.15 (0.5 → 0.7)', async () => {
      const result = await run({ confidence: 0.5 }, { confidence: 0.7 });

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.QUALITY_WIN);
    });

    it('assigns QUALITY_WIN when confidence improves by exactly 0.15 (0.6 → 0.75)', async () => {
      const result = await run({ confidence: 0.6 }, { confidence: 0.75 });

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.QUALITY_WIN);
    });

    it('assigns QUALITY_WIN when confidence improves by more than 0.15 (0.4 → 0.8)', async () => {
      const result = await run({ confidence: 0.4 }, { confidence: 0.8 });

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.QUALITY_WIN);
    });
  });

  describe('outcomeLabel: BAD_REGRESSION', () => {
    it('assigns BAD_REGRESSION when confidence drops by >= 0.1 (0.8 → 0.65)', async () => {
      const result = await run({ confidence: 0.8 }, { confidence: 0.65 });

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.BAD_REGRESSION);
    });

    it('assigns BAD_REGRESSION when confidence drops by more than 0.1 (0.8 → 0.68)', async () => {
      const result = await run({ confidence: 0.8 }, { confidence: 0.68 });

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.BAD_REGRESSION);
    });

    it('assigns BAD_REGRESSION when cost worsened (low → high) even with small confidence gain', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'low' },
        { confidence: 0.73, costClass: 'high' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.BAD_REGRESSION);
    });

    it('assigns BAD_REGRESSION when cost worsened (medium → high) with no confidence change', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'medium' },
        { confidence: 0.7, costClass: 'high' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.BAD_REGRESSION);
    });
  });

  describe('outcomeLabel: COST_WIN', () => {
    it('assigns COST_WIN when cost lowers (high → low) and confidence not significantly dropped', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'high' },
        { confidence: 0.69, costClass: 'low' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.COST_WIN);
    });

    it('assigns COST_WIN when cost lowers (medium → free) and confidence is unchanged', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'medium' },
        { confidence: 0.7, costClass: 'free' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.COST_WIN);
    });

    it('assigns COST_WIN when cost lowers (high → medium) and confidence same', async () => {
      const result = await run(
        { confidence: 0.6, costClass: 'high' },
        { confidence: 0.6, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.COST_WIN);
    });
  });

  describe('outcomeLabel: CORRECT_IMPROVEMENT', () => {
    it('assigns CORRECT_IMPROVEMENT when confidence improves by 0.05-0.14 and cost unchanged (0.6 → 0.7)', async () => {
      const result = await run(
        { confidence: 0.6, costClass: 'medium' },
        { confidence: 0.7, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.CORRECT_IMPROVEMENT);
    });

    it('assigns CORRECT_IMPROVEMENT when confidence improves by exactly 0.05 and cost unchanged', async () => {
      const result = await run(
        { confidence: 0.6, costClass: 'medium' },
        { confidence: 0.65, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.CORRECT_IMPROVEMENT);
    });

    it('assigns CORRECT_IMPROVEMENT when confidence improves by 0.1 and cost unchanged', async () => {
      const result = await run(
        { confidence: 0.6, costClass: 'low' },
        { confidence: 0.7, costClass: 'low' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.CORRECT_IMPROVEMENT);
    });
  });

  describe('outcomeLabel: UNCERTAIN', () => {
    it('assigns UNCERTAIN when confidence change is small and no other signal (0.7 → 0.72)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'medium' },
        { confidence: 0.72, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.UNCERTAIN);
    });

    it('assigns UNCERTAIN when confidence is unchanged and cost unchanged', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'medium' },
        { confidence: 0.7, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.UNCERTAIN);
    });

    it('assigns UNCERTAIN for mixed small signals (tiny conf gain, cost unchanged)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'medium' },
        { confidence: 0.72, costClass: 'medium' },
      );

      expect(result.outcomeLabel).toBe(ReplayOutcomeLabel.UNCERTAIN);
    });
  });

  // ---------------------------------------------------------------------------
  // isSuspicious / suspiciousReasons
  // ---------------------------------------------------------------------------

  describe('suspiciousReasons: empty_message_content', () => {
    it('adds empty_message_content when messageContent is null', async () => {
      const result = await run({ messageContent: null }, {});

      expect(result.suspiciousReasons).toContain('empty_message_content');
      expect(result.isSuspicious).toBe(true);
    });

    it('adds empty_message_content when messageContent is empty string', async () => {
      const result = await run({ messageContent: '' }, {});

      expect(result.suspiciousReasons).toContain('empty_message_content');
      expect(result.isSuspicious).toBe(true);
    });

    it('does NOT add empty_message_content when messageContent has text', async () => {
      const result = await run({ messageContent: 'Tell me a joke' }, {});

      expect(result.suspiciousReasons).not.toContain('empty_message_content');
    });
  });

  describe('suspiciousReasons: large_confidence_drop', () => {
    it('adds large_confidence_drop when new confidence < old - 0.2 (0.9 → 0.65)', async () => {
      const result = await run({ confidence: 0.9 }, { confidence: 0.65 });

      expect(result.suspiciousReasons).toContain('large_confidence_drop');
      expect(result.isSuspicious).toBe(true);
    });

    it('adds large_confidence_drop when drop is exactly 0.2 (0.8 → 0.6)', async () => {
      const result = await run({ confidence: 0.8 }, { confidence: 0.6 });

      expect(result.suspiciousReasons).toContain('large_confidence_drop');
    });

    it('does NOT add large_confidence_drop for a small drop (0.8 → 0.65)', async () => {
      const result = await run({ confidence: 0.8 }, { confidence: 0.65 });

      expect(result.suspiciousReasons).not.toContain('large_confidence_drop');
    });

    it('does NOT add large_confidence_drop when confidence improves', async () => {
      const result = await run({ confidence: 0.5 }, { confidence: 0.9 });

      expect(result.suspiciousReasons).not.toContain('large_confidence_drop');
    });
  });

  describe('suspiciousReasons: large_cost_increase', () => {
    it('adds large_cost_increase when cost rank jumps by >= 2 (free → high, 3 ranks)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'free' },
        { confidence: 0.7, costClass: 'high' },
      );

      expect(result.suspiciousReasons).toContain('large_cost_increase');
      expect(result.isSuspicious).toBe(true);
    });

    it('adds large_cost_increase when cost rank jumps by exactly 2 (low → high)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'low' },
        { confidence: 0.7, costClass: 'high' },
      );

      expect(result.suspiciousReasons).toContain('large_cost_increase');
    });

    it('adds large_cost_increase when cost rank jumps by 2 (free → medium)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'free' },
        { confidence: 0.7, costClass: 'medium' },
      );

      expect(result.suspiciousReasons).toContain('large_cost_increase');
    });

    it('does NOT add large_cost_increase for a 1-rank jump (low → medium)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'low' },
        { confidence: 0.7, costClass: 'medium' },
      );

      expect(result.suspiciousReasons).not.toContain('large_cost_increase');
    });

    it('does NOT add large_cost_increase when cost improves (high → low)', async () => {
      const result = await run(
        { confidence: 0.7, costClass: 'high' },
        { confidence: 0.7, costClass: 'low' },
      );

      expect(result.suspiciousReasons).not.toContain('large_cost_increase');
    });
  });

  describe('suspiciousReasons: route_changed_with_negative_improvement', () => {
    it('adds reason when route changed AND improvementScore < 0', async () => {
      const result = await run(
        {
          confidence: 0.9,
          costClass: 'low',
          selectedProvider: 'anthropic',
          selectedModel: 'claude-sonnet-4',
        },
        { confidence: 0.5, costClass: 'high', selectedProvider: 'openai', selectedModel: 'gpt-4o' },
      );

      expect(result.changed).toBe(true);
      expect(result.improvementScore).toBeLessThan(0);
      expect(result.suspiciousReasons).toContain('route_changed_with_negative_improvement');
    });

    it('does NOT add reason when route did NOT change even with negative improvement', async () => {
      const result = await run(
        { confidence: 0.9, selectedProvider: 'openai', selectedModel: 'gpt-4o' },
        { confidence: 0.5, selectedProvider: 'openai', selectedModel: 'gpt-4o' },
      );

      expect(result.changed).toBe(false);
      expect(result.suspiciousReasons).not.toContain('route_changed_with_negative_improvement');
    });

    it('does NOT add reason when route changed but improvementScore is >= 0', async () => {
      const result = await run(
        { confidence: 0.5, selectedProvider: 'anthropic', selectedModel: 'claude-sonnet-4' },
        { confidence: 0.9, selectedProvider: 'openai', selectedModel: 'gpt-4o' },
      );

      expect(result.changed).toBe(true);
      expect(result.improvementScore).toBeGreaterThanOrEqual(0);
      expect(result.suspiciousReasons).not.toContain('route_changed_with_negative_improvement');
    });
  });

  describe('multiple suspicious reasons simultaneously', () => {
    it('can set empty_message_content and large_confidence_drop at the same time', async () => {
      const result = await run({ messageContent: null, confidence: 0.9 }, { confidence: 0.6 });

      expect(result.suspiciousReasons).toContain('empty_message_content');
      expect(result.suspiciousReasons).toContain('large_confidence_drop');
      expect(result.suspiciousReasons.length).toBeGreaterThanOrEqual(2);
      expect(result.isSuspicious).toBe(true);
    });

    it('can set empty_message_content and large_cost_increase and route_changed_with_negative_improvement', async () => {
      const result = await run(
        {
          messageContent: null,
          confidence: 0.8,
          costClass: 'free',
          selectedProvider: 'anthropic',
          selectedModel: 'claude-sonnet-4',
        },
        {
          confidence: 0.4,
          costClass: 'high',
          selectedProvider: 'openai',
          selectedModel: 'gpt-4o',
        },
      );

      expect(result.suspiciousReasons).toContain('empty_message_content');
      expect(result.suspiciousReasons).toContain('large_cost_increase');
      expect(result.isSuspicious).toBe(true);
    });
  });

  describe('no suspicious reasons for clean improvement', () => {
    it('returns empty suspiciousReasons and isSuspicious false for a clean quality win', async () => {
      const result = await run(
        { messageContent: 'What is 2 + 2?', confidence: 0.5, costClass: 'medium' },
        { confidence: 0.85, costClass: 'low' },
      );

      expect(result.suspiciousReasons).toHaveLength(0);
      expect(result.isSuspicious).toBe(false);
    });

    it('returns empty suspiciousReasons for no change at all', async () => {
      const result = await run(
        {
          messageContent: 'Hello',
          confidence: 0.7,
          costClass: 'medium',
          selectedProvider: 'openai',
          selectedModel: 'gpt-4o',
        },
        {
          confidence: 0.7,
          costClass: 'medium',
          selectedProvider: 'openai',
          selectedModel: 'gpt-4o',
        },
      );

      expect(result.suspiciousReasons).toHaveLength(0);
      expect(result.isSuspicious).toBe(false);
    });
  });
});
