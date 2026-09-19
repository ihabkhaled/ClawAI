import { Body, Controller, Get, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { RequirePermissions } from '@claw/shared-entitlements';
import { Permission } from '@claw/shared-types';
import { Public } from '../../../app/decorators/public.decorator';
import { ServiceTokenGuard } from '../../../app/guards/service-token.guard';
import {
  type IngestContainerLogsDto,
  ingestContainerLogsSchema,
} from '../dtos/ingest-container-logs.dto';
import { toServerLogInput } from '../utilities/container-log.utility';
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
  @UseGuards(ServiceTokenGuard)
  @Post()
  @UsePipes(new ZodValidationPipe(createServerLogSchema))
  async createLog(@Body() body: CreateServerLogDto): Promise<CreateServerLogResponse> {
    const { model: modelName, ...rest } = body;
    return this.serverLogsService.createLog({ ...rest, modelName });
  }

  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('batch')
  @UsePipes(new ZodValidationPipe(batchCreateServerLogsSchema))
  async createBatch(
    @Body() body: BatchCreateServerLogsDto,
  ): Promise<BatchCreateServerLogsResponse> {
    const mapped = body.entries.map(({ model: modelName, ...rest }) => ({ ...rest, modelName }));
    return this.serverLogsService.createMany(mapped);
  }

  /**
   * Every container's stdout/stderr, from the log shipper. Service token only.
   * Blank lines are dropped; everything else is kept at its real level.
   */
  @Public()
  @UseGuards(ServiceTokenGuard)
  @Post('ingest/containers')
  async ingestContainers(
    @Body(new ZodValidationPipe(ingestContainerLogsSchema)) body: IngestContainerLogsDto,
  ): Promise<BatchCreateServerLogsResponse> {
    const rows = body
      .map((line) => toServerLogInput(line))
      .filter((row): row is NonNullable<typeof row> => row !== null);
    return rows.length === 0 ? { inserted: 0 } : this.serverLogsService.createMany(rows);
  }

  @Get()
  @RequirePermissions(Permission.ADMIN_LOGS_VIEW)
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async listLogs(@Query() query: ListServerLogsQueryDto): Promise<PaginatedResult<ServerLog>> {
    return this.serverLogsService.getLogs(query);
  }

  @Get('stats')
  @RequirePermissions(Permission.ADMIN_LOGS_VIEW)
  async getStats(): Promise<ServerLogStatsResponse> {
    return this.serverLogsService.getStats();
  }

  @Get('distinct')
  @RequirePermissions(Permission.ADMIN_LOGS_VIEW)
  async getDistinctValues(@Query('field') field: string): Promise<DistinctValuesResult> {
    return this.serverLogsService.getDistinctValues(field, {});
  }

  @Get('timeseries')
  @RequirePermissions(Permission.ADMIN_LOGS_VIEW)
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async getTimeSeries(@Query() query: ListServerLogsQueryDto): Promise<TimeSeriesBucket[]> {
    return this.serverLogsService.getTimeSeries(query, query.interval ?? 5);
  }
}
