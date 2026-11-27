import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService, StructuredLogger } from '@claw/shared-rabbitmq';
import { EventPattern, LogLevel } from '@claw/shared-types';
import { AuthManager } from '../managers/auth.manager';
import { WEB_SESSION_CLIENT } from '../constants/token-session.constants';
import {
  type LoginResult,
  type RefreshResult,
  type RegisterResult,
  type UserProfile,
} from '../types/auth.types';
import type { SessionClient } from '../types/token-session.types';
import type { RegisterDto } from '../dto/register.dto';
import { InvalidCredentialsException } from '../../../common/errors';
import { EMPTY_SCREENING_ORIGIN } from '../../anti-abuse/constants/anti-abuse.constants';
import { LoginScreeningService } from '../../anti-abuse/services/login-screening.service';
import { RegistrationScreeningService } from '../../anti-abuse/services/registration-screening.service';
import type { LoginScreeningInput, ScreeningOrigin } from '../../anti-abuse/types/device.types';
import { screeningOriginOf } from '../../anti-abuse/utilities/screening-origin.utility';
import { EmailVerificationService } from './email-verification.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly structuredLogger: StructuredLogger;

  constructor(
    private readonly authManager: AuthManager,
    private readonly rabbitMQService: RabbitMQService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly registrationScreening: RegistrationScreeningService,
    private readonly loginScreening: LoginScreeningService,
  ) {
    this.structuredLogger = new StructuredLogger(
      this.rabbitMQService,
      'auth-service',
      EventPattern.LOG_SERVER,
      AuthService.name,
    );
  }

  // Anti-abuse screening (bot check, email domain, velocity, trial decision)
  // runs first and throws its own coded refusals, each with a security event.
  async register(
    dto: RegisterDto,
    origin: ScreeningOrigin = EMPTY_SCREENING_ORIGIN,
  ): Promise<RegisterResult> {
    this.logger.log(`register: attempting registration for email=${dto.email}`);
    const verdict = await this.registrationScreening.screen(dto, origin);
    try {
      const account = await this.authManager.register(dto, origin, verdict.trial.grant);
      await this.registrationScreening.recordSignup(account.user.id, dto.email, verdict, origin);
      const result: RegisterResult = {
        ...account,
        verificationEmailSent: await this.sendVerificationEmail(
          account.user.id,
          account.user.email,
        ),
      };
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
        message: `Registration failed for email: ${dto.email}`,
        action: 'register_failed',
        service: AuthService.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // The account is complete by the time this runs, so a mail failure must not
  // turn into a failed sign-up: the user would retry, hit DUPLICATE_ENTITY,
  // and be locked out of an address that is already theirs. Report it instead;
  // /check-email says so and offers the resend endpoint.
  private async sendVerificationEmail(userId: string, email: string): Promise<boolean> {
    try {
      await this.emailVerificationService.sendForUser(userId, email);
      return true;
    } catch (error: unknown) {
      this.logger.error(
        `register: verification email could not be sent for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }

  // After repeated failures for the IP or the address, the bot checks are
  // required before the password is even looked at (LoginScreeningService).
  async login(
    email: string,
    password: string,
    client: SessionClient = WEB_SESSION_CLIENT,
    screening: LoginScreeningInput = {},
  ): Promise<LoginResult> {
    this.logger.log(`login: attempting login for email=${email}`);
    const origin = screeningOriginOf(client.origin);
    await this.loginScreening.assertAllowed(email, screening, origin);
    try {
      const result = await this.authManager.login(email, password, client);
      await this.loginScreening.recordSuccess(result.user.id, email, screening, origin);

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
      if (error instanceof InvalidCredentialsException) {
        await this.loginScreening.recordFailure(email, origin);
      }
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
