import { vi } from 'vitest';

import { FeedbackRateLimitRepository } from '../feedback-rate-limit.repository';

import type { RedisService } from '../../../../infrastructure/redis/redis.service';

function setup(impl: () => Promise<number>): {
  repository: FeedbackRateLimitRepository;
  incrementWindow: ReturnType<typeof vi.fn>;
} {
  const incrementWindow = vi.fn(impl);
  const repository = new FeedbackRateLimitRepository({
    incrementWindow,
  } as unknown as RedisService);
  return { repository, incrementWindow };
}

describe('FeedbackRateLimitRepository', () => {
  it('counts an address under a hashed, namespaced key for one hour', async () => {
    const { repository, incrementWindow } = setup(async () => 2);
    await expect(repository.hitIp('203.0.113.7')).resolves.toBe(2);
    const [key, window] = incrementWindow.mock.calls[0] as [string, number];
    expect(key).toMatch(/^feedback:public:ip:[0-9a-f]{32}$/);
    expect(key).not.toContain('203.0.113.7');
    expect(window).toBe(3600);
  });

  it('counts an email case-insensitively without storing it', async () => {
    const { repository, incrementWindow } = setup(async () => 1);
    await repository.hitEmail('Ada@Example.com');
    await repository.hitEmail('ada@example.com');
    const [first] = incrementWindow.mock.calls[0] as [string];
    const [second] = incrementWindow.mock.calls[1] as [string];
    expect(first).toBe(second);
    expect(first).toMatch(/^feedback:public:email:/);
    expect(first.toLowerCase()).not.toContain('ada');
  });

  it('fails open when Redis is unreachable', async () => {
    const { repository } = setup(async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(repository.hitIp('203.0.113.7')).resolves.toBe(0);
    await expect(repository.hitEmail('a@b.co')).resolves.toBe(0);
  });
});
