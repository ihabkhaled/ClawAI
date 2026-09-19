import { authRepository } from '@/repositories/auth/auth.repository';
import { useAuthStore } from '@/stores/auth.store';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
  UpdateOwnProfileRequest,
  DeleteOwnAccountRequest,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse,
} from '@/types';
import { clearBrowserSessionMarker, markBrowserSession } from '@/utilities';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authRepository.login(data);
    useAuthStore.getState().setAuth({
      accessToken: response.tokens.accessToken,
      refreshToken: response.tokens.refreshToken,
      user: response.user,
      persistent: data.rememberMe ?? true,
    });
    markBrowserSession();
    return response;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return authRepository.register(data);
  },

  async logout(): Promise<void> {
    try {
      await authRepository.logout();
    } finally {
      useAuthStore.getState().clearAuth();
      clearBrowserSessionMarker();
    }
  },

  async getCurrentUser(): Promise<UserProfile> {
    const user = await authRepository.me();
    useAuthStore.getState().setUser(user);
    return user;
  },

  // The API keeps the calling session alive even when the username changes, so
  // there is nothing local to tear down. Clearing auth here signed the user out
  // of a session the server still considers valid.
  async updateOwnProfile(data: UpdateOwnProfileRequest): Promise<void> {
    await authRepository.updateOwnProfile(data);
  },

  async deleteOwnAccount(data: DeleteOwnAccountRequest): Promise<void> {
    await authRepository.deleteOwnAccount(data);
    useAuthStore.getState().clearAuth();
    clearBrowserSessionMarker();
  },

  async requestPasswordReset(
    data: RequestPasswordResetRequest,
  ): Promise<RequestPasswordResetResponse> {
    return authRepository.requestPasswordReset(data);
  },

  async confirmPasswordReset(
    data: ConfirmPasswordResetRequest,
  ): Promise<ConfirmPasswordResetResponse> {
    return authRepository.confirmPasswordReset(data);
  },
};
