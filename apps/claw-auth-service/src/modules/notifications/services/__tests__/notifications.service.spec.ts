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
  };
  const email = { sendThreadNotification: vi.fn().mockResolvedValue(undefined) };
  const service = new NotificationsService(repository as never, email as never);
  return { service, repository, email };
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
