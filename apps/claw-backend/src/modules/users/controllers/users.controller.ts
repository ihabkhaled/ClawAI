import { Body, Controller, Get, Param, Post, Query, UsePipes } from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { SafeUser } from "../types/users.types";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { CreateUserDto, createUserSchema } from "../dto/create-user.dto";
import { Roles } from "../../../app/decorators/roles.decorator";
import { UserRole } from "../../../common/enums";
import { PaginatedResult } from "../../../common/types";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UsePipes(new ZodValidationPipe(createUserSchema))
  async create(@Body() dto: CreateUserDto): Promise<SafeUser> {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<PaginatedResult<SafeUser>> {
    return this.usersService.findAll(
      page ? Number.parseInt(page, 10) : undefined,
      limit ? Number.parseInt(limit, 10) : undefined,
    );
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  async findOne(@Param("id") id: string): Promise<SafeUser> {
    return this.usersService.findById(id);
  }
}
