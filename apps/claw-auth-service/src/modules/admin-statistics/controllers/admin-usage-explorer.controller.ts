import { Controller, Get, Param, Query } from '@nestjs/common';
import { Permission } from '@claw/shared-types';

import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { RequirePermissions } from '../../../app/decorators/permissions.decorator';
import { Roles } from '../../../app/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { UserRole } from '../../../common/enums';
import { type AuthenticatedUser } from '../../../common/types';
import {
  type ExplorerLeaderboardQueryDto,
  explorerLeaderboardQuerySchema,
  type ExplorerTimeseriesQueryDto,
  explorerTimeseriesQuerySchema,
  type ExplorerUserDetailQueryDto,
  explorerUserDetailQuerySchema,
  type ExplorerUserParamDto,
  explorerUserParamSchema,
  type ExplorerUserRequestsQueryDto,
  explorerUserRequestsQuerySchema,
  type ExplorerUsersExportQueryDto,
  explorerUsersExportQuerySchema,
  type ExplorerUsersQueryDto,
  explorerUsersQuerySchema,
} from '../dto/admin-usage-explorer.dto';
import { AdminUsageExplorerService } from '../services/admin-usage-explorer.service';
import {
  type AdminUsageLeaderboardPage,
  type AdminUsageRequestsPage,
  type AdminUsageTimeseries,
  type AdminUsageUserRow,
  type AdminUsageUsersPage,
  type AdminUserConsumptionDetail,
} from '../types/admin-usage-explorer.types';

/**
 * Admin usage explorer: users table, one user's whole consumption, platform
 * time series and leaderboards. Admin role AND `ADMIN_USAGE_VIEW`, routed under
 * the already-proxied `/api/v1/admin` prefix. These routes return full email
 * addresses; opening a user and exporting are audited by the service.
 */
@Controller('admin/usage-explorer')
@Roles(UserRole.ADMIN)
@RequirePermissions(Permission.ADMIN_USAGE_VIEW)
export class AdminUsageExplorerController {
  constructor(private readonly explorer: AdminUsageExplorerService) {}

  @Get('users')
  async listUsers(
    @Query(new ZodValidationPipe(explorerUsersQuerySchema)) query: ExplorerUsersQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUsageUsersPage> {
    return this.explorer.listUsers(query, actor.id);
  }

  @Get('users/export')
  async exportUsers(
    @Query(new ZodValidationPipe(explorerUsersExportQuerySchema))
    query: ExplorerUsersExportQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ items: AdminUsageUserRow[]; truncated: boolean; from: string; to: string }> {
    return this.explorer.exportUsers(query, actor.id);
  }

  @Get('users/:userId')
  async getUser(
    @Param(new ZodValidationPipe(explorerUserParamSchema)) params: ExplorerUserParamDto,
    @Query(new ZodValidationPipe(explorerUserDetailQuerySchema))
    query: ExplorerUserDetailQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUserConsumptionDetail> {
    return this.explorer.userDetail(params.userId, query, actor.id);
  }

  @Get('users/:userId/requests')
  async getUserRequests(
    @Param(new ZodValidationPipe(explorerUserParamSchema)) params: ExplorerUserParamDto,
    @Query(new ZodValidationPipe(explorerUserRequestsQuerySchema))
    query: ExplorerUserRequestsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUsageRequestsPage> {
    return this.explorer.userRequests(params.userId, query, actor.id);
  }

  @Get('leaderboard')
  async leaderboard(
    @Query(new ZodValidationPipe(explorerLeaderboardQuerySchema))
    query: ExplorerLeaderboardQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AdminUsageLeaderboardPage> {
    return this.explorer.leaderboard(query, actor.id);
  }

  @Get('timeseries')
  async timeseries(
    @Query(new ZodValidationPipe(explorerTimeseriesQuerySchema))
    query: ExplorerTimeseriesQueryDto,
  ): Promise<AdminUsageTimeseries> {
    return this.explorer.timeseries(query);
  }
}
