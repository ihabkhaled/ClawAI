import { Injectable } from "@nestjs/common";
import { AuthManager } from "../managers/auth.manager";
import { LoginResult, RefreshResult, UserProfile } from "../types/auth.types";

@Injectable()
export class AuthService {
  constructor(private readonly authManager: AuthManager) {}

  async login(email: string, password: string): Promise<LoginResult> {
    return this.authManager.login(email, password);
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    return this.authManager.refresh(refreshToken);
  }

  async logout(userId: string): Promise<void> {
    return this.authManager.logout(userId);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return this.authManager.getProfile(userId);
  }
}
