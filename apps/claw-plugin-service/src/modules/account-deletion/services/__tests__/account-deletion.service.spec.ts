import { Logger } from '@nestjs/common';

import { AccountDeletionService } from '../account-deletion.service';

const EVENT = {
  eventId: 'event-1',
  userId: 'user-secret-id',
  deletedAt: '2026-10-13T10:00:00.000Z',
};

describe('Plugin AccountDeletionService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deletes the plugin data of the deleted user', async () => {
    const repository = {
      deleteAllForUser: vi.fn().mockResolvedValue({
        installs: 2,
        credentials: 1,
        consents: 3,
        invocations: 9,
        servers: 4,
      }),
    };
    const service = new AccountDeletionService(repository as never);

    await service.handle(EVENT);

    expect(repository.deleteAllForUser).toHaveBeenCalledWith('user-secret-id');
  });

  it('logs the event id and counts but never the account id', async () => {
    const lines: string[] = [];
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => {
      lines.push(String(message));
    });
    const repository = {
      deleteAllForUser: vi.fn().mockResolvedValue({
        installs: 2,
        credentials: 1,
        consents: 3,
        invocations: 9,
        servers: 4,
      }),
    };

    await new AccountDeletionService(repository as never).handle(EVENT);

    expect(lines.join('\n')).toContain('event=event-1');
    expect(lines.join('\n')).toContain('installs=2');
    expect(lines.join('\n')).toContain('servers=4');
    expect(lines.join('\n')).not.toContain('user-secret-id');
  });

  it('is safe to run twice: a redelivered event finds nothing and still succeeds', async () => {
    const repository = {
      deleteAllForUser: vi.fn().mockResolvedValue({
        installs: 0,
        credentials: 0,
        consents: 0,
        invocations: 0,
        servers: 0,
      }),
    };
    const service = new AccountDeletionService(repository as never);

    await service.handle(EVENT);
    await expect(service.handle(EVENT)).resolves.toBeUndefined();
  });

  it.each([
    ['a missing user id', { eventId: 'e', deletedAt: EVENT.deletedAt }],
    ['a bad timestamp', { ...EVENT, deletedAt: 'yesterday' }],
    ['a non-object payload', 'user.deleted'],
  ])('rejects %s without touching data', async (_label, payload) => {
    const repository = { deleteAllForUser: vi.fn() };

    await expect(new AccountDeletionService(repository as never).handle(payload)).rejects.toThrow(
      'Invalid user deletion event',
    );
    expect(repository.deleteAllForUser).not.toHaveBeenCalled();
  });
});
