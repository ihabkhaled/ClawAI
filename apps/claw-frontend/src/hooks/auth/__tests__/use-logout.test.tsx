import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLogout } from '@/hooks/auth/use-logout';

const push = vi.fn();
const logoutService = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/services/auth/auth.service', () => ({
  authService: { logout: (): Promise<void> => logoutService() },
}));

const wrapper = ({ children }: { children: ReactNode }): React.ReactElement => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useLogout', () => {
  beforeEach(() => {
    push.mockClear();
    logoutService.mockReset();
    logoutService.mockResolvedValue(undefined);
  });

  it('goes to the login screen by default', async () => {
    const { result } = renderHook(() => useLogout(), { wrapper });
    act(() => result.current.logout());
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });

  it('stays on the page when redirectTo is null', async () => {
    const { result } = renderHook(() => useLogout(null), { wrapper });
    act(() => result.current.logout());
    await waitFor(() => expect(logoutService).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(push).not.toHaveBeenCalled();
  });
});
