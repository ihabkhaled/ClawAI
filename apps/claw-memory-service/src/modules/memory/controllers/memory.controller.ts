import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { type MemoryRecord } from '../../../generated/prisma';
import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { type AuthenticatedUser, type PaginatedResult } from '../../../common/types';
import { MemoryService } from '../services/memory.service';
import { type CreateMemoryDto, createMemorySchema } from '../dto/create-memory.dto';
import { type UpdateMemoryDto, updateMemorySchema } from '../dto/update-memory.dto';
import { type ListMemoriesQueryDto, listMemoriesQuerySchema } from '../dto/list-memories-query.dto';
import { type SearchMemoriesDto, searchMemoriesSchema } from '../dto/search-memories.dto';

@Controller('memories')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMemorySchema)) dto: CreateMemoryDto,
  ): Promise<MemoryRecord> {
    return this.memoryService.createMemory(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listMemoriesQuerySchema)) query: ListMemoriesQueryDto,
  ): Promise<PaginatedResult<MemoryRecord>> {
    return this.memoryService.getMemories(user.id, query);
  }

  @Post('search')
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(searchMemoriesSchema)) dto: SearchMemoriesDto,
  ): Promise<PaginatedResult<MemoryRecord>> {
    return this.memoryService.getMemories(user.id, {
      page: 1,
      limit: dto.limit,
      type: undefined,
      isEnabled: dto.includeDisabled ? undefined : true,
      search: dto.query,
      scope: dto.scope,
      scopeRef: dto.scopeRef,
      source: undefined,
      sensitivity: undefined,
      tag: undefined,
      category: undefined,
      pinnedOnly: undefined,
      sort: 'newest',
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemoryRecord> {
    return this.memoryService.getMemory(id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateMemorySchema)) dto: UpdateMemoryDto,
  ): Promise<MemoryRecord> {
    return this.memoryService.updateMemory(id, user.id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('confirm') confirm: string | undefined,
  ): Promise<MemoryRecord> {
    return this.memoryService.deleteMemory(id, user.id, confirm === 'FORGET');
  }

  @Patch(':id/toggle')
  async toggle(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemoryRecord> {
    return this.memoryService.toggleMemory(id, user.id);
  }
}
