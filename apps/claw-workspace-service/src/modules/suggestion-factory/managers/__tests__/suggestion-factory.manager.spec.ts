import { SuggestionFactoryManager } from '../suggestion-factory.manager';
import type { WorkspaceEventInput } from '../../types/suggestion-factory.types';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
});

describe('SuggestionFactoryManager — rate limiter integration (13.3)', () => {
  const baseEvent: WorkspaceEventInput = {
    eventType: 'webhook.jira.issue_updated',
    provider: null,
    connectorId: null,
    userId: 'u1',
    body: { foo: 'bar' },
  };

  const makeRuleRepo = (rules: unknown[]): { findActiveByEvent: jest.Mock } => ({
    findActiveByEvent: jest.fn().mockResolvedValue(rules),
  });
  const makeApproval = (): { enqueueSuggestion: jest.Mock } => ({
    enqueueSuggestion: jest.fn().mockResolvedValue({ queueId: 'q1' }),
  });
  const makeRabbit = (): { publish: jest.Mock } => ({
    publish: jest.fn().mockImplementation(async () => {}),
  });
  const makeAlwaysAllow = (): { tryReserve: jest.Mock } => ({
    tryReserve: jest.fn().mockReturnValue(true),
  });
  const makeAlwaysDeny = (): { tryReserve: jest.Mock } => ({
    tryReserve: jest.fn().mockReturnValue(false),
  });

  it('skips rule evaluation entirely when rate-limited', async () => {
    const repo = makeRuleRepo([
      {
        id: 'r1',
        name: 'never-reached',
        eventType: 'webhook.jira.issue_updated',
        providerRegex: '.*',
        contentRegex: '.*',
        actionKindToSuggest: 'SUMMARIZE',
        priority: 0,
        isActive: true,
        isSystemDefault: false,
        description: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const approval = makeApproval();
    const manager = new SuggestionFactoryManager(
      repo as any,
      approval as any,
      makeRabbit() as any,
      makeAlwaysDeny() as any,
    );
    const result = await manager.process(baseEvent);
    expect(result.rateLimited).toBe(true);
    expect(result.matchedRules).toBe(0);
    expect(result.enqueuedCount).toBe(0);
    expect(repo.findActiveByEvent).not.toHaveBeenCalled();
    expect(approval.enqueueSuggestion).not.toHaveBeenCalled();
  });

  it('proceeds normally when rate limiter allows', async () => {
    const repo = makeRuleRepo([]);
    const approval = makeApproval();
    const manager = new SuggestionFactoryManager(
      repo as any,
      approval as any,
      makeRabbit() as any,
      makeAlwaysAllow() as any,
    );
    const result = await manager.process(baseEvent);
    expect(result.rateLimited).toBe(false);
    expect(repo.findActiveByEvent).toHaveBeenCalledWith('webhook.jira.issue_updated');
  });

  // Stream 13.3 v1.1 — per-rule cap honoured in addition to the global cap.
  it('skips a rule when its perRuleBudgetPerHour is hit', async () => {
    const repo = makeRuleRepo([
      {
        id: 'r-budget',
        name: 'rule-with-budget',
        eventType: 'webhook.jira.issue_updated',
        providerRegex: '.*',
        contentRegex: '.*',
        actionKindToSuggest: 'SUMMARIZE',
        priority: 0,
        isActive: true,
        isSystemDefault: false,
        description: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        perRuleBudgetPerHour: 5,
      },
    ]);
    const approval = makeApproval();
    const limiter = {
      tryReserve: jest.fn().mockReturnValue(true),
      tryReserveForRule: jest.fn().mockReturnValue(false), // rule-level cap hit
    };
    const manager = new SuggestionFactoryManager(
      repo as any,
      approval as any,
      makeRabbit() as any,
      limiter as any,
    );
    const result = await manager.process(baseEvent);
    expect(limiter.tryReserveForRule).toHaveBeenCalledWith('r-budget', 5);
    expect(approval.enqueueSuggestion).not.toHaveBeenCalled();
    expect(result.matchedRules).toBe(1);
    expect(result.enqueuedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
  });
});
