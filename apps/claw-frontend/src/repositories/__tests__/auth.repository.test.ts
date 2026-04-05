import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authRepository } from '@/repositories/auth/auth.repository';
import type { LoginResponse, RefreshResponse, UserProfile } from '@/types';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'claw-admin',
  role: 'ADMIN' as UserProfile['role'],
  mustChangePassword: false,
};

describe('authRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- login ----------

  describe('login', () => {
    it('posts to /auth/login with credentials and returns data', async () => {
      const loginResponse: LoginResponse = {
        tokens: { accessToken: 'access-1', refreshToken: 'refresh-1' },
        user: mockUser,
      };
      mockPost.mockResolvedValueOnce({ data: loginResponse, status: 200 });

      const result = await authRepository.login({
        email: 'test@example.com',
        password: 'pass123',
      });

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'pass123',
      });
      expect(result).toEqual(loginResponse);
    });

    it('propagates errors from apiClient', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await expect(authRepository.login({ email: 'a@b.com', password: 'x' })).rejects.toThrow(
        'Network error',
      );
    });
  });

  // ---------- refresh ----------

  describe('refresh', () => {
    it('posts to /auth/refresh with refresh token', async () => {
      const refreshResponse: RefreshResponse = {
        tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      };
      mockPost.mockResolvedValueOnce({ data: refreshResponse, status: 200 });

      const result = await authRepository.refresh('old-refresh-token');

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(result).toEqual(refreshResponse);
    });
  });

  // ---------- logout ----------

  describe('logout', () => {
    it('posts to /auth/logout with no body', async () => {
      mockPost.mockResolvedValueOnce({ data: undefined, status: 204 });

      await authRepository.logout();

      expect(mockPost).toHaveBeenCalledWith('/auth/logout');
    });
  });

  // ---------- me ----------

  describe('me', () => {
    it('gets /auth/me and returns user profile', async () => {
      mockGet.mockResolvedValueOnce({ data: mockUser, status: 200 });

      const result = await authRepository.me();

      expect(mockGet).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });
});
