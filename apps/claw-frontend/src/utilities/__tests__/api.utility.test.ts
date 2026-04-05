import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuthStorage,
} from '@/utilities/api.utility';

const STORAGE_KEY = 'claw-auth-storage';

function setStorage(state: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state }));
}

describe('api.utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------- getAccessToken ----------

  describe('getAccessToken', () => {
    it('returns the access token when present in storage', () => {
      setStorage({ accessToken: 'abc-123', refreshToken: 'ref-456' });
      expect(getAccessToken()).toBe('abc-123');
    });

    it('returns null when storage is empty', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('returns null when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, 'not-json');
      expect(getAccessToken()).toBeNull();
    });

    it('returns null when stored value has no state key', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: 'data' }));
      expect(getAccessToken()).toBeNull();
    });

    it('returns null when accessToken is not set in state', () => {
      setStorage({ refreshToken: 'ref-456' });
      expect(getAccessToken()).toBeNull();
    });
  });

  // ---------- getRefreshToken ----------

  describe('getRefreshToken', () => {
    it('returns the refresh token when present in storage', () => {
      setStorage({ accessToken: 'abc', refreshToken: 'ref-789' });
      expect(getRefreshToken()).toBe('ref-789');
    });

    it('returns null when storage is empty', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('returns null when stored JSON is invalid', () => {
      localStorage.setItem(STORAGE_KEY, '{broken');
      expect(getRefreshToken()).toBeNull();
    });
  });

  // ---------- setTokens ----------

  describe('setTokens', () => {
    it('updates tokens in localStorage when storage already has data', () => {
      setStorage({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        isAuthenticated: true,
      });

      setTokens('new-access', 'new-refresh');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as {
        state: Record<string, unknown>;
      };
      expect(stored.state.accessToken).toBe('new-access');
      expect(stored.state.refreshToken).toBe('new-refresh');
    });

    it('does nothing when storage is empty', () => {
      setTokens('access', 'refresh');
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does nothing when stored JSON has no state key', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: 'value' }));
      setTokens('access', 'refresh');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as Record<
        string,
        unknown
      >;
      expect(stored).not.toHaveProperty('state');
    });

    it('preserves other state properties when updating tokens', () => {
      setStorage({
        accessToken: 'old-access',
        refreshToken: 'old-refresh',
        isAuthenticated: true,
      });

      setTokens('new-access', 'new-refresh');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string) as {
        state: Record<string, unknown>;
      };
      expect(stored.state.isAuthenticated).toBe(true);
    });
  });

  // ---------- clearAuthStorage ----------

  describe('clearAuthStorage', () => {
    it('removes the auth storage key from localStorage', () => {
      setStorage({ accessToken: 'token', refreshToken: 'refresh' });
      clearAuthStorage();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when storage is already empty', () => {
      expect(() => clearAuthStorage()).not.toThrow();
    });
  });
});
