import { AdaptiveLearningManager } from '../managers/adaptive-learning.manager';
import { type RoutingDecisionsRepository } from '../repositories/routing-decisions.repository';
import { RoutingMode } from '../../../generated/prisma';

const makeDecision = (
  overrides: Partial<{
    id: string;
    selectedProvider: string;
    routingMode: RoutingMode;
    confidence: number | null;
    reasonTags: string[];
    fallbackProvider: string | null;
  }> = {},
) => ({
  id: overrides.id ?? 'decision-1',
  messageId: 'msg-1',
  threadId: 'thread-1',
  messageContent: 'Hello world',
  selectedProvider: overrides.selectedProvider ?? 'anthropic',
  selectedModel: 'claude-sonnet-4',
  routingMode: overrides.routingMode ?? RoutingMode.AUTO,
  confidence: overrides.confidence !== undefined ? overrides.confidence : 0.8,
  reasonTags: overrides.reasonTags ?? ['auto'],
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackProvider: overrides.fallbackProvider !== undefined ? overrides.fallbackProvider : null,
  fallbackModel: null,
  createdAt: new Date(),
});

describe('AdaptiveLearningManager', () => {
  let manager: AdaptiveLearningManager;
  let decisionsRepo: { findInWindow: jest.Mock };

  beforeEach(() => {
    decisionsRepo = { findInWindow: jest.fn() };
    manager = new AdaptiveLearningManager(decisionsRepo as unknown as RoutingDecisionsRepository);
  });

  it('returns correct totalDecisions count', async () => {
    const decisions = [makeDecision({ id: '1' }), makeDecision({ id: '2' })];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    expect(result.totalDecisions).toBe(2);
  });

  it('groups providerInsights correctly by provider', async () => {
    const decisions = [
      makeDecision({ id: '1', selectedProvider: 'anthropic' }),
      makeDecision({ id: '2', selectedProvider: 'openai' }),
      makeDecision({ id: '3', selectedProvider: 'anthropic' }),
    ];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    const anthropic = result.providerInsights.find((p) => p.provider === 'anthropic');
    const openai = result.providerInsights.find((p) => p.provider === 'openai');
    expect(anthropic?.totalDecisions).toBe(2);
    expect(openai?.totalDecisions).toBe(1);
  });

  it('computes fallbackRate as fallbackCount/total', async () => {
    const decisions = [
      makeDecision({ id: '1', selectedProvider: 'anthropic', fallbackProvider: 'openai' }),
      makeDecision({ id: '2', selectedProvider: 'anthropic', fallbackProvider: null }),
      makeDecision({ id: '3', selectedProvider: 'anthropic', fallbackProvider: null }),
    ];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    const anthropic = result.providerInsights.find((p) => p.provider === 'anthropic');
    expect(anthropic?.fallbackCount).toBe(1);
    expect(anthropic?.fallbackRate).toBeCloseTo(1 / 3);
  });

  it('computes avgConfidence correctly', async () => {
    const decisions = [
      makeDecision({ id: '1', confidence: 0.6 }),
      makeDecision({ id: '2', confidence: 1.0 }),
    ];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    expect(result.avgConfidence).toBeCloseTo(0.8);
  });

  it('computes modeInsights with correct percentages', async () => {
    const decisions = [
      makeDecision({ id: '1', routingMode: RoutingMode.AUTO }),
      makeDecision({ id: '2', routingMode: RoutingMode.AUTO }),
      makeDecision({ id: '3', routingMode: RoutingMode.LOCAL_ONLY }),
    ];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    const autoMode = result.modeInsights.find((m) => m.routingMode === 'AUTO');
    const localMode = result.modeInsights.find((m) => m.routingMode === 'LOCAL_ONLY');
    expect(autoMode?.count).toBe(2);
    expect(autoMode?.percentage).toBeCloseTo(2 / 3);
    expect(localMode?.count).toBe(1);
    expect(localMode?.percentage).toBeCloseTo(1 / 3);
  });

  it('returns topReasonTags from flattened arrays', async () => {
    const decisions = [
      makeDecision({ id: '1', reasonTags: ['auto', 'coding'] }),
      makeDecision({ id: '2', reasonTags: ['auto', 'privacy'] }),
      makeDecision({ id: '3', reasonTags: ['coding'] }),
    ];
    decisionsRepo.findInWindow.mockResolvedValue(decisions);

    const result = await manager.computeInsights(30);

    expect(result.topReasonTags[0]).toBe('auto');
    expect(result.topReasonTags).toContain('coding');
    expect(result.topReasonTags).toContain('privacy');
  });

  it('returns empty arrays when no decisions', async () => {
    decisionsRepo.findInWindow.mockResolvedValue([]);

    const result = await manager.computeInsights(30);

    expect(result.totalDecisions).toBe(0);
    expect(result.providerInsights).toEqual([]);
    expect(result.modeInsights).toEqual([]);
    expect(result.topReasonTags).toEqual([]);
    expect(result.avgConfidence).toBe(0);
  });

  it('passes windowDays parameter to repository', async () => {
    decisionsRepo.findInWindow.mockResolvedValue([]);

    await manager.computeInsights(14);

    expect(decisionsRepo.findInWindow).toHaveBeenCalledWith(14);
  });
});
