import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { UsersRepository } from '../repositories/users.repository';
import { hashPassword, verifyPassword } from '@common/utilities';
import { CreateUserDto } from '../dto/create-user.dto';
import { type ChangePasswordDto } from '../dto/change-password.dto';
import { type UpdateUserDto } from '../dto/update-user.dto';
import { type UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { type ListUsersQueryDto } from '../dto/list-users-query.dto';
import { type DeleteOwnAccountDto, type UpdateOwnProfileDto } from '../dto/account-profile.dto';
import {
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
} from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { UserRole, UserStatus } from '../../../common/enums';
import { SuperAdminMutationScope } from '../../../common/enums/super-admin-mutation-scope.enum';
import { USER_NOT_PENDING_CODE } from '../../../common/constants/user-status.constants';
import {
  SUPER_ADMIN_IMMUTABLE_CODE,
  SUPER_ADMIN_IMMUTABLE_MESSAGE,
  SUPER_ADMIN_REFUSED_ACTOR_ACTION,
  SUPER_ADMIN_REFUSED_SELF_ACTION,
  SUPER_ADMIN_REFUSED_TARGET_ACTION,
  SUPER_ADMIN_REQUIRED_CODE,
  SUPER_ADMIN_REQUIRED_MESSAGE,
  SUPER_ADMIN_SELF_LOCKED_CODE,
  SUPER_ADMIN_SELF_LOCKED_MESSAGE,
} from '../../../common/constants/super-admin.constants';
import { type User } from '../../../generated/prisma';
import { type SafeUser } from '../types/users.types';
import { toSafeUser } from '../service.utilities/to-safe-user.utility';
import { validatePasswordStrength } from '../service.utilities/password-policy.utility';
import { resolveSuperAdminMutability } from '../service.utilities/super-admin-mutability.utility';
import { randomBytes } from 'node:crypto';
import { AuthEmailAdapter } from '../../auth/adapters/auth-email.adapter';
import { RolesService } from '../../roles/services/roles.service';
import { PlansRepository } from '../../plans/repositories/plans.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rabbitMQService: RabbitMQService,
    private readonly authEmailAdapter: AuthEmailAdapter,
    private readonly rolesService: RolesService,
    private readonly plansRepository: PlansRepository,
  ) {}

  async create(dto: CreateUserDto, actorId: string): Promise<SafeUser> {
    this.logger.log(
      `create: creating user email=${dto.email} role=${dto.role} by actor ${actorId}`,
    );
    // Minting an administrator is an administrator-class mutation even though no
    // existing row is touched: without this gate any holder of ADMIN_USERS_MANAGE
    // could create a peer administrator, which is the same escalation that
    // changeRole already refuses.
    await this.assertSuperAdminActorForAdminMutation(actorId, dto.role === UserRole.ADMIN);
    const passwordResult = validatePasswordStrength(dto.password);
    if (!passwordResult.valid) {
      throw new BusinessException(
        passwordResult.errors.join('; '),
        'WEAK_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingByEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new DuplicateEntityException('User', 'email');
    }

    const existingByUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingByUsername) {
      throw new DuplicateEntityException('User', 'username');
    }

    const passwordHash = await hashPassword(dto.password);
    const roleId = await this.rolesService.getRoleIdBySlug(dto.role);

    // An administrator vouching for an address is the verification. Creating the
    // row PENDING with emailVerifiedAt null — which is what this did before —
    // stranded the account behind an email wall it was never sent a link for,
    // and login hard-blocks anything that is not ACTIVE.
    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      ...(roleId ? { roleRef: { connect: { id: roleId } } } : {}),
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      // The creating administrator knows this password. Forcing the rotation
      // stops an administrator-known credential from becoming the standing one.
      mustChangePassword: true,
    });

    await this.assignSignupPlan(user.id);

    this.logger.log(`create: created user ${user.id}`);
    await this.rabbitMQService.publish(EventPattern.USER_CREATED, {
      userId: user.id,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(user);
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return toSafeUser(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResult<SafeUser>> {
    const skip = (query.page - 1) * query.limit;
    const { users, total } = await this.usersRepository.findAll({
      skip,
      take: query.limit,
      filters: {
        search: query.search,
        role: query.role,
        status: query.status,
        planId: query.planId,
        verification: query.verification,
      },
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: users.map(toSafeUser),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string): Promise<SafeUser> {
    this.logger.log(`updateUser: updating user ${id} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }

    // This endpoint carries three different classes of change behind one body.
    // Assert each against its own scope: the super administrator may rename
    // themselves here, but role and status stay locked even for them, and a
    // non-super administrator may not reach role or status on any administrator
    // at all — which was the hole that made every other protection decorative.
    this.assertMutable(user, actorId, SuperAdminMutationScope.PROFILE);
    if (dto.role !== undefined) {
      this.assertMutable(user, actorId, SuperAdminMutationScope.ROLE);
    }
    if (dto.status !== undefined) {
      this.assertMutable(user, actorId, SuperAdminMutationScope.STATUS);
    }
    await this.assertSuperAdminActorForAdminMutation(
      actorId,
      (dto.role !== undefined || dto.status !== undefined) &&
        (user.role === UserRole.ADMIN || dto.role === UserRole.ADMIN),
    );

    if (dto.username && dto.username !== user.username) {
      const existing = await this.usersRepository.findByUsername(dto.username);
      if (existing) {
        throw new DuplicateEntityException('User', 'username');
      }
    }

    const updated = await this.usersRepository.updateById(id, {
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      status: dto.status,
    });

    // Was USER_CREATED with an actorId field, which satisfies no payload type
    // and which nothing subscribes to — an update is not a creation.
    void this.rabbitMQService.publish(EventPattern.USER_UPDATED, {
      userId: updated.id,
      updatedBy: actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateOwnProfileDto,
    sessionId: string,
  ): Promise<SafeUser> {
    const user = await this.requireUserWithValidPassword(userId, dto.currentPassword);
    await this.ensureProfileFieldsAvailable(user.username, dto);
    const updated = await this.usersRepository.updateById(userId, {
      username: dto.username,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    // Only a username change alters how the account is identified, so only that
    // warrants tearing down sessions, and the caller's own session is spared:
    // renaming yourself is not a credential change, and signing the user out of
    // the tab they are editing in made an ordinary rename feel like a lockout.
    const usernameChanged = dto.username !== undefined && dto.username !== user.username;
    if (usernameChanged) {
      await this.usersRepository.revokeOtherSessionsByUserId(userId, sessionId);
    }
    this.logger.log(
      `updateOwnProfile: updated user ${userId}${usernameChanged ? ' and revoked other sessions' : ''}`,
    );
    return toSafeUser(updated);
  }

  async deleteOwnAccount(userId: string, dto: DeleteOwnAccountDto): Promise<void> {
    const user = await this.requireUserWithValidPassword(userId, dto.currentPassword);
    // Self-deletion stays refused even for the super administrator: the partial
    // unique index guarantees at most one, and nothing re-creates it except a
    // fresh seed against an empty admin table.
    this.assertMutable(user, userId, SuperAdminMutationScope.DELETE);
    await this.usersRepository.revokeSessionsByUserId(userId);
    await this.usersRepository.deleteById(userId);
    this.logger.log(`deleteOwnAccount: deleted user ${userId}`);
  }

  async deactivateUser(id: string, actorId: string): Promise<SafeUser> {
    this.logger.log(`deactivateUser: deactivating user ${id} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    this.assertMutable(user, actorId, SuperAdminMutationScope.STATUS);
    await this.assertSuperAdminActorForAdminMutation(actorId, user.role === UserRole.ADMIN);

    const updated = await this.usersRepository.updateById(id, {
      status: UserStatus.SUSPENDED,
    });

    await this.usersRepository.revokeSessionsByUserId(id);

    await this.rabbitMQService.publish(EventPattern.USER_DEACTIVATED, {
      userId: id,
      deactivatedBy: actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async reactivateUser(id: string, actorId: string): Promise<SafeUser> {
    this.logger.log(`reactivateUser: reactivating user ${id} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    this.assertMutable(user, actorId, SuperAdminMutationScope.STATUS);
    await this.assertSuperAdminActorForAdminMutation(actorId, user.role === UserRole.ADMIN);

    const updated = await this.usersRepository.updateById(id, {
      status: UserStatus.ACTIVE,
    });

    void this.rabbitMQService.publish(EventPattern.USER_REACTIVATED, {
      userId: id,
      reactivatedBy: actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  /**
   * Clears a PENDING account's email wall by administrator decision.
   *
   * Separate from `reactivateUser`, which lifts a suspension. The two look alike
   * in the table and are different security events: this one asserts that an
   * administrator vouched for the address, so it sets `emailVerifiedAt` and
   * burns the outstanding verification token as well as the status. Reusing
   * reactivate for it — which is what the generic update endpoint effectively
   * did — left the account ACTIVE but unverified, with its emailed link still
   * live.
   */
  async activatePendingUser(id: string, actorId: string): Promise<SafeUser> {
    this.logger.log(`activatePendingUser: activating user ${id} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    this.assertMutable(user, actorId, SuperAdminMutationScope.STATUS);
    await this.assertSuperAdminActorForAdminMutation(actorId, user.role === UserRole.ADMIN);

    if (user.status !== UserStatus.PENDING) {
      throw new BusinessException(
        'Only a pending account can be activated',
        USER_NOT_PENDING_CODE,
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.usersRepository.activateAndVerify(id, new Date());

    await this.rabbitMQService.publish(EventPattern.USER_ACTIVATED, {
      userId: id,
      activatedBy: actorId,
      previousStatus: user.status,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<SafeUser> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    const updated = await this.usersRepository.updatePreferences(userId, dto);
    return toSafeUser(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    this.logger.log(`changePassword: changing password for user ${userId}`);
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    const isCurrentValid = await verifyPassword(user.passwordHash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new BusinessException(
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }

    const passwordResult = validatePasswordStrength(dto.newPassword);
    if (!passwordResult.valid) {
      throw new BusinessException(
        passwordResult.errors.join('; '),
        'WEAK_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.usersRepository.updateById(userId, {
      passwordHash: newHash,
      mustChangePassword: false,
    });
    this.logger.log(`changePassword: completed for user ${userId}`);
  }

  /**
   * The actor half of the invariant: does this caller hold super-administrator
   * authority at all?
   *
   * A database read rather than a token claim, deliberately. Adding
   * `isSuperAdmin` to the access token would leave every already-issued token
   * without it until expiry, so the claim would be absent exactly when it is
   * first needed.
   */
  async assertSuperAdminActor(actorId: string): Promise<void> {
    const actor = await this.usersRepository.findById(actorId);
    if (actor?.isSuperAdmin === true) return;

    this.logger.warn(`${SUPER_ADMIN_REFUSED_ACTOR_ACTION}: actor=${actorId}`);
    throw new BusinessException(
      SUPER_ADMIN_REQUIRED_MESSAGE,
      SUPER_ADMIN_REQUIRED_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  async changeRole(id: string, role: UserRole, actorId: string): Promise<SafeUser> {
    this.logger.log(`changeRole: changing role for user ${id} to ${role} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    this.assertMutable(user, actorId, SuperAdminMutationScope.ROLE);
    await this.assertSuperAdminActorForAdminMutation(
      actorId,
      user.role === UserRole.ADMIN || role === UserRole.ADMIN,
    );

    const previousRole = user.role;
    this.logger.log(`changeRole: user ${id} role changing from ${previousRole} to ${role}`);
    const updated = await this.usersRepository.updateById(id, { role });

    await this.rabbitMQService.publish(EventPattern.USER_ROLE_CHANGED, {
      userId: id,
      previousRole,
      newRole: role,
      changedBy: actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async issueTemporaryPassword(id: string, actorId: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new EntityNotFoundException('User', id);
    this.assertMutable(user, actorId, SuperAdminMutationScope.TEMPORARY_PASSWORD);
    await this.assertSuperAdminActorForAdminMutation(actorId, user.role === UserRole.ADMIN);
    const temporaryPassword = `${randomBytes(12).toString('base64url')}!Aa1`;
    const passwordHash = await hashPassword(temporaryPassword);
    await this.authEmailAdapter.sendTemporaryPassword(user.email, temporaryPassword);
    // Residual safe-direction failure: if updateById fails after the email is sent,
    // the emailed temporary password will not work, but the user's existing password
    // still works, so they are not locked out.
    await this.usersRepository.updateById(id, { passwordHash, mustChangePassword: true });
    await this.usersRepository.revokeSessionsByUserId(id);
    await this.rabbitMQService.publish(EventPattern.USER_TEMPORARY_PASSWORD_ISSUED, {
      userId: id,
      issuedBy: actorId,
      timestamp: new Date().toISOString(),
    });
  }

  private async requireUserWithValidPassword(userId: string, password: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      throw new BusinessException(
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
        HttpStatus.BAD_REQUEST,
      );
    }
    return user;
  }

  /**
   * Refuses a mutation whose TARGET is shielded from this actor.
   *
   * Repeated refusals are a security signal, so each one is logged with the
   * actor, the target and the scope rather than vanishing into a bare throw.
   */
  private assertMutable(user: User, actorId: string, scope: SuperAdminMutationScope): void {
    const outcome = resolveSuperAdminMutability({
      target: { id: user.id, isSuperAdmin: user.isSuperAdmin },
      actorId,
      scope,
    });
    if (outcome.allowed) return;

    if (outcome.reason === 'IMMUTABLE_TO_OTHERS') {
      this.logger.warn(
        `${SUPER_ADMIN_REFUSED_TARGET_ACTION}: actor=${actorId} target=${user.id} scope=${scope}`,
      );
      throw new BusinessException(
        SUPER_ADMIN_IMMUTABLE_MESSAGE,
        SUPER_ADMIN_IMMUTABLE_CODE,
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.warn(
      `${SUPER_ADMIN_REFUSED_SELF_ACTION}: actor=${actorId} target=${user.id} scope=${scope}`,
    );
    throw new BusinessException(
      SUPER_ADMIN_SELF_LOCKED_MESSAGE,
      SUPER_ADMIN_SELF_LOCKED_CODE,
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * Refuses a mutation whose ACTOR lacks super-administrator authority.
   *
   * The other half of the invariant. Target protection alone is decorative: an
   * administrator who can promote themselves simply does that first, then acts.
   */
  private async assertSuperAdminActorForAdminMutation(
    actorId: string,
    adminMutation: boolean,
  ): Promise<void> {
    if (!adminMutation) return;
    await this.assertSuperAdminActor(actorId);
  }

  /**
   * Grants the plan a new signup receives, mirroring self-registration.
   *
   * Non-fatal, exactly as in AuthManager.register: an account without a plan is
   * still a usable account, but normally the signup plan exists from seed.
   */
  private async assignSignupPlan(userId: string): Promise<void> {
    const signupPlan = await this.plansRepository.findDefault();
    if (!signupPlan) {
      this.logger.warn(`assignSignupPlan: no signup plan configured; user ${userId} has none`);
      return;
    }
    await (signupPlan.isTrial
      ? this.plansRepository.assignTrialPlanOnce(userId, signupPlan.id, undefined, new Date())
      : this.plansRepository.assignUserToPlan(userId, signupPlan.id));
  }

  private async ensureProfileFieldsAvailable(
    currentUsername: string,
    dto: UpdateOwnProfileDto,
  ): Promise<void> {
    if (
      dto.username &&
      dto.username !== currentUsername &&
      (await this.usersRepository.findByUsername(dto.username))
    ) {
      throw new DuplicateEntityException('User', 'username');
    }
  }
}
