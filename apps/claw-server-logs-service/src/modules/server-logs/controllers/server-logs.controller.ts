import { Body, Controller, Get, Post, Query, UsePipes } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { ServerLogsService } from "../services/server-logs.service";
import { createServerLogSchema } from "../dtos/create-server-log.dto";
import { batchCreateServerLogsSchema } from "../dtos/batch-create-server-logs.dto";
import { listServerLogsQuerySchema } from "../dtos/list-server-logs-query.dto";
import type { CreateServerLogDto } from "../dtos/create-server-log.dto";
import type { BatchCreateServerLogsDto } from "../dtos/batch-create-server-logs.dto";
import type { ListServerLogsQueryDto } from "../dtos/list-server-logs-query.dto";
import type {
  CreateServerLogResponse,
  BatchCreateServerLogsResponse,
  ServerLogStatsResponse,
} from "../types/server-logs.types";
import type { PaginatedResult } from "@common/types";
import type { ServerLog } from "../schemas/server-log.schema";

@Controller("server-logs")
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
  @Post("batch")
  @UsePipes(new ZodValidationPipe(batchCreateServerLogsSchema))
  async createBatch(@Body() body: BatchCreateServerLogsDto): Promise<BatchCreateServerLogsResponse> {
    const mapped = body.entries.map(({ model: modelName, ...rest }) => ({ ...rest, modelName }));
    return this.serverLogsService.createMany(mapped);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(listServerLogsQuerySchema))
  async listLogs(@Query() query: ListServerLogsQueryDto): Promise<PaginatedResult<ServerLog>> {
    return this.serverLogsService.getLogs({
      page: query.page,
      limit: query.limit,
      level: query.level,
      serviceName: query.serviceName,
      module: query.module,
      controller: query.controller,
      action: query.action,
      requestId: query.requestId,
      traceId: query.traceId,
      userId: query.userId,
      threadId: query.threadId,
      provider: query.provider,
      search: query.search,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Get("stats")
  async getStats(): Promise<ServerLogStatsResponse> {
    return this.serverLogsService.getStats();
  }
}
