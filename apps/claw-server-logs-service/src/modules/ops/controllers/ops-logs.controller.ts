import { Controller, Get, Query, UseGuards, UsePipes } from '@nestjs/common';

import { Public } from '../../../app/decorators/public.decorator';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import type { PaginatedResult } from '@common/types';
import {
  type ListServerLogsQueryDto,
  listServerLogsQuerySchema,
} from '../../server-logs/dtos/list-server-logs-query.dto';
import type { ServerLog } from '../../server-logs/schemas/server-log.schema';
import { ServerLogsService } from '../../server-logs/services/server-logs.service';
import type {
  ServerLogStatsResponse,
  TimeSeriesBucket,
} from '../../server-logs/types/server-logs.types';
import { OpsTokenGuard } from '../guards/ops-token.guard';

/**
 * The no-SSH channel into production logs: the same reads the admin Logs
 * page makes, authenticated by a read-only ops token instead of a session.
 * `@Public()` only lifts the user-JWT requirement; OpsTokenGuard then
 * requires a live LOGS_READ token. There are no write routes here.
 */
@Controller('ops/logs')
@Public()
@UseGuards(OpsTokenGuard)
export class OpsLogsController {
  constructor(private readonly serverLogsService: ServerLogsService) {}

  @Get()
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async list(@Query() query: ListServerLogsQueryDto): Promise<PaginatedResult<ServerLog>> {
    return this.serverLogsService.getLogs(query);
  }

  @Get('stats')
  async stats(): Promise<ServerLogStatsResponse> {
    return this.serverLogsService.getStats();
  }

  @Get('timeseries')
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async timeseries(@Query() query: ListServerLogsQueryDto): Promise<TimeSeriesBucket[]> {
    return this.serverLogsService.getTimeSeries(query, query.interval ?? 5);
  }
}
