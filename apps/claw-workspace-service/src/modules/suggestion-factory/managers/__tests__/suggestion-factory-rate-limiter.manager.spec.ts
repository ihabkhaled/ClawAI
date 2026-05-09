import { SuggestionFactoryRateLimiterManager } from '../suggestion-factory-rate-limiter.manager';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
  process.env['WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR'] = '3';
});

describe('SuggestionFactoryRateLimiterManager (13.3)', () => {
  let manager: SuggestionFactoryRateLimiterManager;

  beforeEach(() => {
    manager = new SuggestionFactoryRateLimiterManager();
  });

  it('allows reservations under cap', () => {
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(true);
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(true);
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(true);
  });

  it('rejects when at cap', () => {
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(false);
  });

  it('separates buckets per event type', () => {
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    // Other event type should still be allowed.
    expect(manager.tryReserve('webhook.jira.issue_updated')).toBe(true);
    expect(manager.tryReserve('webhook.jira.issue_updated')).toBe(true);
    expect(manager.tryReserve('webhook.jira.issue_updated')).toBe(true);
    expect(manager.tryReserve('webhook.jira.issue_updated')).toBe(false);
  });

  it('reset clears all buckets', () => {
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(false);
    manager.reset();
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(true);
  });

  it('drops timestamps older than 1 hour from the bucket', () => {
    const now = Date.now();
    const realNow = Date.now;
    Date.now = jest.fn(() => now);
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    manager.tryReserve('webhook.github.pull_request');
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(false);

    // Advance time by > 1 hour — old timestamps should expire and we have full headroom.
    Date.now = jest.fn(() => now + 60 * 60 * 1000 + 1);
    expect(manager.tryReserve('webhook.github.pull_request')).toBe(true);

    Date.now = realNow;
  });
});
