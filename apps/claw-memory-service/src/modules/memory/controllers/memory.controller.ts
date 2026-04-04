import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { type MemoryRecord, type MemoryType } from "../../../generated/prisma";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../../common/types";
import { MemoryService } from "../services/memory.service";
import { CreateMemoryRecordInput, UpdateMemoryRecordInput } from "../types/memory.types";

@Controller("memory")
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Omit<CreateMemoryRecordInput, "userId">,
  ): Promise<MemoryRecord> {
    return this.memoryService.create({ ...body, userId: user.id });
  }

  @Get()
  async findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query("type") type?: MemoryType,
    @Query("isEnabled") isEnabled?: string,
  ): Promise<MemoryRecord[]> {
    return this.memoryService.findMany({
      userId: user.id,
      type,
      isEnabled: isEnabled !== undefined ? isEnabled === "true" : undefined,
    });
  }

  @Get(":id")
  async findById(@Param("id") id: string): Promise<MemoryRecord> {
    return this.memoryService.findById(id);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateMemoryRecordInput,
  ): Promise<MemoryRecord> {
    return this.memoryService.update(id, body);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<MemoryRecord> {
    return this.memoryService.delete(id);
  }
}
