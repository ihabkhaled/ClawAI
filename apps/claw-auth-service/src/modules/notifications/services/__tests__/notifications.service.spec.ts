import { UserNotificationKind } from '@claw/shared-types';

import { AuthEmailKind } from '../../../auth/enums/auth-email-kind.enum';
import { UserLanguagePreference } from '../../../../generated/prisma';
import { NotificationsService } from '../notifications.service';

const recipient = {
  id: 'user-1',
  email: 'owner@example.test',
  firstName: 'Ada',
  languagePreference: UserLanguagePreference.FR,
  isActive: true,
  isEmailVerified: true,
};

const request = {
  dedupeKey: 'thread-published:pub_1:1',
  userId: 'user-1',
  kind: UserNotificationKind.THREAD_PUBLISHED,
  link: '/threads/my-slug',
  params: { title: 'My Thread' },
};

function build(overrides?: {
  recipient?: typeof recipient | null;
  preferences?: { inAppEnabled: boolean; emailEnabled: boolean; pushEnabled: boolean };
  created?: boolean;
}) {
  const repository = {
    findRecipient: vi
      .fn()
      .mockResolvedValue(overrides?.recipient === undefined ? recipient : overrides.recipient),
    getPreferences: vi
      .fn()
      .mockResolvedValue(
        overrides?.preferences ?? { inAppEnabled: true, emailEnabled: true, pushEnabled: false },
      ),
    createIfAbsent: vi.fn().mockResolvedValue(overrides?.created ?? true),
    findPage: vi.fn(),
    countUnread: vi.fn().mockResolvedValue(2),
    markRead: vi.fn().mockResolvedValue(true),
    markAllRead: vi.fn().mockResolvedValue(3),
    savePreferences: vi.fn(),
    findSubscriptions: vi.fn().mockResolvedValue([]),
    deleteGoneSubscription: vi.fn().mockResolvedValue(undefined),
    touchSubscription: vi.fn().mockResolvedValue(undefined),
    saveSubscription: vi.fn().mockResolvedValue(true),
    hasSubscription: vi.fn().mockResolvedValue(false),
    countSubscriptions: vi.fn().mockResolvedValue(0),
    deleteSubscription: vi.fn().mockResolvedValue(true),
  };
  const email = { sendThreadNotification: vi.fn().mockResolvedValue(undefined) };
  const push = {
    getConfig: vi.fn().mockReturnValue({ enabled: true, publicKey: 'pub' }),
    send: vi.fn().mockResolvedValue('SENT'),
  };
  const service = new NotificationsService(repository as never, email as never, push as never);
  return { service, repository, email, push };
}

