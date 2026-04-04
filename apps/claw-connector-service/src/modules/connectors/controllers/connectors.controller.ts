import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { type ConnectorModel } from "../../../generated/prisma";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { type PaginatedResult } from "../../../common/types";
import { ConnectorsService } from "../services/connectors.service";
import { CreateConnectorDto, createConnectorSchema } from "../dto/create-connector.dto";
import { UpdateConnectorDto, updateConnectorSchema } from "../dto/update-connector.dto";
import { ListConnectorsQueryDto, listConnectorsQuerySchema } from "../dto/list-connectors-query.dto";
import {
  type ConnectorWithModels,
  type HealthCheckResult,
  type SyncModelsResult,
} from "../types/connectors.types";

@Controller("connectors")
export class ConnectorsController {
  constructor(private readonly connectorsService: ConnectorsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createConnectorSchema)) dto: CreateConnectorDto,
  ): Promise<ConnectorWithModels> {
    return this.connectorsService.createConnector(dto);
  }

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(listConnectorsQuerySchema)) query: ListConnectorsQueryDto,
  ): Promise<PaginatedResult<ConnectorWithModels>> {
    return this.connectorsService.getConnectors(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<ConnectorWithModels> {
    return this.connectorsService.getConnector(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateConnectorSchema)) dto: UpdateConnectorDto,
  ): Promise<ConnectorWithModels> {
    return this.connectorsService.updateConnector(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string): Promise<ConnectorWithModels> {
    return this.connectorsService.deleteConnector(id);
  }

  @Post(":id/test")
  async test(@Param("id") id: string): Promise<HealthCheckResult> {
    return this.connectorsService.testConnector(id);
  }

  @Post(":id/sync")
  async sync(@Param("id") id: string): Promise<SyncModelsResult> {
    return this.connectorsService.syncModels(id);
  }

  @Get(":id/models")
  async getModels(@Param("id") id: string): Promise<ConnectorModel[]> {
    return this.connectorsService.getModels(id);
  }
}
