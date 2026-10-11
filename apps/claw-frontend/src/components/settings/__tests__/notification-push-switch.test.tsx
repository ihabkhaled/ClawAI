import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesCard } from '@/components/settings/notification-preferences-card';
import { useAuthStore } from '@/stores/auth.store';

const toggle = vi.fn();
let push = { isAvailable: true, isSubscribed: false, isBlocked: false, isBusy: false, toggle };

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/notifications/use-push-notifications', () => ({
  usePushNotifications: () => push,
}));
vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: {
    getPreferences: () =>
      Promise.resolve({ inAppEnabled: true, emailEnabled: true, pushEnabled: true }),
    savePreferences: vi.fn(),
  },
}));

function renderCard(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotificationPreferencesCard />
    </QueryClientProvider>,
  );
}

describe('NotificationPreferencesCard push switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    push = { isAvailable: true, isSubscribed: false, isBlocked: false, isBusy: false, toggle };
  });

  it('is hidden when push is not available here', () => {
    push = { ...push, isAvailable: false };
    renderCard();
    expect(screen.queryByTestId('notification-push-row')).toBeNull();
  });

  it('turns push on for this browser', async () => {
    renderCard();
    const control = await screen.findByLabelText('notifications.preferences.push');
    await waitFor(() => expect((control as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(control);
    expect(toggle).toHaveBeenCalledWith(true);
  });

  it('is on only when this browser is subscribed and the channel is on', async () => {
    push = { ...push, isSubscribed: true };
    renderCard();
    const control = await screen.findByLabelText('notifications.preferences.push');
    await waitFor(() => expect(control.getAttribute('aria-checked')).toBe('true'));
  });

  it('explains a blocked permission and disables the switch', async () => {
    push = { ...push, isBlocked: true };
    renderCard();
    const control = await screen.findByLabelText('notifications.preferences.push');
    expect((control as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('notifications.preferences.pushBlocked')).toBeTruthy();
  });
});
