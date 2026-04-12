import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { ServerLogsService } from '../services/server-logs.service';
import { type CreateServerLogDto, createServerLogSchema } from '../dtos/create-server-log.dto';
import {
  type BatchCreateServerLogsDto,
  batchCreateServerLogsSchema,
} from '../dtos/batch-create-server-logs.dto';
import {
  type ListServerLogsQueryDto,
  listServerLogsQuerySchema,
} from '../dtos/list-server-logs-query.dto';
import type {
  BatchCreateServerLogsResponse,
  CreateServerLogResponse,
  DistinctValuesResult,
  ServerLogStatsResponse,
  TimeSeriesBucket,
} from '../types/server-logs.types';
import type { PaginatedResult } from '@common/types';
import type { ServerLog } from '../schemas/server-log.schema';

@Controller('server-logs')
export class ServerLogsController {
  constructor(private readonly serverLogsService: ServerLogsService) {}

  @Public()
  @Post()
  @UsePipes(new ZodValidationPipe(createServerLogSchema))
  async createLog(@Body() body: CreateServerLogDto): Promise<CreateServerLogResponse> {
    const { model: modelName, ...rest } = body;
    return this.serverLogsService.createLog({ ...rest, modelName });
  }

  @Public()
  @Post('batch')
  @UsePipes(new ZodValidationPipe(batchCreateServerLogsSchema))
  async createBatch(
    @Body() body: BatchCreateServerLogsDto,
  ): Promise<BatchCreateServerLogsResponse> {
    const mapped = body.entries.map(({ model: modelName, ...rest }) => ({ ...rest, modelName }));
    return this.serverLogsService.createMany(mapped);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async listLogs(@Query() query: ListServerLogsQueryDto): Promise<PaginatedResult<ServerLog>> {
    return this.serverLogsService.getLogs(query);
  }

  @Get('stats')
  async getStats(): Promise<ServerLogStatsResponse> {
    return this.serverLogsService.getStats();
  }

  @Get('distinct')
  async getDistinctValues(@Query('field') field: string): Promise<DistinctValuesResult> {
    return this.serverLogsService.getDistinctValues(field, {});
  }

  @Get('timeseries')
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async getTimeSeries(@Query() query: ListServerLogsQueryDto): Promise<TimeSeriesBucket[]> {
    return this.serverLogsService.getTimeSeries(query, query.interval ?? 5);
  }
}
