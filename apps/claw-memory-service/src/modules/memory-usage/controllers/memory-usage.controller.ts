import { Controller, Get, Param, Query } from '@nestjs/common';
import type { MemoryUsage } from '../../../generated/prisma';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { MemoryUsageService } from '../services/memory-usage.service';

@Controller('memory-usage')
export class MemoryUsageController {
  constructor(private readonly service: MemoryUsageService) {}

  @Get('by-memory/:memoryId')
  async byMemory(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit: string | undefined,
  ): Promise<MemoryUsage[]> {
    const parsed = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.service.getByMemoryId(memoryId, user.id, parsed);
  }

  @Get('by-message/:messageId')
  async byMessage(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemoryUsage[]> {
    return this.service.getByMessageId(messageId, user.id);
  }
}
