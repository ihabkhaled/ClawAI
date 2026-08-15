import { apiClient } from '@/services/shared/api-client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  UserEntitlements,
  UserProfile,
  UpdateOwnProfileRequest,
  DeleteOwnAccountRequest,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse,
} from '@/types';

export const authRepository = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const response = await apiClient.post<{ verified: boolean }>(
      '/auth/email-verification/confirm',
      { token },
    );
    return response.data;
  },

  async resendVerification(email: string): Promise<{ accepted: true }> {
    const response = await apiClient.post<{ accepted: true }>('/auth/email-verification/resend', {
      email,
    });
    return response.data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async me(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  async entitlements(): Promise<UserEntitlements> {
    const response = await apiClient.get<UserEntitlements>('/auth/me/entitlements');
    return response.data;
  },

  async updateOwnProfile(data: UpdateOwnProfileRequest): Promise<UserProfile> {
    const response = await apiClient.patch<UserProfile>('/users/me', data);
    return response.data;
  },

  async deleteOwnAccount(data: DeleteOwnAccountRequest): Promise<void> {
    await apiClient.delete('/users/me', { data });
  },

  async requestPasswordReset(
    data: RequestPasswordResetRequest,
  ): Promise<RequestPasswordResetResponse> {
    const response = await apiClient.post<RequestPasswordResetResponse>(
      '/auth/password-reset/request',
      data,
    );
    return response.data;
  },

  async confirmPasswordReset(
    data: ConfirmPasswordResetRequest,
  ): Promise<ConfirmPasswordResetResponse> {
    const response = await apiClient.post<ConfirmPasswordResetResponse>(
      '/auth/password-reset/confirm',
      data,
    );
    return response.data;
  },
};
