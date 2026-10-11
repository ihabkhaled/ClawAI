import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationPreferencesCard } from '@/components/settings/notification-preferences-card';
import { useAuthStore } from '@/stores/auth.store';

const getPreferences = vi.fn();
const savePreferences = vi.fn();
const toast = vi.fn();

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/repositories/notifications/notifications.repository', () => ({
  notificationsRepository: {
    getPreferences: (...args: unknown[]) => getPreferences(...args),
    savePreferences: (...args: unknown[]) => savePreferences(...args),
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

describe('NotificationPreferencesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    getPreferences.mockResolvedValue({
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
    });
  });

  it('shows the saved choices', async () => {
    renderCard();
    const inApp = await screen.findByLabelText('notifications.preferences.inApp');
    await waitFor(() => expect(inApp.getAttribute('aria-checked')).toBe('true'));
    expect(
      screen.getByLabelText('notifications.preferences.email').getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('saves only the switch that changed', async () => {
    savePreferences.mockResolvedValue({
      inAppEnabled: true,
      emailEnabled: false,
      pushEnabled: false,
    });
    renderCard();
    const email = await screen.findByLabelText('notifications.preferences.email');
    await waitFor(() => expect((email as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(email);
    await waitFor(() => expect(savePreferences).toHaveBeenCalledWith({ emailEnabled: false }));
  });

  it('rolls the switch back and says so when saving fails', async () => {
    savePreferences.mockRejectedValue(new Error('down'));
    renderCard();
    const email = await screen.findByLabelText('notifications.preferences.email');
    await waitFor(() => expect((email as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(email);
    await waitFor(() => expect(toast).toHaveBeenCalled());
    await waitFor(() => expect(email.getAttribute('aria-checked')).toBe('true'));
  });
});
