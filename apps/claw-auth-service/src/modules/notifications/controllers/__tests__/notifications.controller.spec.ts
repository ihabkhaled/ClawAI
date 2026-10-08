import { NotificationsController } from '../notifications.controller';

const user = { id: 'user-1' } as never;

function build() {
  const service = {
    getPage: vi.fn().mockResolvedValue({ items: [], nextCursor: null, unreadCount: 0 }),
    getPreferences: vi.fn().mockResolvedValue({ inAppEnabled: true }),
    updatePreferences: vi.fn().mockResolvedValue({ inAppEnabled: false }),
    markRead: vi.fn().mockResolvedValue({ unreadCount: 1 }),
    markAllRead: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  };
  return { controller: new NotificationsController(service as never), service };
}

describe('NotificationsController', () => {
  it('always scopes by the signed-in user, never by anything in the request', async () => {
    const { controller, service } = build();
    await controller.list(user, { limit: 20, cursor: null });
    await controller.getPreferences(user);
    await controller.updatePreferences(user, { inAppEnabled: false });
    await controller.read(user, { id: 'someone-elses-notification' });
    await controller.readAll(user);
    expect(service.getPage).toHaveBeenCalledWith('user-1', { limit: 20, cursor: null });
    expect(service.getPreferences).toHaveBeenCalledWith('user-1');
    expect(service.updatePreferences).toHaveBeenCalledWith('user-1', { inAppEnabled: false });
    expect(service.markRead).toHaveBeenCalledWith('user-1', 'someone-elses-notification');
    expect(service.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
