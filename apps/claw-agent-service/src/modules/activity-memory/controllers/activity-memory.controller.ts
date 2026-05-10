import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@claw/shared-auth';

import { ZodValidationPipe } from '../../../app/pipes/zod-validation.pipe';
import {
  type ListActivityQueryDto,
  listActivitySchema,
  type RecordActivityDto,
  recordActivitySchema,
} from '../dto/record-activity.dto';
import { ActivityMemoryRepository } from '../repositories/activity-memory.repository';
import { type ActivityMemoryEntry, Prisma } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../../common/types/auth.types';

@Controller('agent/activity-memory')
export class ActivityMemoryController {
  constructor(private readonly repo: ActivityMemoryRepository) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async record(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(recordActivitySchema)) dto: RecordActivityDto,
  ): Promise<ActivityMemoryEntry> {
    return this.repo.create({
      userId: user.id,
      deviceId: dto.deviceId,
      kind: dto.kind,
      summary: dto.summary,
      occurredAt: dto.occurredAt,
      syncedToCloud: dto.syncedToCloud,
      metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
    });
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listActivitySchema)) query: ListActivityQueryDto,
  ): Promise<{ data: ActivityMemoryEntry[]; total: number; page: number; pageSize: number }> {
    const result = await this.repo.listForUser(user.id, query.page, query.pageSize, query.kind);
    return { ...result, page: query.page, pageSize: query.pageSize };
  }
}
