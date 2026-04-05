import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';
import { useAuthGuard } from '@/hooks/auth/use-auth-guard';
import { useAuthStore } from '@/stores/auth.store';
import type { UserProfile } from '@/types';

// ---- mock next/navigation ----
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: (): { replace: typeof mockReplace } => ({
    replace: mockReplace,
  }),
}));

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'claw-admin',
  role: 'ADMIN' as UserProfile['role'],
  mustChangePassword: false,
};

describe('useAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  it('returns isReady false before hydration completes', () => {
    // Store starts un-authenticated and persist may not have hydrated yet
    const { result } = renderHook(() => useAuthGuard());

    // Even if persist has already hydrated (in test env it's sync),
    // the user is not authenticated, so isReady should be false
    expect(result.current.isReady).toBe(false);
  });

  it('returns isReady true when authenticated and hydrated', () => {
    // Set up authenticated state before rendering the hook
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });
    });

    const { result } = renderHook(() => useAuthGuard());

    // The persist middleware hydrates synchronously in tests,
    // so after effects run the hook should report ready
    expect(result.current.isReady).toBe(true);
  });

  it('redirects to login when not authenticated after hydration', () => {
    // Store is cleared (not authenticated)
    renderHook(() => useAuthGuard());

    // After hydration the effect should redirect
    expect(mockReplace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });

  it('does not redirect when authenticated', () => {
    act(() => {
      useAuthStore.getState().setAuth({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      });
    });

    renderHook(() => useAuthGuard());

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects when accessToken is null but isAuthenticated flag is stale', () => {
    // Simulate a broken state: isAuthenticated is true but token is missing
    act(() => {
      useAuthStore.setState({
        isAuthenticated: true,
        accessToken: null,
        refreshToken: 'refresh',
        user: mockUser,
      });
    });

    const { result } = renderHook(() => useAuthGuard());

    expect(result.current.isReady).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith(ROUTES.LOGIN);
  });
});
