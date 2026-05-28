import { Injectable, Logger } from '@nestjs/common';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../../../generated/prisma';
import { AppConfig } from '../../../app/config/app.config';
import { JwtPayload } from '../../../common/types';
import { hashPassword, signAccessToken, signRefreshToken, verifyPassword } from '@common/utilities';
import { UserRole, UserStatus } from '../../../common/enums';
import { validatePasswordStrength } from '../../users/service.utilities/password-policy.utility';
import {
  AccountSuspendedException,
  BusinessException,
  DuplicateEntityException,
  InvalidCredentialsException,
  InvalidRefreshTokenException,
} from '../../../common/errors';
import { RolesService } from '../../roles/services/roles.service';
import { AuthRepository } from '../repositories/auth.repository';
import {
  AuthUserSummary,
  LoginResult,
  RefreshResult,
  RegisterResult,
  TokenPair,
  UserProfile,
} from '../types/auth.types';

@Injectable()
export class AuthManager {
  private readonly logger = new Logger(AuthManager.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly rolesService: RolesService,
  ) {}

  // Self-registration: always creates a USER, status ACTIVE, on the default
  // role. Any client-supplied role is impossible to inject — the DTO only
  // accepts email+password and we hard-code role here.
  async register(email: string, password: string): Promise<RegisterResult> {
    this.logger.log(`register: attempting registration for email=${email}`);
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new BusinessException(strength.errors[0] ?? 'Weak password', 'WEAK_PASSWORD');
    }

    const existing = await this.authRepository.findUserByEmail(email);
    if (existing) {
      throw new DuplicateEntityException('User', 'email');
    }

    const username = await this.deriveUniqueUsername(email);
    const passwordHash = await hashPassword(password);
    const roleId = await this.rolesService.getDefaultUserRoleId();

    const user = await this.authRepository.createUser({
      email,
      username,
      passwordHash,
      role: UserRole.USER,
      ...(roleId ? { roleRef: { connect: { id: roleId } } } : {}),
      status: UserStatus.ACTIVE,
      mustChangePassword: false,
    });

    this.logger.log(`register: created user ${user.id} role=USER`);
    const tokens = await this.issueTokenPair(user);
    return { tokens, user: await this.toUserSummary(user) };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    this.logger.log(`login: looking up user by email=${email}`);
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsException();
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    if (!isValid) {
      throw new InvalidCredentialsException();
    }

    this.logger.debug(`login: credentials verified for user ${user.id}, issuing tokens`);
    const tokens = await this.issueTokenPair(user);
    this.logger.log(`login: completed for user ${user.id}`);

    return { tokens, user: await this.toUserSummary(user) };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    this.logger.debug('refresh: validating refresh token');
    const session = await this.authRepository.findSessionByRefreshToken(refreshToken);
    if (!session) {
      throw new InvalidRefreshTokenException();
    }

    if (session.expiresAt < new Date()) {
      await this.authRepository.deleteSession(session.id);
      throw new InvalidRefreshTokenException();
    }

    const user = await this.authRepository.findUserById(session.userId);
    if (user?.status !== UserStatus.ACTIVE) {
      await this.authRepository.deleteSession(session.id);
      throw new InvalidRefreshTokenException();
    }

    await this.authRepository.deleteSession(session.id);

    this.logger.log(`refresh: rotating tokens for user ${user.id}`);
    const tokens = await this.issueTokenPair(user);
    return { tokens };
  }

  async logout(userId: string): Promise<void> {
    this.logger.log(`logout: deleting sessions for user ${userId}`);
    await this.authRepository.deleteSessionsByUserId(userId);
    this.logger.log(`logout: completed for user ${userId}`);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const permissions = await this.rolesService.resolvePermissionsForUser(user.roleId, user.role);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      languagePreference: user.languagePreference,
      appearancePreference: user.appearancePreference,
      createdAt: user.createdAt,
    };
  }

  // Builds the shared user summary returned by login + register, including the
  // DB-resolved effective permission set.
  private async toUserSummary(user: User): Promise<AuthUserSummary> {
    const permissions = await this.rolesService.resolvePermissionsForUser(user.roleId, user.role);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions,
      mustChangePassword: user.mustChangePassword,
      languagePreference: user.languagePreference,
      appearancePreference: user.appearancePreference,
    };
  }

  // Derives a unique username from the email local-part, appending a numeric
  // suffix if the base is already taken.
  private async deriveUniqueUsername(email: string): Promise<string> {
    const base =
      (email.split('@')[0] ?? 'user').replaceAll(/[^a-zA-Z0-9_.-]/g, '').slice(0, 24) || 'user';
    let candidate = base;
    let suffix = 0;
    while (await this.authRepository.findUserByUsername(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const config = AppConfig.get();

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
    const claims: Record<string, unknown> = { ...payload };

    const accessToken = signAccessToken(
      claims,
      config.JWT_SECRET,
      config.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
    );

    const refreshTokenValue = signRefreshToken();

    const refreshExpiryMs = this.parseExpiry(config.JWT_REFRESH_EXPIRY);
    const expiresAt = new Date(Date.now() + refreshExpiryMs);

    await this.authRepository.createSession({
      userId: user.id,
      refreshToken: refreshTokenValue,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // default 7 days
    }

    const value = Number.parseInt(match[1] ?? '7', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
