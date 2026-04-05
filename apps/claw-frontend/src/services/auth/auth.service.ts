import { authRepository } from "@/repositories/auth/auth.repository";
import { useAuthStore } from "@/stores/auth.store";
import type { LoginRequest, LoginResponse, UserProfile } from "@/types";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authRepository.login(data);
    useAuthStore.getState().setAuth({
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      user: response.user,
    });
    if (typeof document !== 'undefined') {
      document.cookie = 'claw-auth-token=1; path=/; SameSite=Lax';
    }
    return response;
  },

  async logout(): Promise<void> {
    try {
      await authRepository.logout();
    } finally {
      useAuthStore.getState().clearAuth();
      if (typeof document !== 'undefined') {
        document.cookie = 'claw-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  },

  async getCurrentUser(): Promise<UserProfile> {
    const user = await authRepository.me();
    useAuthStore.getState().setUser(user);
    return user;
  },

  async refreshToken(): Promise<void> {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      throw new Error("No refresh token available");
    }
    const response = await authRepository.refresh(refreshToken);
    useAuthStore.getState().setTokens({
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
    });
  },
};
