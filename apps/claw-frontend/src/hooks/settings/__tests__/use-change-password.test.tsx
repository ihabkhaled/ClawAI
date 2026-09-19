import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChangePassword } from '@/hooks/settings/use-change-password';
import { queryKeys } from '@/repositories/shared/query-keys';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@/types';

vi.mock('@/services/preferences/preferences.service', () => ({
  preferencesService: { changePassword: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

vi.mock('@/utilities', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
  showToast: { success: vi.fn(), apiError: vi.fn() },
}));

const rotatingUser = { id: 'u1', email: 'u@x.test', mustChangePassword: true } as unknown as User;

describe('useChangePassword', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.auth.me, rotatingUser);
    useAuthStore.getState().setUser(rotatingUser);
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // The banner and the redirect guard both read this flag from the cached
  // profile and the store. Neither was updated after a successful change, so
  // the banner stayed and every navigation bounced back to the form until the
  // user reloaded the page.
  it('clears the forced-rotation flag in the cache and the store immediately', async () => {
    const { result } = renderHook(() => useChangePassword(), { wrapper });

    act(() => {
      result.current.changePassword({ currentPassword: 'old', newPassword: 'NewPass123!' });
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<User>(queryKeys.auth.me)?.mustChangePassword).toBe(false);
    });
    expect(useAuthStore.getState().user?.mustChangePassword).toBe(false);
  });
});
