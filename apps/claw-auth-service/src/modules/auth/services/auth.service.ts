import { Injectable } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { AuthManager } from "../managers/auth.manager";
import { type LoginResult, type RefreshResult, type UserProfile } from "../types/auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly authManager: AuthManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const result = await this.authManager.login(email, password);

    await this.rabbitMQService.publish(EventPattern.USER_LOGIN, {
      userId: result.user.id,
      email: result.user.email,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    return this.authManager.refresh(refreshToken);
  }

  async logout(userId: string): Promise<void> {
    await this.authManager.logout(userId);

    await this.rabbitMQService.publish(EventPattern.USER_LOGOUT, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return this.authManager.getProfile(userId);
  }
}
