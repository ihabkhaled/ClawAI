import { Injectable } from "@nestjs/common";
import { type MemoryRecord } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { CreateMemoryRecordInput, MemoryRecordFilters, UpdateMemoryRecordInput } from "../types/memory.types";

@Injectable()
export class MemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateMemoryRecordInput): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.create({ data: input });
  }

  async findById(id: string): Promise<MemoryRecord | null> {
    return this.prisma.memoryRecord.findUnique({ where: { id } });
  }

  async findMany(filters: MemoryRecordFilters): Promise<MemoryRecord[]> {
    return this.prisma.memoryRecord.findMany({
      where: {
        userId: filters.userId,
        ...(filters.type !== undefined && { type: filters.type }),
        ...(filters.isEnabled !== undefined && { isEnabled: filters.isEnabled }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, input: UpdateMemoryRecordInput): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.delete({ where: { id } });
  }
}
