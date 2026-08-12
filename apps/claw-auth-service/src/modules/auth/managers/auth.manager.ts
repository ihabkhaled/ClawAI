import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../../generated/prisma';
import { hashPassword, verifyPassword } from '@common/utilities';
import { UserRole, UserStatus } from '../../../common/enums';
import { validatePasswordStrength } from '../../users/service.utilities/password-policy.utility';
import {
  AccountSuspendedException,
  BusinessException,
  DuplicateEntityException,
  InvalidCredentialsException,
} from '../../../common/errors';
import { RolesService } from '../../roles/services/roles.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { WEB_SESSION_CLIENT } from '../constants/token-session.constants';
import { TokenSessionManager } from './token-session.manager';
import {
  AuthUserSummary,
  LoginResult,
  RefreshResult,
  RegisterResult,
  UserProfile,
} from '../types/auth.types';
import type { SessionClient } from '../types/token-session.types';

@Injectable()
export class AuthManager {
  private readonly logger = new Logger(AuthManager.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly rolesService: RolesService,
    private readonly plansRepository: PlansRepository,
    private readonly tokenSessionManager: TokenSessionManager,
  ) {}

  // Self-registration: always creates a pending USER on the default
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
      status: UserStatus.PENDING,
      mustChangePassword: false,
    });

    // Assign the default (Free) plan if one is configured. Non-fatal: a user
    // without a plan is still created (ADMIN-style unrestricted fallback is
    // handled downstream), but normally the default plan exists from seed.
    const defaultPlan = await this.plansRepository.findDefault();
    if (defaultPlan) {
      await (defaultPlan.isTrial
        ? this.plansRepository.assignTrialPlanOnce(user.id, defaultPlan.id, undefined, new Date())
        : this.plansRepository.assignUserToPlan(user.id, defaultPlan.id));
    }

    this.logger.log(
      `register: created user ${user.id} role=USER plan=${defaultPlan?.slug ?? 'none'}`,
    );
    return { verificationRequired: true, user: await this.toUserSummary(user) };
  }

  async login(
    email: string,
    password: string,
    client: SessionClient = WEB_SESSION_CLIENT,
  ): Promise<LoginResult> {
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
    const tokens = await this.tokenSessionManager.issue(user, client);
    this.logger.log(`login: completed for user ${user.id}`);

    return { tokens, user: await this.toUserSummary(user) };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    this.logger.debug('refresh: validating refresh token');
    return { tokens: await this.tokenSessionManager.rotate(refreshToken) };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    this.logger.log(`logout: revoking current session for user ${userId}`);
    await this.tokenSessionManager.revokeCurrent(userId, sessionId);
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
}
