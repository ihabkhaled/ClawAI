import { type Mock } from 'vitest';
import { type RedisService } from '../../../../infrastructure/redis/redis.service';
import { type UsersRepository } from '../../../users/repositories/users.repository';
import { UserPresenceService } from '../user-presence.service';

describe('UserPresenceService.touch', () => {
  const NOW = new Date('2026-10-31T12:00:00.000Z');
  let set: Mock;
  let touchLastSeen: Mock;
  let service: UserPresenceService;

  beforeEach(() => {
    set = vi.fn().mockResolvedValue('OK');
    touchLastSeen = vi.fn().mockResolvedValue(1);
    service = new UserPresenceService(
      { getClient: () => ({ set }) } as unknown as RedisService,
      { touchLastSeen } as unknown as UsersRepository,
    );
  });

  it('claims a 60 second key (SET NX EX) and then writes lastSeenAt', async () => {
    await expect(service.touch('u1', NOW)).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith('auth:presence-touch:u1', '1', 'EX', 60, 'NX');
    expect(touchLastSeen).toHaveBeenCalledWith('u1', NOW, new Date(NOW.getTime() - 60_000));
  });

  it('does not touch the database when the key is already claimed (at most once per 60 s)', async () => {
    set.mockResolvedValue(null);
    await expect(service.touch('u1', NOW)).resolves.toBe(false);
    expect(touchLastSeen).not.toHaveBeenCalled();
  });

  it('falls back to the SQL-guarded write when Redis is down', async () => {
    set.mockRejectedValue(new Error('redis down'));
    await expect(service.touch('u1', NOW)).resolves.toBe(true);
    expect(touchLastSeen).toHaveBeenCalledTimes(1);
  });

  it('reports false when the SQL guard says the row is fresh', async () => {
    touchLastSeen.mockResolvedValue(0);
    await expect(service.touch('u1', NOW)).resolves.toBe(false);
  });

  it('never throws, even when both Redis and the database fail', async () => {
    set.mockRejectedValue(new Error('redis down'));
    touchLastSeen.mockRejectedValue(new Error('db down'));
    await expect(service.touch('u1', NOW)).resolves.toBe(false);
  });
});
