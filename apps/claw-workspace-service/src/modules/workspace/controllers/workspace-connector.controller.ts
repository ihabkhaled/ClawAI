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
import { CurrentUser } from '@claw/shared-auth';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { WorkspaceConnectorService } from '../services/workspace-connector.service';
import { WorkspaceObjectService } from '../services/workspace-object.service';
import {
  type CreateWorkspaceConnectorDto,
  createWorkspaceConnectorSchema,
} from '../dto/create-workspace-connector.dto';
import {
  type UpdateWorkspaceConnectorDto,
  updateWorkspaceConnectorSchema,
} from '../dto/update-workspace-connector.dto';
import {
  type ListWorkspaceConnectorsQueryDto,
  listWorkspaceConnectorsQuerySchema,
} from '../dto/list-workspace-connectors-query.dto';
import { type UpdateCadenceDto, updateCadenceSchema } from '../dto/update-cadence.dto';
import { type PauseConnectorDto, pauseConnectorSchema } from '../dto/pause-connector.dto';
import { type SyncNowQueryDto, syncNowQuerySchema } from '../dto/sync-now.dto';
import type {
  HealthCheckResult,
  PaginatedWorkspaceConnectors,
  SyncResult,
  WorkspaceConnectorWithStats,
} from '../types/workspace.types';
import type { AuthenticatedUser } from '../../../common/types/auth.types';
import type { WorkspaceHealthEvent, WorkspaceSyncRun } from '../../../generated/prisma';

@Controller('workspace/connectors')
export class WorkspaceConnectorController {
  constructor(
    private readonly service: WorkspaceConnectorService,
    private readonly objectService: WorkspaceObjectService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkspaceConnectorSchema)) dto: CreateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listWorkspaceConnectorsQuerySchema))
    query: ListWorkspaceConnectorsQueryDto,
  ): Promise<PaginatedWorkspaceConnectors> {
    return this.service.getConnectors(user.id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.getConnector(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWorkspaceConnectorSchema)) dto: UpdateWorkspaceConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.delete(id, user.id);
  }

  @Post(':id/health')
  @HttpCode(HttpStatus.OK)
  async testHealth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<HealthCheckResult> {
    return this.service.testHealth(id, user.id);
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  async triggerSync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(syncNowQuerySchema)) query: SyncNowQueryDto,
  ): Promise<SyncResult> {
    return this.service.triggerSync(id, user.id, {
      delta: query.delta,
      priority: query.priority,
      dryRun: query.dryRun,
    });
  }

  @Patch(':id/cadence')
  async updateCadence(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCadenceSchema)) dto: UpdateCadenceDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.updateCadence(id, user.id, dto.syncIntervalSeconds);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(pauseConnectorSchema)) dto: PauseConnectorDto,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.pauseConnector(id, user.id, dto.reason ?? null);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkspaceConnectorWithStats> {
    return this.service.resumeConnector(id, user.id);
  }

  @Get(':id/sync-runs')
  async listSyncRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<WorkspaceSyncRun[]> {
    const parsedLimit = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe =
      Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 20;
    return this.objectService.listSyncRuns(id, user.id, safe);
  }

  @Get(':id/health-events')
  async listHealthEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ): Promise<WorkspaceHealthEvent[]> {
    const parsedLimit = limit === undefined ? 20 : Number.parseInt(limit, 10);
    const safe =
      Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : 20;
    return this.objectService.listHealthEvents(id, user.id, safe);
  }
}
