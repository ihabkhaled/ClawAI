import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UsePipes } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { Roles } from "../../../app/decorators/roles.decorator";
import { ZodValidationPipe } from "../../../app/pipes/zod-validation.pipe";
import { UserRole } from "../../../common/enums";
import { ClientLogsService } from "../services/client-logs.service";
import { type CreateClientLogDto, createClientLogSchema  } from "../dto/create-client-log.dto";
import { type SearchClientLogsDto, searchClientLogsSchema  } from "../dto/search-client-logs.dto";
import type { ClientLogStatsResponse, CreateClientLogResponse, DistinctValuesResult } from "../types/client-logs.types";
import type { PaginatedResult } from "@common/types";
import type { ClientLog } from "../schemas/client-log.schema";

@Controller("client-logs")
export class ClientLogsController {
  constructor(private readonly clientLogsService: ClientLogsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createClientLogSchema))
  async create(@Body() dto: CreateClientLogDto): Promise<CreateClientLogResponse> {
    return this.clientLogsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get()
  @UsePipes(new ZodValidationPipe(searchClientLogsSchema))
  async search(@Query() query: SearchClientLogsDto): Promise<PaginatedResult<ClientLog>> {
    return this.clientLogsService.search(query);
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get("stats")
  async getStats(): Promise<ClientLogStatsResponse> {
    return this.clientLogsService.getStats();
  }

  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @Get("distinct")
  async getDistinctValues(@Query("field") field: string): Promise<DistinctValuesResult> {
    return this.clientLogsService.getDistinctValues(field, {});
  }
}
