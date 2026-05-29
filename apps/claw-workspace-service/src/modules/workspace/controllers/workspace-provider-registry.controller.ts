import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser, Roles } from '@claw/shared-auth';
import { type AuthenticatedUser, Permission, UserRole } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { WorkspaceProvider, WorkspaceProviderDefinition } from '../../../generated/prisma';
import {
  type CreateProviderAppConfigDto,
  createProviderAppConfigSchema,
  type ListProviderAppConfigsQueryDto,
  listProviderAppConfigsQuerySchema,
  type UpdateProviderAppConfigDto,
  updateProviderAppConfigSchema,
} from '../dto/provider-app-config.dto';
import { ProviderAppConfigService } from '../services/provider-app-config.service';
import { ProviderRegistryService } from '../services/provider-registry.service';
import type { ProviderAppConfigPublic } from '../types/provider-config.types';

@Controller('workspace')
export class WorkspaceProviderRegistryController {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly appConfigs: ProviderAppConfigService,
  ) {}

  @Get('providers')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  listProviders(): Promise<WorkspaceProviderDefinition[]> {
    return this.registry.list();
  }

  @Get('providers/:provider')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
  getProvider(@Param('provider') provider: string): Promise<WorkspaceProviderDefinition> {
    return this.registry.getByProvider(provider as WorkspaceProvider);
  }

  @Get('provider-app-configs')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
  listAppConfigs(
    @Query(new ZodValidationPipe(listProviderAppConfigsQuerySchema))
    query: ListProviderAppConfigsQueryDto,
  ): Promise<ProviderAppConfigPublic[]> {
    return this.appConfigs.list(query.provider);
  }

  @Post('provider-app-configs')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  createAppConfig(
    @Body(new ZodValidationPipe(createProviderAppConfigSchema)) dto: CreateProviderAppConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProviderAppConfigPublic> {
    return this.appConfigs.create(dto, user.id);
  }

  @Get('provider-app-configs/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
  getAppConfig(@Param('id') id: string): Promise<ProviderAppConfigPublic> {
    return this.appConfigs.getById(id);
  }

  @Put('provider-app-configs/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
  updateAppConfig(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProviderAppConfigSchema)) dto: UpdateProviderAppConfigDto,
  ): Promise<ProviderAppConfigPublic> {
    return this.appConfigs.update(id, dto);
  }

  @Delete('provider-app-configs/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_WORKSPACE_AUTOMATION_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAppConfig(@Param('id') id: string): Promise<void> {
    await this.appConfigs.delete(id);
  }
}
