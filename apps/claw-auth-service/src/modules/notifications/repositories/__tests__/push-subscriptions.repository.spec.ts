import { UserNotificationsRepository } from '../user-notifications.repository';

const input = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'p',
  auth: 'secret-1',
};

function build(existing: { userId: string; auth: string } | null) {
  const pushSubscription = {
    findUnique: vi.fn().mockResolvedValue(existing),
    upsert: vi.fn().mockResolvedValue(undefined),
    count: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    updateMany: vi.fn(),
  };
  return {
    repository: new UserNotificationsRepository({ pushSubscription } as never),
    pushSubscription,
  };
}

describe('UserNotificationsRepository.saveSubscription', () => {
  it('creates a new subscription for the caller', async () => {
    const { repository, pushSubscription } = build(null);
    await expect(repository.saveSubscription('user-1', input)).resolves.toBe(true);
    expect(pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { userId: 'user-1', ...input } }),
    );
  });

  it('refreshes the keys of the caller own subscription', async () => {
    const { repository, pushSubscription } = build({ userId: 'user-1', auth: 'old' });
    await expect(repository.saveSubscription('user-1', input)).resolves.toBe(true);
    expect(pushSubscription.upsert).toHaveBeenCalled();
  });

  it('moves a subscription to the caller only when they hold the same auth secret', async () => {
    const { repository, pushSubscription } = build({ userId: 'user-2', auth: 'secret-1' });
    await expect(repository.saveSubscription('user-1', input)).resolves.toBe(true);
    expect(pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ userId: 'user-1' }) }),
    );
  });

  it('refuses to take over another account subscription without its auth secret', async () => {
    const { repository, pushSubscription } = build({ userId: 'user-2', auth: 'different' });
    await expect(repository.saveSubscription('user-1', input)).resolves.toBe(false);
    expect(pushSubscription.upsert).not.toHaveBeenCalled();
  });
});

describe('UserNotificationsRepository.deleteSubscription', () => {
  it('only deletes a row that belongs to the caller', async () => {
    const { repository, pushSubscription } = build(null);
    await repository.deleteSubscription('user-1', input.endpoint);
    expect(pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', endpoint: input.endpoint },
    });
  });
});