describe('NotificationsService.receive', () => {
  it('stores the notification and emails it in the recipient language', async () => {
    const { service, repository, email } = build();
    await service.receive(request);
    expect(repository.createIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        dedupeKey: request.dedupeKey,
        kind: UserNotificationKind.THREAD_PUBLISHED,
        link: '/threads/my-slug',
        readAt: null,
      }),
    );
    expect(email.sendThreadNotification).toHaveBeenCalledExactlyOnceWith(
      { email: 'owner@example.test', locale: UserLanguagePreference.FR, firstName: 'Ada' },
      AuthEmailKind.THREAD_PUBLISHED,
      'My Thread',
      '/threads/my-slug',
    );
  });

  it('does not email again for a redelivered event', async () => {
    const { service, email } = build({ created: false });
    await service.receive(request);
    expect(email.sendThreadNotification).not.toHaveBeenCalled();
  });

  it('stores it already read when in-app is off, so the bell stays quiet', async () => {
    const { service, repository } = build({
      preferences: { inAppEnabled: false, emailEnabled: true, pushEnabled: false },
    });
    await service.receive(request);
    const stored = repository.createIfAbsent.mock.calls[0]?.[0];
    expect(stored.readAt).toBeInstanceOf(Date);
  });

  it('sends no email when email is off or the address is not verified', async () => {
    const off = build({
      preferences: { inAppEnabled: true, emailEnabled: false, pushEnabled: false },
    });
    await off.service.receive(request);
    expect(off.email.sendThreadNotification).not.toHaveBeenCalled();

    const unverified = build({ recipient: { ...recipient, isEmailVerified: false } });
    await unverified.service.receive(request);
    expect(unverified.email.sendThreadNotification).not.toHaveBeenCalled();
  });

  it('uses a placeholder when a published Thread has no title', async () => {
    const { service, email } = build();
    await service.receive({ ...request, params: {} });
    expect(email.sendThreadNotification.mock.calls[0]?.[2]).toBe('—');
  });

  it('keeps the stored notification when the email cannot be sent', async () => {
    const { service, repository, email } = build();
    email.sendThreadNotification.mockRejectedValue(new Error('smtp down'));
    await expect(service.receive(request)).resolves.toBeUndefined();
    expect(repository.createIfAbsent).toHaveBeenCalledOnce();
  });

  it.each([
    ['a link to another site', { ...request, link: 'https://evil.test/x' }],
    ['a protocol-relative link', { ...request, link: '//evil.test/x' }],
    ['an unknown kind', { ...request, kind: 'SOMETHING_ELSE' }],
    ['an extra field', { ...request, extra: true }],
    ['a missing user', { ...request, userId: '' }],
  ])('drops %s', async (_label, payload) => {
    const { service, repository } = build();
    await service.receive(payload);
    expect(repository.createIfAbsent).not.toHaveBeenCalled();
  });

  it('drops a request for an unknown or inactive account', async () => {
    const missing = build({ recipient: null });
    await missing.service.receive(request);
    expect(missing.repository.createIfAbsent).not.toHaveBeenCalled();

    const suspended = build({ recipient: { ...recipient, isActive: false } });
    await suspended.service.receive(request);
    expect(suspended.repository.createIfAbsent).not.toHaveBeenCalled();
  });

  it('lets a storage failure surface so the broker keeps the message', async () => {
    const { service, repository } = build();
    repository.createIfAbsent.mockRejectedValue(new Error('db down'));
    await expect(service.receive(request)).rejects.toThrow('db down');
  });
});

