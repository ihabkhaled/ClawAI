import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type CreateProviderDefinitionDto,
  createProviderDefinitionSchema,
} from '../dto/create-provider-definition.dto';
import {
  type ListProviderDefinitionsQueryDto,
  listProviderDefinitionsQuerySchema,
} from '../dto/list-provider-definitions-query.dto';
import {
  type ProviderDefinitionStatusDto,
  providerDefinitionStatusSchema,
} from '../dto/provider-definition-status.dto';
import {
  type UpdateProviderDefinitionDto,
  updateProviderDefinitionSchema,
} from '../dto/update-provider-definition.dto';
import { ProviderDefinitionsService } from '../services/provider-definitions.service';
import {
  type ProviderDefinitionListItem,
  type ProviderDefinitionListResult,
} from '../types/provider-definition.types';

@Controller('connectors/provider-definitions')
@RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
export class ProviderDefinitionsController {
  constructor(private readonly service: ProviderDefinitionsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listProviderDefinitionsQuerySchema))
    query: ListProviderDefinitionsQueryDto,
  ): Promise<ProviderDefinitionListResult> {
    return this.service.list(query);
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ProviderDefinitionListItem> {
    return this.service.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createProviderDefinitionSchema)) dto: CreateProviderDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProviderDefinitionListItem> {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProviderDefinitionSchema)) dto: UpdateProviderDefinitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProviderDefinitionListItem> {
    return this.service.update(id, dto, actor);
  }

  @Patch(':id/status')
  setActive(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(providerDefinitionStatusSchema)) dto: ProviderDefinitionStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ProviderDefinitionListItem> {
    return this.service.setActive(id, dto.isActive, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser): Promise<void> {
    return this.service.remove(id, actor);
  }
}
