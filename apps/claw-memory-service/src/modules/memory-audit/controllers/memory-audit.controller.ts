import { Controller, Get, Param, Query } from '@nestjs/common';
import type { MemoryAuditLog } from '../../../generated/prisma';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types';
import { MemoryAuditService } from '../services/memory-audit.service';

@Controller('memory-audit')
export class MemoryAuditController {
  constructor(private readonly service: MemoryAuditService) {}

  @Get()
  async listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit: string | undefined,
  ): Promise<MemoryAuditLog[]> {
    const parsed = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return this.service.getUserHistory(user.id, parsed);
  }

  @Get(':memoryId')
  async listForMemory(
    @Param('memoryId') memoryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemoryAuditLog[]> {
    return this.service.getMemoryHistory(memoryId, user.id);
  }
}
