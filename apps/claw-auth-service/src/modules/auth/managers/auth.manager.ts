import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../../generated/prisma';
import { burnPasswordVerification, hashPassword, verifyPassword } from '@common/utilities';
import { UserRole, UserStatus } from '../../../common/enums';
import { validatePasswordStrength } from '../../users/service.utilities/password-policy.utility';
import {
  AccountSuspendedException,
  BusinessException,
  DuplicateEntityException,
  EmailNotVerifiedException,
  InvalidCredentialsException,
  SignupPlanAssignmentFailedException,
} from '../../../common/errors';
import { isUniqueViolationOn } from '../utilities/unique-violation.utility';
import { RolesService } from '../../roles/services/roles.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { WEB_SESSION_CLIENT } from '../constants/token-session.constants';
import { TokenSessionManager } from './token-session.manager';
import {
  AuthUserSummary,
  LoginResult,
  RefreshResult,
  RegisteredAccount,
  UserProfile,
} from '../types/auth.types';
import type { SessionClient } from '../types/token-session.types';
import type { RegisterDto } from '../dto/register.dto';

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
  //
  // Every expected refusal leaves with a stable code (docs: the sign-up failure
  // table in apps/claw-auth-service/CLAUDE.md): WEAK_PASSWORD, DUPLICATE_ENTITY
  // (the one enumeration surface ADR-096 deliberately keeps), and
  // SIGNUP_PLAN_ASSIGNMENT_FAILED. Only a genuinely unexpected fault is a 500.
  async register(dto: RegisterDto): Promise<RegisteredAccount> {
    this.logger.log(`register: attempting registration for email=${dto.email}`);
    const strength = validatePasswordStrength(dto.password);
    if (!strength.valid) {
      throw new BusinessException(strength.errors[0] ?? 'Weak password', 'WEAK_PASSWORD');
    }

    const existing = await this.authRepository.findUserByEmail(dto.email);
    if (existing) {
      throw new DuplicateEntityException('User', 'email');
    }

    const user = await this.createPendingUser(dto);
    const planSlug = await this.assignDefaultPlanOrUndo(user);

    this.logger.log(`register: created user ${user.id} role=USER plan=${planSlug ?? 'none'}`);
    return { verificationRequired: true, user: await this.toUserSummary(user) };
  }

  // Two sign-ups for the same address can both pass the lookup above; the
  // loser hits the unique index. That is still "address taken", not a 500.
  private async createPendingUser(dto: RegisterDto): Promise<User> {
    const username = await this.deriveUniqueUsername(dto.email);
    const passwordHash = await hashPassword(dto.password);
    const roleId = await this.rolesService.getDefaultUserRoleId();
    try {
      return await this.authRepository.createUser({
        email: dto.email,
        username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        ...(dto.phone ? { phone: dto.phone } : {}),
        role: UserRole.USER,
        ...(roleId ? { roleRef: { connect: { id: roleId } } } : {}),
        status: UserStatus.PENDING,
        mustChangePassword: false,
        ...(dto.languagePreference ? { languagePreference: dto.languagePreference } : {}),
      });
    } catch (error: unknown) {
      if (isUniqueViolationOn(error, 'email')) {
        throw new DuplicateEntityException('User', 'email');
      }
      throw error;
    }
  }

  // The user row and the plan are written by two repositories, so this is a
  // compensating step rather than one transaction: if the plan cannot be
  // assigned, the half-made account is deleted before the error leaves. A user
  // row with no plan used to survive here, and the retry then failed with
  // "address already registered" for an account nobody could use.
  // No default plan configured is not a failure (downstream treats it as
  // unrestricted); the seed always provides one.
  private async assignDefaultPlanOrUndo(user: User): Promise<string | null> {
    const defaultPlan = await this.plansRepository.findDefault();
    if (!defaultPlan) {
      return null;
    }
    try {
      await (defaultPlan.isTrial
        ? this.plansRepository.assignTrialPlanOnce(user.id, defaultPlan.id, undefined, new Date())
        : this.plansRepository.assignDefaultPlan(user.id, defaultPlan.id));
      return defaultPlan.slug;
    } catch (error: unknown) {
      this.logger.error(
        `register: plan '${defaultPlan.slug}' could not be assigned to user ${user.id}; removing the account`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.undoUserCreation(user.id);
      throw new SignupPlanAssignmentFailedException();
    }
  }

  private async undoUserCreation(userId: string): Promise<void> {
    try {
      await this.authRepository.deleteUserById(userId);
    } catch (error: unknown) {
      // Logged loudly because it leaves an orphan an operator must remove; the
      // user still gets the specific code, not a generic 500.
      this.logger.error(
        `register: compensation failed, user ${userId} left without a plan`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async login(
    email: string,
    password: string,
    client: SessionClient = WEB_SESSION_CLIENT,
  ): Promise<LoginResult> {
    this.logger.log(`login: looking up user by email=${email}`);
    const user = await this.authRepository.findUserByEmail(email);
    // The password is ALWAYS checked first, before any account-state branch,
    // and an unknown email still pays for a full argon2 verification. That
    // ordering is the whole anti-enumeration design (ADR-096):
    //   - unknown email  → INVALID_CREDENTIALS, same cost, same body
    //   - wrong password → INVALID_CREDENTIALS, same cost, same body
    // so a stranger learns nothing about which addresses have accounts, from
    // the response OR from a stopwatch. Only once the password has verified
    // has the caller proved the account is theirs — and only then is it safe
    // to say why they are still being refused.
    const isValid =
      user === null
        ? await burnPasswordVerification(password)
        : await verifyPassword(user.passwordHash, password);
    if (user === null || !isValid) {
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AccountSuspendedException();
    }

    if (user.status === UserStatus.PENDING) {
      // Right password, unconfirmed address. Naming this is what turns a dead
      // end ("login failed") into an action the user can take.
      throw new EmailNotVerifiedException();
    }

    if (user.status !== UserStatus.ACTIVE) {
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
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      permissions,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      isSuperAdmin: user.isSuperAdmin,
      languagePreference: user.languagePreference,
      appearancePreference: user.appearancePreference,
      // Display currency travels with the profile, because the client resolves
      // it on load: without these fields a MANUAL preference saved on another
      // device would be stored, returned by the preferences endpoint, and
      // invisible to the only screen that reads a profile.
      currencyPreferenceMode: user.currencyPreferenceMode,
      preferredCountryCode: user.preferredCountryCode,
      preferredCurrencyCode: user.preferredCurrencyCode,
      ttsVoice: user.ttsVoice,
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
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      permissions,
      mustChangePassword: user.mustChangePassword,
      isSuperAdmin: user.isSuperAdmin,
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
