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
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { RouterModelsService } from '../services/router-models.service';
import {
  type ListRouterModelsQueryDto,
  listRouterModelsQuerySchema,
} from '../dto/list-router-models-query.dto';
import { type CreateRouterModelDto, createRouterModelSchema } from '../dto/create-router-model.dto';
import { type UpdateRouterModelDto, updateRouterModelSchema } from '../dto/update-router-model.dto';
import {
  type RouterAdminOverrideRecord,
  type RouterModelRegistryRecord,
} from '../types/router-model-registry.types';

@Controller('routing/models')
export class RouterModelsController {
  constructor(private readonly service: RouterModelsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listRouterModelsQuerySchema))
    query: ListRouterModelsQueryDto,
  ): Promise<PaginatedResult<RouterModelRegistryRecord>> {
    return this.service.list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<RouterModelRegistryRecord> {
    return this.service.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async create(
    @Body(new ZodValidationPipe(createRouterModelSchema)) dto: CreateRouterModelDto,
  ): Promise<RouterModelRegistryRecord> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRouterModelSchema)) dto: UpdateRouterModelDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RouterModelRegistryRecord> {
    return this.service.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async softDelete(@Param('id') id: string): Promise<RouterModelRegistryRecord> {
    return this.service.softDelete(id);
  }

  @Get(':id/overrides')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async listOverrides(@Param('id') id: string): Promise<RouterAdminOverrideRecord[]> {
    return this.service.listOverrides(id);
  }

  @Delete(':id/overrides/:fieldName')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearOverride(
    @Param('id') id: string,
    @Param('fieldName') fieldName: string,
  ): Promise<void> {
    await this.service.clearOverride(id, fieldName);
  }
}
