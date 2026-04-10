import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { UsersRepository } from "../repositories/users.repository";
import { hashPassword, verifyPassword } from "@common/utilities";
import { CreateUserDto } from "../dto/create-user.dto";
import { type ChangePasswordDto } from "../dto/change-password.dto";
import { type UpdateUserDto } from "../dto/update-user.dto";
import { type UpdatePreferencesDto } from "../dto/update-preferences.dto";
import { type ListUsersQueryDto } from "../dto/list-users-query.dto";
import {
  BusinessException,
  DuplicateEntityException,
  EntityNotFoundException,
} from "../../../common/errors";
import { type PaginatedResult } from "../../../common/types";
import { UserRole, UserStatus } from "../../../common/enums";
import { type SafeUser } from "../types/users.types";
import { toSafeUser } from "../service.utilities/to-safe-user.utility";
import { validatePasswordStrength } from "../service.utilities/password-policy.utility";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    this.logger.log(`create: creating user email=${dto.email} role=${dto.role}`);
    const passwordResult = validatePasswordStrength(dto.password);
    if (!passwordResult.valid) {
      throw new BusinessException(
        passwordResult.errors.join("; "),
        "WEAK_PASSWORD",
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingByEmail = await this.usersRepository.findByEmail(dto.email);
    if (existingByEmail) {
      throw new DuplicateEntityException("User", "email");
    }

    const existingByUsername = await this.usersRepository.findByUsername(dto.username);
    if (existingByUsername) {
      throw new DuplicateEntityException("User", "username");
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: dto.role,
      status: "ACTIVE",
    });

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
      throw new EntityNotFoundException("User", id);
    }
    return toSafeUser(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResult<SafeUser>> {
    const skip = (query.page - 1) * query.limit;
    const { users, total } = await this.usersRepository.findAll({
      skip,
      take: query.limit,
      filters: { search: query.search, role: query.role, status: query.status },
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
      throw new EntityNotFoundException("User", id);
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new DuplicateEntityException("User", "email");
      }
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.usersRepository.findByUsername(dto.username);
      if (existing) {
        throw new DuplicateEntityException("User", "username");
      }
    }

    const updated = await this.usersRepository.updateById(id, {
      email: dto.email,
      username: dto.username,
      role: dto.role,
      status: dto.status,
    });

    void this.rabbitMQService.publish(EventPattern.USER_CREATED, {
      userId: updated.id,
      actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async deactivateUser(id: string, actorId: string): Promise<SafeUser> {
    this.logger.log(`deactivateUser: deactivating user ${id} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException("User", id);
    }

    const updated = await this.usersRepository.updateById(id, {
      status: UserStatus.SUSPENDED,
    });

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
      throw new EntityNotFoundException("User", id);
    }

    const updated = await this.usersRepository.updateById(id, {
      status: UserStatus.ACTIVE,
    });

    void this.rabbitMQService.publish(EventPattern.USER_CREATED, {
      userId: id,
      actorId,
      timestamp: new Date().toISOString(),
    });

    return toSafeUser(updated);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<SafeUser> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException("User", userId);
    }

    const updated = await this.usersRepository.updatePreferences(userId, dto);
    return toSafeUser(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    this.logger.log(`changePassword: changing password for user ${userId}`);
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException("User", userId);
    }

    const isCurrentValid = await verifyPassword(user.passwordHash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new BusinessException("Current password is incorrect", "INVALID_CURRENT_PASSWORD", HttpStatus.BAD_REQUEST);
    }

    const passwordResult = validatePasswordStrength(dto.newPassword);
    if (!passwordResult.valid) {
      throw new BusinessException(
        passwordResult.errors.join("; "),
        "WEAK_PASSWORD",
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await hashPassword(dto.newPassword);
    await this.usersRepository.updateById(userId, { passwordHash: newHash });
    this.logger.log(`changePassword: completed for user ${userId}`);
  }

  async changeRole(id: string, role: UserRole, actorId: string): Promise<SafeUser> {
    this.logger.log(`changeRole: changing role for user ${id} to ${role} by actor ${actorId}`);
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new EntityNotFoundException("User", id);
    }

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
}
