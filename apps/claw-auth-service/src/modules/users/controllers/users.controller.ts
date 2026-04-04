import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { type SafeUser } from "../types/users.types";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CreateUserDto, createUserSchema } from "../dto/create-user.dto";
import { UpdateUserDto, updateUserSchema } from "../dto/update-user.dto";
import { ListUsersQueryDto, listUsersQuerySchema } from "../dto/list-users-query.dto";
import { ChangeRoleDto, changeRoleSchema } from "../dto/change-role.dto";
import { Roles } from "../../../app/decorators/roles.decorator";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { UserRole } from "../../../common/enums";
import { type PaginatedResult, type AuthenticatedUser } from "../../../common/types";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
  ): Promise<SafeUser> {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQueryDto,
  ): Promise<PaginatedResult<SafeUser>> {
    return this.usersService.findAll(query);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string): Promise<SafeUser> {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.updateUser(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  async deactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.deactivateUser(id, user.id);
  }

  @Patch(":id/reactivate")
  @Roles(UserRole.ADMIN)
  async reactivate(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.reactivateUser(id, user.id);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN)
  async changeRole(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(changeRoleSchema)) dto: ChangeRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SafeUser> {
    return this.usersService.changeRole(id, dto.role, user.id);
  }
}
