import { collectDevicePayload } from '@/lib/bot-check/device-fingerprint';
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
import type { LoginBotCheckHooks } from '@/types/bot-check.types';
import { clearBrowserSessionMarker, markBrowserSession } from '@/utilities';
import { isBotCheckRequiredError } from '@/utilities/bot-check.utility';

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

  /**
   * Sign-in that always carries the device, and carries bot checks only once the
   * server asked for them: a 428 BOT_CHECK_REQUIRED is retried exactly once WITH
   * checks, and every later attempt from this form sends them up front.
   */
  async loginWithBotCheck(data: LoginRequest, hooks: LoginBotCheckHooks): Promise<LoginResponse> {
    const device = await collectDevicePayload();
    const request: LoginRequest = device === null ? data : { ...data, device };
    if (hooks.isBotCheckRequired()) {
      return authService.login({ ...request, botCheck: await hooks.collectBotCheck() });
    }
    try {
      return await authService.login(request);
    } catch (error) {
      if (!isBotCheckRequiredError(error)) {
        throw error;
      }
      hooks.markBotCheckRequired();
      return authService.login({ ...request, botCheck: await hooks.collectBotCheck() });
    }
  },

  /** Sign-up always carries the device (no device: no free trial, server side). */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const device = await collectDevicePayload();
    return authRepository.register(device === null ? data : { ...data, device });
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