describe('NotificationsService for the signed-in person', () => {
  const row = (id: string, kind: string) => ({
    id,
    kind,
    link: '/threads',
    params: { title: 'T', bad: 5 },
    readAt: null,
    createdAt: new Date('2026-10-08T10:00:00Z'),
  });

  it('pages newest first, reports the next cursor and the unread count', async () => {
    const { service, repository } = build();
    repository.findPage.mockResolvedValue([
      row('n3', UserNotificationKind.THREAD_FAILED),
      row('n2', UserNotificationKind.THREAD_PUBLISHED),
      row('n1', UserNotificationKind.THREAD_READY_FOR_REVIEW),
    ]);
    const page = await service.getPage('user-1', { limit: 2, cursor: null });
    expect(repository.findPage).toHaveBeenCalledWith('user-1', null, 2);
    expect(page.items.map((item) => item.id)).toEqual(['n3', 'n2']);
    expect(page.nextCursor).toBe('n2');
    expect(page.unreadCount).toBe(2);
    expect(page.items[0]?.params).toEqual({ title: 'T' });
  });

  it('has no next cursor on the last page and skips a row of an unknown kind', async () => {
    const { service, repository } = build();
    repository.findPage.mockResolvedValue([row('n1', 'FROM_THE_FUTURE')]);
    const page = await service.getPage('user-1', { limit: 20, cursor: null });
    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it('marks read only inside the caller scope and returns the new unread count', async () => {
    const { service, repository } = build();
    await expect(service.markRead('user-1', 'n1')).resolves.toEqual({ unreadCount: 2 });
    expect(repository.markRead).toHaveBeenCalledWith('user-1', 'n1');
    await expect(service.markAllRead('user-1')).resolves.toEqual({ unreadCount: 0 });
    expect(repository.markAllRead).toHaveBeenCalledWith('user-1');
  });

  it('saves preferences for the caller only', async () => {
    const { service, repository } = build();
    repository.savePreferences.mockResolvedValue({
      inAppEnabled: true,
      emailEnabled: false,
      pushEnabled: false,
    });
    await service.updatePreferences('user-1', { emailEnabled: false });
    expect(repository.savePreferences).toHaveBeenCalledWith('user-1', { emailEnabled: false });
  });
});

const browser = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'p', auth: 'a' };
const second = { ...browser, endpoint: 'https://fcm.googleapis.com/fcm/send/b' };
const body = { endpoint: browser.endpoint, keys: { p256dh: 'p', auth: 'a' } };
const pushPreferences = { inAppEnabled: true, emailEnabled: false, pushEnabled: true };

describe('NotificationsService push', () => {
  it('pushes the localized text to every saved browser of a person who opted in', async () => {
    const { service, repository, push } = build({ preferences: pushPreferences });
    repository.findSubscriptions.mockResolvedValue([browser, second]);
    await service.receive(request);
    expect(push.send).toHaveBeenCalledTimes(2);
    expect(push.send).toHaveBeenCalledWith(
      browser,
      expect.objectContaining({ link: '/threads/my-slug', tag: request.dedupeKey }),
    );
    expect(repository.touchSubscription).toHaveBeenCalledTimes(2);
  });

  it('sends no push when the person did not opt in, or on a redelivered event', async () => {
    const off = build();
    await off.service.receive(request);
    expect(off.push.send).not.toHaveBeenCalled();
    const replay = build({ preferences: pushPreferences, created: false });
    await replay.service.receive(request);
    expect(replay.push.send).not.toHaveBeenCalled();
  });

  it('forgets a browser the push service says is gone and keeps going', async () => {
    const { service, repository, push } = build({ preferences: pushPreferences });
    repository.findSubscriptions.mockResolvedValue([browser, second]);
    push.send.mockResolvedValueOnce('GONE').mockResolvedValueOnce('SENT');
    await service.receive(request);
    expect(repository.deleteGoneSubscription).toHaveBeenCalledExactlyOnceWith(browser.endpoint);
    expect(repository.touchSubscription).toHaveBeenCalledTimes(1);
  });

  it('saves a subscription and turns the push channel on', async () => {
    const { service, repository } = build();
    await service.subscribePush('user-1', body);
    expect(repository.saveSubscription).toHaveBeenCalledWith('user-1', browser);
    expect(repository.savePreferences).toHaveBeenCalledWith('user-1', { pushEnabled: true });
  });

  it('refuses to subscribe when push is not configured', async () => {
    const { service, push, repository } = build();
    push.getConfig.mockReturnValue({ enabled: false, publicKey: null });
    await expect(service.subscribePush('user-1', body)).rejects.toThrow('not configured');
    expect(repository.saveSubscription).not.toHaveBeenCalled();
  });

  it('caps the browsers per person, but lets a known browser refresh its keys', async () => {
    const { service, repository } = build();
    repository.countSubscriptions.mockResolvedValue(10);
    await expect(service.subscribePush('user-1', body)).rejects.toThrow('Too many');
    repository.hasSubscription.mockResolvedValue(true);
    await expect(service.subscribePush('user-1', body)).resolves.toBeUndefined();
  });

  it('switches the channel off only when the last browser is removed', async () => {
    const { service, repository } = build();
    repository.countSubscriptions.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await service.unsubscribePush('user-1', browser.endpoint);
    expect(repository.savePreferences).not.toHaveBeenCalled();
    await service.unsubscribePush('user-1', browser.endpoint);
    expect(repository.savePreferences).toHaveBeenCalledWith('user-1', { pushEnabled: false });
  });

  it('refuses a subscription that belongs to another account and leaves the channel alone', async () => {
    const { service, repository } = build();
    repository.saveSubscription.mockResolvedValue(false);
    await expect(service.subscribePush('user-1', body)).rejects.toThrow('another account');
    expect(repository.savePreferences).not.toHaveBeenCalled();
  });
});
