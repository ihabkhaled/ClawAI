import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  type CancelEmailChangeDto,
  cancelEmailChangeSchema,
  type ConfirmOldEmailOtpDto,
  confirmOldEmailOtpSchema,
  type RequestEmailChangeDto,
  requestEmailChangeSchema,
  type ResendEmailChangeOtpDto,
  resendEmailChangeOtpSchema,
} from '../../auth/dto/email-change.dto';
import { EmailChangeService } from '../../auth/services/email-change.service';
import type { PendingEmailChangeState } from '../../auth/types/email-change.types';
import { UsersService } from '../services/users.service';
import { type SafeUser } from '../types/users.types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CreateUserDto, createUserSchema } from '../dto/create-user.dto';
import { UpdateUserDto, updateUserSchema } from '../dto/update-user.dto';
import { ListUsersQueryDto, listUsersQuerySchema } from '../dto/list-users-query.dto';
import { ChangeRoleDto, changeRoleSchema } from '../dto/change-role.dto';
import { ChangePasswordDto, changePasswordSchema } from '../dto/change-password.dto';
import { UpdatePreferencesDto, updatePreferencesSchema } from '../dto/update-preferences.dto';
import { Roles } from '../../../app/decorators/roles.decorator';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums';
import { Permission } from '@claw/shared-types';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import {
  type DeleteOwnAccountDto,
  deleteOwnAccountSchema,
  type UpdateOwnProfileDto,
  updateOwnProfileSchema,
} from '../dto/account-profile.dto';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailChangeService: EmailChangeService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.create(dto, actor.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async findAll(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQueryDto,
  ): Promise<PaginatedResult<SafeUser>> {
    return this.usersService.findAll(query);
  }

  @Patch('me/preferences')
  async updateMyPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updatePreferencesSchema)) dto: UpdatePreferencesDto,
  ): Promise<SafeUser> {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeMyPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(user.id, dto);
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateOwnProfileSchema)) dto: UpdateOwnProfileDto,
  ): Promise<SafeUser> {
    return this.usersService.updateOwnProfile(user.id, dto, user.sessionId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(deleteOwnAccountSchema)) dto: DeleteOwnAccountDto,
  ): Promise<void> {
    return this.usersService.deleteOwnAccount(user.id, dto);
  }

  @Post('me/email-change')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(requestEmailChangeSchema)) dto: RequestEmailChangeDto,
  ): Promise<{ requestId: string; expiresAt: Date }> {
    return this.emailChangeService.requestEmailChange(user.id, dto.currentPassword, dto.newEmail);
  }

  @Post('me/email-change/verify-current')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verifyCurrentEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(confirmOldEmailOtpSchema)) dto: ConfirmOldEmailOtpDto,
  ): Promise<{ pendingEmailSent: boolean }> {
    return this.emailChangeService.verifyCurrentEmail(user.id, dto.requestId, dto.otp);
  }

  @Post('me/email-change/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resendCurrentEmailOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(resendEmailChangeOtpSchema)) dto: ResendEmailChangeOtpDto,
  ): Promise<{ accepted: true }> {
    return this.emailChangeService.resendCurrentEmailOtp(user.id, dto.requestId);
  }

  @Get('me/email-change')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async getPendingEmailChange(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PendingEmailChangeState | null> {
    return this.emailChangeService.getPendingEmailChange(user.id);
  }

  @Delete('me/email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async cancelEmailChange(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(cancelEmailChangeSchema)) dto: CancelEmailChangeDto,
  ): Promise<void> {
    return this.emailChangeService.cancelEmailChange(user.id, dto.requestId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async findOne(@Param('id') id: string): Promise<SafeUser> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.updateUser(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.deactivateUser(id, user.id);
  }

  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async reactivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.reactivateUser(id, user.id);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  async changeRole(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeRoleSchema)) dto: ChangeRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.changeRole(id, dto.role, user.id);
  }

  @Post(':id/temporary-password')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_USERS_MANAGE)
  @HttpCode(HttpStatus.ACCEPTED)
  async issueTemporaryPassword(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.usersService.issueTemporaryPassword(id, user.id);
  }
}
