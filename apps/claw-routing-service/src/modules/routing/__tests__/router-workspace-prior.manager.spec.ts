import { RouterWorkspacePriorManager } from '../managers/router-workspace-prior.manager';
import {
  MAX_WORKSPACE_PRIOR_NUDGE,
  MIN_WORKSPACE_PRIOR_SAMPLE_SIZE,
} from '../constants/routing-education.constants';

const mockRepository = () => ({
  findWorkspacePrior: jest.fn(),
  upsertWorkspacePrior: jest.fn().mockImplementation((input) => Promise.resolve(input)),
});

const baseDecision = () => ({
  selectedProvider: 'ANTHROPIC',
  selectedModel: 'claude-sonnet-4',
  routingMode: 'AUTO' as never,
  confidence: 0.6,
  reasonTags: ['auto'],
  privacyClass: 'cloud',
  costClass: 'medium',
  fallbackChain: [],
  detectedCategory: 'coding',
});

describe('RouterWorkspacePriorManager.ingestOutcome', () => {
  it('creates a new prior at routeCount=1 for a first observation', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue(null);
    const manager = new RouterWorkspacePriorManager(repository as never);

    await manager.ingestOutcome({
      workspaceId: 'ws-1',
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      taskFamily: 'coding',
      executionSuccess: true,
    });

    expect(repository.upsertWorkspacePrior).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', routeCount: 1, successRate: 1 }),
    );
  });

  it('moves the running average toward each new observation', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 3,
      successRate: 1,
      confidenceInPrior: 0.3,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    await manager.ingestOutcome({
      workspaceId: 'ws-1',
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      taskFamily: 'coding',
      executionSuccess: false,
    });

    const call = repository.upsertWorkspacePrior.mock.calls[0][0];
    expect(call.routeCount).toBe(4);
    expect(call.successRate).toBeCloseTo(0.75, 5);
  });

  it('ramps confidenceInPrior toward 1.0 as routeCount grows, never past it', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 50,
      successRate: 0.9,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    await manager.ingestOutcome({
      workspaceId: 'ws-1',
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      taskFamily: 'coding',
      executionSuccess: true,
    });

    const call = repository.upsertWorkspacePrior.mock.calls[0][0];
    expect(call.confidenceInPrior).toBe(1);
  });
});

describe('RouterWorkspacePriorManager.resolveNudge', () => {
  it('does not apply when the decision context carries no workspaceId (100% of current traffic)', async () => {
    const repository = mockRepository();
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge({ message: 'hi' }, baseDecision());

    expect(result.applied).toBe(false);
    expect(result.confidence).toBe(baseDecision().confidence);
    expect(repository.findWorkspacePrior).not.toHaveBeenCalled();
  });

  it('does not apply to an UNAVAILABLE decision', async () => {
    const repository = mockRepository();
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      { ...baseDecision(), selectedProvider: 'UNAVAILABLE' },
    );

    expect(result.applied).toBe(false);
    expect(repository.findWorkspacePrior).not.toHaveBeenCalled();
  });

  it('cold-start: falls back to the unmodified decision when no prior exists yet', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue(null);
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      baseDecision(),
    );

    expect(result.applied).toBe(false);
    expect(result.confidence).toBe(baseDecision().confidence);
  });

  it('overfit guard: does not apply below MIN_WORKSPACE_PRIOR_SAMPLE_SIZE even with a strong signal', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: MIN_WORKSPACE_PRIOR_SAMPLE_SIZE - 1,
      successRate: 1,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      baseDecision(),
    );

    expect(result.applied).toBe(false);
  });

  it('applies a bounded upward nudge when a well-sampled prior disagrees favorably', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 20,
      successRate: 1,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      baseDecision(),
    );

    expect(result.applied).toBe(true);
    expect(result.confidence).toBeGreaterThan(baseDecision().confidence);
    expect(result.confidence - baseDecision().confidence).toBeLessThanOrEqual(
      MAX_WORKSPACE_PRIOR_NUDGE + 1e-9,
    );
  });

  it('applies a bounded downward nudge when a well-sampled prior disagrees unfavorably', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 20,
      successRate: 0,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      baseDecision(),
    );

    expect(result.applied).toBe(true);
    expect(result.confidence).toBeLessThan(baseDecision().confidence);
  });

  it('never touches selectedProvider/selectedModel — only confidence is in its return shape', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 20,
      successRate: 1,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      baseDecision(),
    );

    expect(Object.keys(result).sort()).toEqual(['applied', 'confidence']);
  });

  it('tenant isolation: looks the prior up scoped to the exact workspaceId in context, never a different one', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue(null);
    const manager = new RouterWorkspacePriorManager(repository as never);

    await manager.resolveNudge({ message: 'hi', workspaceId: 'ws-target' }, baseDecision());

    expect(repository.findWorkspacePrior).toHaveBeenCalledWith(
      'ws-target',
      'ANTHROPIC',
      'claude-sonnet-4',
      'coding',
    );
  });

  it('clamps confidence to [0, 1] even under an extreme prior', async () => {
    const repository = mockRepository();
    repository.findWorkspacePrior.mockResolvedValue({
      routeCount: 1000,
      successRate: 1,
      confidenceInPrior: 1,
    });
    const manager = new RouterWorkspacePriorManager(repository as never);

    const result = await manager.resolveNudge(
      { message: 'hi', workspaceId: 'ws-1' },
      { ...baseDecision(), confidence: 0.99 },
    );

    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});
