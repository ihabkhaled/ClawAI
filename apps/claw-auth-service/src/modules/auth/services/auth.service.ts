import { Injectable } from "@nestjs/common";
import { RabbitMQService, StructuredLogger } from "@claw/shared-rabbitmq";
import { EventPattern, LogLevel } from "@claw/shared-types";
import { AuthManager } from "../managers/auth.manager";
import { type LoginResult, type RefreshResult, type UserProfile } from "../types/auth.types";

@Injectable()
export class AuthService {
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly authManager: AuthManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'auth-service',
      EventPattern.LOG_SERVER,
      AuthService.name,
    );
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const result = await this.authManager.login(email, password);

      this.structuredLogger.logAction({
        level: LogLevel.INFO,
        message: `User logged in successfully: ${result.user.email}`,
        action: 'login_success',
        service: AuthService.name,
        userId: result.user.id,
      });

      await this.rabbitMQService.publish(EventPattern.USER_LOGIN, {
        userId: result.user.id,
        email: result.user.email,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error: unknown) {
      this.structuredLogger.logAction({
        level: LogLevel.WARN,
        message: `Login failed for email: ${email}`,
        action: 'login_failed',
        service: AuthService.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const result = await this.authManager.refresh(refreshToken);

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: 'Token refreshed successfully',
      action: 'token_refresh',
      service: AuthService.name,
    });

    return result;
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
