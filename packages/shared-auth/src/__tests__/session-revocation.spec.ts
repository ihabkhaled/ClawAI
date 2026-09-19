import { vi } from 'vitest';

import { isSessionRevoked, resetSessionRevocationClient } from '../session-revocation';

const { exists, on, quit, construct } = vi.hoisted(() => ({
  exists: vi.fn(),
  on: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
  construct: vi.fn(),
}));

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    exists = exists;
    on = on;
    quit = quit;
    constructor(url: string, options: unknown) {
      construct(url, options);
    }
  },
}));

describe('isSessionRevoked', () => {
  const originalUrl = process.env['REDIS_URL'];

  beforeEach(() => {
    vi.clearAllMocks();
    resetSessionRevocationClient();
    process.env['REDIS_URL'] = 'redis://redis:6379';
  });

  afterEach(() => {
    resetSessionRevocationClient();
    if (originalUrl === undefined) {
      delete process.env['REDIS_URL'];
    } else {
      process.env['REDIS_URL'] = originalUrl;
    }
  });

  it('is true for a session auth-service revoked', async () => {
    exists.mockResolvedValue(1);

    await expect(isSessionRevoked('session-1')).resolves.toBe(true);
    expect(exists).toHaveBeenCalledWith('auth:revoked-session:session-1');
  });

  it('is false for a session nobody revoked', async () => {
    exists.mockResolvedValue(0);

    await expect(isSessionRevoked('session-1')).resolves.toBe(false);
  });

  // Fail open, deliberately: Redis being unreachable must not sign every user
  // out of every service. The cost is the window this check exists to close,
  // which is what the behaviour was before it (TD-033).
  it('is false when Redis refuses the read', async () => {
    exists.mockRejectedValue(new Error('redis down'));

    await expect(isSessionRevoked('session-1')).resolves.toBe(false);
  });

  it('is false, and connects to nothing, without REDIS_URL', async () => {
    delete process.env['REDIS_URL'];
    resetSessionRevocationClient();

    await expect(isSessionRevoked('session-1')).resolves.toBe(false);
    expect(construct).not.toHaveBeenCalled();
  });

  it('reuses one connection across checks', async () => {
    exists.mockResolvedValue(0);

    await isSessionRevoked('session-1');
    await isSessionRevoked('session-2');

    expect(construct).toHaveBeenCalledOnce();
  });
});
