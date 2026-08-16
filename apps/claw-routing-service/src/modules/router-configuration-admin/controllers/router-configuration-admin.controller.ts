import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { RouterConfigurationAdminService } from '../services/router-configuration-admin.service';
import {
  type CreateRouterConfigurationDto,
  createRouterConfigurationSchema,
} from '../dto/create-router-configuration.dto';
import {
  type ListRouterConfigurationsQueryDto,
  listRouterConfigurationsQuerySchema,
} from '../dto/list-router-configurations-query.dto';
import { type ScopeQueryDto, scopeQuerySchema } from '../dto/scope-query.dto';
import {
  type UpdateChainEntriesDto,
  updateChainEntriesSchema,
} from '../dto/update-chain-entries.dto';
import {
  type UpdateRouterConfigurationFieldsDto,
  updateRouterConfigurationFieldsSchema,
} from '../dto/update-router-configuration-fields.dto';
import type {
  RouterConfigurationDetail,
  RouterConfigurationSummary,
} from '../types/router-configuration-admin.types';

// Reuses the same class-level guard as RoutingController: config revisions and
// their chain entries are global routing policy, not per-user data, so ADMIN
// and OPERATOR are the only roles that can read or write them. No new
// permission — ADMIN_ROUTING_MANAGE already covers this surface.
@Controller('routing/configurations')
@Roles(UserRole.ADMIN, UserRole.OPERATOR)
@RequirePermissions(Permission.ADMIN_ROUTING_MANAGE)
export class RouterConfigurationAdminController {
  constructor(private readonly service: RouterConfigurationAdminService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listRouterConfigurationsQuerySchema))
    query: ListRouterConfigurationsQueryDto,
  ): Promise<PaginatedResult<RouterConfigurationSummary>> {
    return this.service.list(query);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createRouterConfigurationSchema)) dto: CreateRouterConfigurationDto,
  ): Promise<RouterConfigurationDetail> {
    return this.service.createDraft(dto);
  }

  @Post('enable')
  async enable(
    @Query(new ZodValidationPipe(scopeQuerySchema)) query: ScopeQueryDto,
  ): Promise<RouterConfigurationDetail> {
    return this.service.setEnabled(query.scope, true);
  }

  @Post('disable')
  async disable(
    @Query(new ZodValidationPipe(scopeQuerySchema)) query: ScopeQueryDto,
  ): Promise<RouterConfigurationDetail> {
    return this.service.setEnabled(query.scope, false);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<RouterConfigurationDetail> {
    return this.service.getById(id);
  }

  @Patch(':id/entries')
  async updateEntries(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateChainEntriesSchema)) dto: UpdateChainEntriesDto,
  ): Promise<RouterConfigurationDetail> {
    return this.service.updateEntries(id, dto);
  }

  @Patch(':id')
  async updateFields(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRouterConfigurationFieldsSchema))
    dto: UpdateRouterConfigurationFieldsDto,
  ): Promise<RouterConfigurationDetail> {
    return this.service.updateFields(id, dto);
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RouterConfigurationDetail> {
    return this.service.publish(id, user.id);
  }
}
