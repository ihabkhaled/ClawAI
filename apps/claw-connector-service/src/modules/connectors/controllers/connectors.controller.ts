import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { type ModelBehaviorProbeResult, Permission } from '@claw/shared-types';
import { RequirePermissions } from '@claw/shared-entitlements';
import { type ConnectorModel } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { type PaginatedResult } from '../../../common/types';
import { ConnectorsService } from '../services/connectors.service';
import { CreateConnectorDto, createConnectorSchema } from '../dto/create-connector.dto';
import { UpdateConnectorDto, updateConnectorSchema } from '../dto/update-connector.dto';
import {
  ListConnectorsQueryDto,
  listConnectorsQuerySchema,
} from '../dto/list-connectors-query.dto';
import {
  type ConnectorWithModels,
  type HealthCheckResult,
  type SyncModelsResult,
} from '../types/connectors.types';

@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Post()
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async create(
    @Body(new ZodValidationPipe(createConnectorSchema)) dto: CreateConnectorDto,
  ): Promise<ConnectorWithModels> {
    return this.connectorsService.createConnector(dto);
  }

  @Get()
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async findAll(
    @Query(new ZodValidationPipe(listConnectorsQuerySchema)) query: ListConnectorsQueryDto,
  ): Promise<PaginatedResult<ConnectorWithModels>> {
    return this.connectorsService.getConnectors(query);
  }

  // USER-facing aggregated model catalog for the chat picker (cloud + connector
  // models). MODEL_USE_ALLOWED, not connector-admin. MUST stay above @Get(':id')
  // so the static segment is not captured as an :id param.
  @Get('available-models')
  @RequirePermissions(Permission.MODEL_USE_ALLOWED)
  async getAvailableModels(): Promise<ConnectorModel[]> {
    return this.connectorsService.getAvailableModels();
  }

  @Get(':id')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async findOne(@Param('id') id: string): Promise<ConnectorWithModels> {
    return this.connectorsService.getConnector(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateConnectorSchema)) dto: UpdateConnectorDto,
  ): Promise<ConnectorWithModels> {
    return this.connectorsService.updateConnector(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async remove(@Param('id') id: string): Promise<ConnectorWithModels> {
    return this.connectorsService.deleteConnector(id);
  }

  @Post(':id/test')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async test(@Param('id') id: string): Promise<HealthCheckResult> {
    return this.connectorsService.testConnector(id);
  }

  // Behavioural tool probe for one model (§9.2). On-demand rather than part
  // of sync: a ~250-model catalog would mean 250 inference calls per sync.
  @Post(':id/models/:modelKey/probe-tools')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async probeTools(
    @Param('id') id: string,
    @Param('modelKey') modelKey: string,
  ): Promise<ModelBehaviorProbeResult> {
    return this.connectorsService.probeModelToolCapability(id, modelKey);
  }

  @Post(':id/sync')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async sync(@Param('id') id: string): Promise<SyncModelsResult> {
    return this.connectorsService.syncModels(id);
  }

  // Lists a connector's FULL inventory, including models no administrator has
  // exposed yet. Administrator-only; every sibling route here already requires it.
  @Get(':id/models')
  @RequirePermissions(Permission.ADMIN_CONNECTORS_MANAGE)
  async getModels(@Param('id') id: string): Promise<ConnectorModel[]> {
    return this.connectorsService.getModels(id);
  }
}
