import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { AuthManager } from '../managers/auth.manager';
import {
  type LoginResult,
  type RefreshResult,
  type RegisterResult,
  type UserProfile,
} from '../types/auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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

  async register(email: string, password: string): Promise<RegisterResult> {
    this.logger.log(`register: attempting registration for email=${email}`);
    try {
      const result = await this.authManager.register(email, password);
      this.structuredLogger.logAction({
        level: LogLevel.INFO,
        message: `User registered: ${result.user.email}`,
        action: 'register_success',
        service: AuthService.name,
        userId: result.user.id,
      });
      await this.rabbitMQService.publish(EventPattern.USER_CREATED, {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        timestamp: new Date().toISOString(),
      });
      return result;
    } catch (error: unknown) {
      this.structuredLogger.logAction({
        level: LogLevel.WARN,
        message: `Registration failed for email: ${email}`,
        action: 'register_failed',
        service: AuthService.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    this.logger.log(`login: attempting login for email=${email}`);
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
    this.logger.log('refresh: attempting token refresh');
    const result = await this.authManager.refresh(refreshToken);

    this.structuredLogger.logAction({
      level: LogLevel.INFO,
      message: 'Token refreshed successfully',
      action: 'token_refresh',
      service: AuthService.name,
    });

    return result;
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`logout: logging out user ${userId}`);
    await this.authManager.logout(userId, sessionId);

    await this.rabbitMQService.publish(EventPattern.USER_LOGOUT, {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    this.logger.debug(`getProfile: fetching profile for user ${userId}`);
    return this.authManager.getProfile(userId);
  }
}
