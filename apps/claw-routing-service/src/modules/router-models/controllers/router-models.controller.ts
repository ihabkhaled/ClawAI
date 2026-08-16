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
import { ModelDiscoveryService } from '../services/model-discovery.service';
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
import type { AliasResolutionResult, DiscoveryImportResult } from '../types/model-discovery.types';

@Controller('routing/models')
export class RouterModelsController {
  constructor(
    private readonly service: RouterModelsService,
    private readonly discoveryService: ModelDiscoveryService,
  ) {}

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

  /**
   * On-demand trigger for ModelDiscoveryService.run() — importing connector
   * catalogs and resolving RouterChainEntry aliases against them. Built
   * live (2026-08-16): the service existed, fully implemented and tested in
   * isolation since Batch 10, with no caller anywhere — no cron, no event
   * listener, no CLI script. An admin editing chain entries (which always
   * resets deploymentId to null on every entry, by that endpoint's own
   * declarative-replace design) had no way to get them re-resolved short of
   * a database write. An admin action, not a schedule: discovery mutates
   * which deployments the live router chain can select, so it should be a
   * deliberate step, not a silent background process — matching how
   * publish/enable already work for router configuration.
   */
  @Post('discovery/run')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.ADMIN_MODELS_MANAGE)
  async runDiscovery(): Promise<{
    imported: DiscoveryImportResult | null;
    aliases: AliasResolutionResult;
  }> {
    return this.discoveryService.run();
  }
}
