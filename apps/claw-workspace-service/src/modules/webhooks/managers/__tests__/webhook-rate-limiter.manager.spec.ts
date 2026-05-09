import { WebhookRateLimiterManager } from '../webhook-rate-limiter.manager';

beforeAll(() => {
  process.env['WORKSPACE_DATABASE_URL'] = 'postgres://localhost/test';
  process.env['REDIS_URL'] = 'redis://localhost:6379';
  process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
  process.env['JWT_SECRET'] = 'a'.repeat(32);
  process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
  process.env['WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE'] = '3';
});

describe('WebhookRateLimiterManager (11.4)', () => {
  let manager: WebhookRateLimiterManager;

  beforeEach(() => {
    manager = new WebhookRateLimiterManager();
  });

  it('admits up to N requests per connector', () => {
    expect(manager.tryReserve('conn-1')).toBe(true);
    expect(manager.tryReserve('conn-1')).toBe(true);
    expect(manager.tryReserve('conn-1')).toBe(true);
  });

  it('rejects when over cap', () => {
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    expect(manager.tryReserve('conn-1')).toBe(false);
  });

  it('separate connectors have independent buckets', () => {
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    expect(manager.tryReserve('conn-1')).toBe(false);
    expect(manager.tryReserve('conn-2')).toBe(true);
    expect(manager.tryReserve('conn-2')).toBe(true);
    expect(manager.tryReserve('conn-2')).toBe(true);
    expect(manager.tryReserve('conn-2')).toBe(false);
  });

  it('drops timestamps older than 1 minute', () => {
    const realNow = Date.now;
    const t0 = 1_700_000_000_000;
    Date.now = jest.fn(() => t0);
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    manager.tryReserve('conn-1');
    expect(manager.tryReserve('conn-1')).toBe(false);

    Date.now = jest.fn(() => t0 + 60 * 1000 + 1);
    expect(manager.tryReserve('conn-1')).toBe(true);

    Date.now = realNow;
  });
});
