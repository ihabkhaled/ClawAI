import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../../../app/decorators/public.decorator";
import { type MemoryRecord } from "../../../generated/prisma";
import { MemoryService } from "../services/memory.service";

@Controller("internal/memories")
export class MemoryInternalController {
  constructor(private readonly memoryService: MemoryService) {}

  @Public()
  @Get("for-context")
  async getForContext(
    @Query("userId") userId: string,
    @Query("limit") limit: string,
  ): Promise<MemoryRecord[]> {
    const parsedLimit = Number(limit) || 10;
    return this.memoryService.getMemoriesForContext(userId, parsedLimit);
  }
}
