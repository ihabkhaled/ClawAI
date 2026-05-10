import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Public } from '../../../app/decorators/public.decorator';
import { type MemoryRecord, MemoryType } from '../../../generated/prisma';
import { MemoryRepository } from '../repositories/memory.repository';
import { MemoryService } from '../services/memory.service';
import type { UpsertAutomationPreferenceBody } from '../types/automation-preference.types';

@Controller('internal/memories')
export class MemoryInternalController {
  constructor(
    private readonly memoryService: MemoryService,
    private readonly memoryRepository: MemoryRepository,
  ) {}

  @Public()
  @Get('for-context')
  async getForContext(
    @Query('userId') userId: string,
    @Query('limit') limit: string,
  ): Promise<MemoryRecord[]> {
    const parsedLimit = Number(limit) || 10;
    return this.memoryService.getMemoriesForContext(userId, parsedLimit);
  }

  /**
   * Stream 40 — automation learning preference upsert.
   * Service-to-service endpoint (no user auth) used by claw-workspace-service
   * to record learned PREFERENCEs from approve/reject/edit decisions.
   */
  @Public()
  @Post('automation-preference')
  @HttpCode(HttpStatus.CREATED)
  async upsertAutomationPreference(
    @Body() body: UpsertAutomationPreferenceBody,
  ): Promise<MemoryRecord> {
    return this.memoryService.createMemory(body.userId, {
      type: MemoryType.PREFERENCE,
      content: body.content,
    });
  }

  /**
   * Stream 40.3 — "what we've learned" panel uses this to fetch user's
   * automation_learning PREFERENCEs (filtered to those that mention the
   * given actionKind, when supplied).
   */
  @Public()
  @Get('learned-preferences')
  async getLearnedPreferences(
    @Query('userId') userId: string,
    @Query('actionKind') actionKind: string | undefined,
    @Query('limit') limit: string | undefined,
  ): Promise<MemoryRecord[]> {
    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 25));
    return this.memoryRepository.findLearnedPreferences(userId, actionKind, parsedLimit);
  }
}
