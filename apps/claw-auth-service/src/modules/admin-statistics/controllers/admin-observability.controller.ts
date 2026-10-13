import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  type AdminObsDetail,
  type AdminObsFilterOptions,
  type AdminObsHealthReport,
  type AdminObsOverview,
  type AdminObsPage,
  type AdminObsUsersExport,
  Permission,
} from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type ObservabilityExportQueryDto,
  observabilityExportQuerySchema,
  type ObservabilityListQueryDto,
  observabilityListQuerySchema,
  type ObservabilityModelDetailQueryDto,
  observabilityModelDetailQuerySchema,
  type ObservabilityProviderDetailQueryDto,
  observabilityProviderDetailQuerySchema,
  type ObservabilityProviderParamDto,
  observabilityProviderParamSchema,
  type ObservabilityScopeQueryDto,
  observabilityScopeQuerySchema,
  type ObservabilityUsersQueryDto,
  observabilityUsersQuerySchema,
} from '../dto/admin-observability.dto';
import { AdminObservabilityService } from '../services/admin-observability.service';

/**
 * The split observability pages: hub overview, every user, providers, models,
 * plans and workflows (surfaces). Admin role AND `ADMIN_USAGE_VIEW`, under the
 * already-proxied `/api/v1/admin` prefix. Only the users list returns full
 * emails and it is audited; every other route masks them. Controllers hold no
 * logic: validate, hand to the service.
 */
@Controller('admin/observability')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USAGE_VIEW)
export class AdminObservabilityController {
  constructor(private readonly observability: AdminObservabilityService) {}

  @Get('overview')
  async overview(
    @Query(new ZodValidationPipe(observabilityScopeQuerySchema))
    query: ObservabilityScopeQueryDto,
  ): Promise<AdminObsOverview> {
    return this.observability.overview(query);
  }

  @Get('filter-options')
  async filterOptions(
    @Query(new ZodValidationPipe(observabilityScopeQuerySchema))
    query: ObservabilityScopeQueryDto,
  ): Promise<AdminObsFilterOptions> {
    return this.observability.filterOptions(query);
  }

  @Get('health')
  async health(
    @Query(new ZodValidationPipe(observabilityScopeQuerySchema))
    query: ObservabilityScopeQueryDto,
  ): Promise<AdminObsHealthReport> {
    return this.observability.healthReport(query);
  }

  @Get('users')
  async users(
    @Query(new ZodValidationPipe(observabilityUsersQuerySchema)) query: ObservabilityUsersQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminObsPage> {
    return this.observability.listUsers(query, actor.id);
  }

  @Get('users/export')
  async exportUsers(
    @Query(new ZodValidationPipe(observabilityExportQuerySchema))
    query: ObservabilityExportQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminObsUsersExport> {
    return this.observability.exportUsers(query, actor.id);
  }

  @Get('providers')
  async providers(
    @Query(new ZodValidationPipe(observabilityListQuerySchema)) query: ObservabilityListQueryDto,
  ): Promise<AdminObsPage> {
    return this.observability.listProviders(query);
  }

  @Get('providers/:provider')
  async providerDetail(
    @Param(new ZodValidationPipe(observabilityProviderParamSchema))
    params: ObservabilityProviderParamDto,
    @Query(new ZodValidationPipe(observabilityProviderDetailQuerySchema))
    query: ObservabilityProviderDetailQueryDto,
  ): Promise<AdminObsDetail> {
    return this.observability.providerDetail(params.provider, query);
  }

  @Get('models')
  async models(
    @Query(new ZodValidationPipe(observabilityListQuerySchema)) query: ObservabilityListQueryDto,
  ): Promise<AdminObsPage> {
    return this.observability.listModels(query);
  }

  /** Model ids contain `/` and `:`, so provider and model are query parameters. */
  @Get('models/detail')
  async modelDetail(
    @Query(new ZodValidationPipe(observabilityModelDetailQuerySchema))
    query: ObservabilityModelDetailQueryDto,
  ): Promise<AdminObsDetail> {
    return this.observability.modelDetail(query);
  }

  @Get('plans')
  async plans(
    @Query(new ZodValidationPipe(observabilityListQuerySchema)) query: ObservabilityListQueryDto,
  ): Promise<AdminObsPage> {
    return this.observability.listPlans(query);
  }

  @Get('workflows')
  async workflows(
    @Query(new ZodValidationPipe(observabilityListQuerySchema)) query: ObservabilityListQueryDto,
  ): Promise<AdminObsPage> {
    return this.observability.listWorkflows(query);
  }
}
