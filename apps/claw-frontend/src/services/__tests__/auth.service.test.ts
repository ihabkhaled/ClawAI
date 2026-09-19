import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginResponse, UserProfile } from '@/types';

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'claw-admin',
  role: 'ADMIN' as UserProfile['role'],
  mustChangePassword: false,
  languagePreference: 'EN' as UserProfile['languagePreference'],
  appearancePreference: 'SYSTEM' as UserProfile['appearancePreference'],
};

const mockLoginResponse: LoginResponse = {
  tokens: { accessToken: 'access-abc', refreshToken: 'refresh-xyz' },
  user: mockUser,
};

// Mock the repository
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockMe = vi.fn();
const mockRefresh = vi.fn();
const mockUpdateOwnProfile = vi.fn();
const mockDeleteOwnAccount = vi.fn();

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    get login() {
      return mockLogin;
    },
    get logout() {
      return mockLogout;
    },
    get me() {
      return mockMe;
    },
    get refresh() {
      return mockRefresh;
    },
    get updateOwnProfile() {
      return mockUpdateOwnProfile;
    },
    get deleteOwnAccount() {
      return mockDeleteOwnAccount;
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useAuthStore.getState().clearAuth();
    });
  });

  // ---------- login ----------

  describe('login', () => {
    it('calls repository login and sets auth state on success', async () => {
      mockLogin.mockResolvedValueOnce(mockLoginResponse);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result).toEqual(mockLoginResponse);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-abc');
      expect(state.refreshToken).toBe('refresh-xyz');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    // "Remember me" off: a browser-session login, sent to the server and kept locally.
    it('sends rememberMe and keeps whether the session is persistent', async () => {
      mockLogin.mockResolvedValueOnce(mockLoginResponse);

      await authService.login({ email: 'a@b.co', password: 'pw', rememberMe: false });

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'a@b.co',
        password: 'pw',
        rememberMe: false,
      });
      expect(useAuthStore.getState().persistent).toBe(false);
      expect(document.cookie).toContain('claw-auth-token=1');
    });

    it('propagates repository errors without modifying store', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(authService.login({ email: 'bad@test.com', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials',
      );

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ---------- logout ----------

  describe('logout', () => {
    it('calls repository logout and clears auth state', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      // Set up authenticated state first
      act(() => {
        useAuthStore.getState().setAuth({
          accessToken: 'token',
          refreshToken: 'refresh',
          user: mockUser,
          persistent: true,
        });
      });

      await authService.logout();

      expect(mockLogout).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it('clears auth state even when repository logout fails', async () => {
      mockLogout.mockRejectedValueOnce(new Error('Network error'));

      act(() => {
        useAuthStore.getState().setAuth({
          accessToken: 'token',
          refreshToken: 'refresh',
          user: mockUser,
          persistent: true,
        });
      });

      // try/finally without catch: error propagates after finally clears auth
      await expect(authService.logout()).rejects.toThrow('Network error');

      // Auth should still be cleared (finally block ran before re-throw)
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ---------- getCurrentUser ----------

  describe('getCurrentUser', () => {
    it('fetches user from repository and updates store', async () => {
      mockMe.mockResolvedValueOnce(mockUser);

      const result = await authService.getCurrentUser();

      expect(mockMe).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('propagates errors from repository', async () => {
      mockMe.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  // refreshToken() was removed: it refreshed from this tab's in-memory copy,
  // outside the cross-tab lock, which is how a used token got spent twice
  // (ADR-106). The only refresh path is lib/session-refresh.ts.

  // Renaming yourself used to sign you out of the tab you renamed in. The API
  // now spares the calling session, so nothing local may be torn down.
  it('keeps the local session when the username changes', async () => {
    mockUpdateOwnProfile.mockResolvedValueOnce({ ...mockUser, username: 'renamed' });
    act(() =>
      useAuthStore
        .getState()
        .setAuth({ accessToken: 'a', refreshToken: 'r', user: mockUser, persistent: true }),
    );

    await authService.updateOwnProfile({ currentPassword: 'CurrentPass1!', username: 'renamed' });

    expect(mockUpdateOwnProfile).toHaveBeenCalledWith({
      currentPassword: 'CurrentPass1!',
      username: 'renamed',
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('a');
  });

  it('deletes the account and clears the local session', async () => {
    mockDeleteOwnAccount.mockResolvedValueOnce(undefined);
    act(() =>
      useAuthStore
        .getState()
        .setAuth({ accessToken: 'a', refreshToken: 'r', user: mockUser, persistent: true }),
    );

    await authService.deleteOwnAccount({ currentPassword: 'CurrentPass1!' });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
