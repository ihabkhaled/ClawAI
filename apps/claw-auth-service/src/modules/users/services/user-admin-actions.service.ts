import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { hashPassword } from '@common/utilities';
import { BanDurationUnit, UserRole } from '../../../common/enums';
import { SuperAdminMutationScope } from '../../../common/enums/super-admin-mutation-scope.enum';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { SessionRevocationCacheService } from '../../auth/services/session-revocation-cache.service';
import {
  CANNOT_BAN_SELF_CODE,
  CANNOT_SET_OWN_PASSWORD_CODE,
  USER_NOT_BANNED_CODE,
} from '../constants/user-admin.constants';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { type BanUserDto } from '../dto/ban-user.dto';
import { type SetUserPasswordDto } from '../dto/set-user-password.dto';
import { UsersRepository } from '../repositories/users.repository';
import { computeBannedUntil } from '../service.utilities/ban-state.utility';
import { generateStrongPassword } from '../service.utilities/generate-password.utility';
import { validatePasswordStrength } from '../service.utilities/password-policy.utility';
import { toAdminUser } from '../service.utilities/to-admin-user.utility';
import { type AdminUser } from '../types/users.types';
import { UsersService } from './users.service';

/**
 * The three administrator actions that cut an account off or re-key it (ADR-200):
 * ban, unban, and setting a password by hand or by generation. Each one resolves
 * the target, applies the super-administrator invariant (UsersService), changes
 * the row, then closes every open session AND publishes the closed ids so each
 * service's SessionRevocationGuard refuses the still-unexpired access tokens (ADR-112).
 *
 * Nothing here logs a reason or a password; ids and durations only.
 */
@Injectable()
export class UserAdminActionsService {
  private readonly logger = new Logger(UserAdminActionsService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly revocationCache: SessionRevocationCacheService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async ban(id: string, dto: BanUserDto, actorId: string): Promise<AdminUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new EntityNotFoundException('User', id);
    if (id === actorId) {
      throw new BusinessException(
        'You cannot ban your own account',
        CANNOT_BAN_SELF_CODE,
        HttpStatus.FORBIDDEN,
      );
    }
    this.usersService.assertMutable(user, actorId, SuperAdminMutationScope.BAN);
    await this.usersService.assertSuperAdminActorForAdminMutation(
      actorId,
      user.role === UserRole.ADMIN,
    );

    const now = new Date();
    const bannedUntil = computeBannedUntil(dto.unit, dto.amount, now);
    const updated = await this.usersRepository.updateById(id, {
      bannedAt: now,
      bannedUntil,
      banReason: dto.reason,
      bannedByUserId: actorId,
    });
    await this.closeSessions(id, SessionTerminationReason.ACCOUNT_BANNED);
    this.logger.log(
      `ban: user ${id} by actor ${actorId} ${dto.unit === BanDurationUnit.LIFETIME ? 'lifetime' : `until ${bannedUntil?.toISOString() ?? 'n/a'}`}`,
    );
    await this.publishUpdated(id, actorId);
    return toAdminUser(updated, now);
  }

  async unban(id: string, actorId: string): Promise<AdminUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new EntityNotFoundException('User', id);
    this.usersService.assertMutable(user, actorId, SuperAdminMutationScope.BAN);
    await this.usersService.assertSuperAdminActorForAdminMutation(
      actorId,
      user.role === UserRole.ADMIN,
    );
    if (user.bannedAt === null) {
      throw new BusinessException(
        'This account is not banned',
        USER_NOT_BANNED_CODE,
        HttpStatus.CONFLICT,
      );
    }
    const updated = await this.usersRepository.clearBan(id);
    this.logger.log(`unban: user ${id} by actor ${actorId}`);
    await this.publishUpdated(id, actorId);
    return toAdminUser(updated);
  }

  /**
   * Sets a password the administrator chose, or generates one and returns it ONCE.
   * The target must rotate it at next sign-in (mustChangePassword) and every open
   * session is revoked. Refused for the caller's own account: changing your own
   * password without the current one belongs to /users/me/password.
   */
  async setPassword(
    id: string,
    dto: SetUserPasswordDto,
    actorId: string,
  ): Promise<{ generatedPassword?: string }> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new EntityNotFoundException('User', id);
    if (id === actorId) {
      throw new BusinessException(
        'Change your own password from your account settings',
        CANNOT_SET_OWN_PASSWORD_CODE,
        HttpStatus.FORBIDDEN,
      );
    }
    this.usersService.assertMutable(user, actorId, SuperAdminMutationScope.TEMPORARY_PASSWORD);
    await this.usersService.assertSuperAdminActorForAdminMutation(
      actorId,
      user.role === UserRole.ADMIN,
    );

    const password = dto.mode === 'GENERATE' ? generateStrongPassword() : dto.password;
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      throw new BusinessException(
        strength.errors.join('; '),
        'WEAK_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordHash = await hashPassword(password);
    await this.usersRepository.updateById(id, { passwordHash, mustChangePassword: true });
    await this.closeSessions(id, SessionTerminationReason.PASSWORD_CHANGED);
    this.logger.log(`setPassword: ${dto.mode} password set for user ${id} by actor ${actorId}`);
    await this.rabbitMQService.publish(EventPattern.USER_TEMPORARY_PASSWORD_ISSUED, {
      userId: id,
      issuedBy: actorId,
      timestamp: new Date().toISOString(),
    });
    return dto.mode === 'GENERATE' ? { generatedPassword: password } : {};
  }

  /** Revoke in the database, then publish the ids so access tokens die now, not at expiry (ADR-112). */
  private async closeSessions(userId: string, reason: SessionTerminationReason): Promise<void> {
    const revokedIds = await this.usersRepository.revokeSessionsReturningIds(userId, reason);
    await this.revocationCache.revoke(revokedIds);
  }

  private async publishUpdated(userId: string, actorId: string): Promise<void> {
    await this.rabbitMQService.publish(EventPattern.USER_UPDATED, {
      userId,
      updatedBy: actorId,
      timestamp: new Date().toISOString(),
    });
  }
}
