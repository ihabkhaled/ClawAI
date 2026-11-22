import { ConflictException, NotFoundException } from '@nestjs/common';

import { DeletionService } from '../deletion.service';
import { AccountDeletionConsumer } from '../../consumers/account-deletion.consumer';

function build() {
  const repository = {
    findOwnedSession: vi.fn(),
    deleteForScope: vi
      .fn()
      .mockResolvedValue({ sessionsDeleted: 2, skippedActive: 1, tombstonedRunIds: ['r1', 'r2'] }),
  };
  const redis = { del: vi.fn().mockResolvedValue(2) };
  return { repository, redis, service: new DeletionService(repository as never, redis as never) };
}

describe('DeletionService', () => {
  it('deletes all detached history, reports skipped active sessions and clears replay buffers after commit', async () => {
    const { service, repository, redis } = build();
    const summary = await service.deleteAllHistory('u1');
    expect(summary).toEqual({ sessionsDeleted: 2, skippedActive: 1, runsDeleted: 2 });
    expect(repository.deleteForScope).toHaveBeenCalledWith({
      userId: 'u1',
      includeActive: false,
      purgeBillingState: false,
    });
    expect(redis.del).toHaveBeenCalledWith('claw:live:replay:r1', 'claw:live:replay:r2');
    expect(repository.deleteForScope.mock.invocationCallOrder[0]).toBeLessThan(
      redis.del.mock.invocationCallOrder[0]!,
    );
  });

  it('does not touch Redis when no run was tombstoned, and survives a Redis failure', async () => {
    const { service, repository, redis } = build();
    repository.deleteForScope.mockResolvedValue({
      sessionsDeleted: 1,
      skippedActive: 0,
      tombstonedRunIds: [],
    });
    await service.deleteAllHistory('u1');
    expect(redis.del).not.toHaveBeenCalled();
    repository.deleteForScope.mockResolvedValue({
      sessionsDeleted: 1,
      skippedActive: 0,
      tombstonedRunIds: ['r1'],
    });
    redis.del.mockRejectedValue(new Error('redis down'));
    await expect(service.deleteAllHistory('u1')).resolves.toMatchObject({ runsDeleted: 1 });
  });

  it('answers 404 for a stranger and 409 while the session is still attached', async () => {
    const { service, repository } = build();
    repository.findOwnedSession.mockResolvedValue(null);
    await expect(service.deleteSession('u2', 's1')).rejects.toBeInstanceOf(NotFoundException);
    repository.findOwnedSession.mockResolvedValue({ id: 's1', state: 'ACTIVE' });
    await expect(service.deleteSession('u1', 's1')).rejects.toMatchObject({
      message: 'LIVE_SESSION_ACTIVE',
    });
    await expect(service.deleteSession('u1', 's1')).rejects.toBeInstanceOf(ConflictException);
    expect(repository.deleteForScope).not.toHaveBeenCalled();
  });

  it('deletes one detached session, and 409s when it was re-attached before the delete', async () => {
    const { service, repository } = build();
    repository.findOwnedSession.mockResolvedValue({ id: 's1', state: 'DETACHED' });
    await expect(service.deleteSession('u1', 's1')).resolves.toMatchObject({ sessionsDeleted: 2 });
    expect(repository.deleteForScope).toHaveBeenCalledWith({
      userId: 'u1',
      sessionId: 's1',
      includeActive: false,
      purgeBillingState: false,
    });
    repository.deleteForScope.mockResolvedValue({
      sessionsDeleted: 0,
      skippedActive: 1,
      tombstonedRunIds: [],
    });
    await expect(service.deleteSession('u1', 's1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('handles user.deleted for every session and the billing state, and rejects a malformed event', async () => {
    const { service, repository } = build();
    await service.handleUserDeleted({
      eventId: 'ev1',
      userId: 'u9',
      deletedAt: '2026-11-22T10:00:00.000Z',
    });
    expect(repository.deleteForScope).toHaveBeenCalledWith({
      userId: 'u9',
      includeActive: true,
      purgeBillingState: true,
    });
    await expect(service.handleUserDeleted({ nope: true })).rejects.toThrow(
      'Invalid user deletion event',
    );
  });
});

describe('AccountDeletionConsumer', () => {
  it('subscribes to user.deleted and forwards the event', async () => {
    const subscribe = vi.fn();
    const deletion = { handleUserDeleted: vi.fn().mockResolvedValue(undefined) };
    await new AccountDeletionConsumer({ subscribe } as never, deletion as never).onModuleInit();
    expect(subscribe.mock.calls[0]![0]).toBe('user.deleted');
    await subscribe.mock.calls[0]![1]({ eventId: 'e' });
    expect(deletion.handleUserDeleted).toHaveBeenCalledWith({ eventId: 'e' });
    deletion.handleUserDeleted.mockRejectedValue(new Error('x'));
    await expect(subscribe.mock.calls[0]![1]({})).rejects.toThrow(
      'Account deletion processing failed',
    );
  });
});
