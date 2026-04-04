import { apiClient } from "@/services/shared/api-client";
import type { LoginRequest, LoginResponse, RefreshResponse, UserProfile } from "@/types";

export const authRepository = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiClient.post<RefreshResponse>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },

  async me(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>("/auth/me");
    return response.data;
  },
};
