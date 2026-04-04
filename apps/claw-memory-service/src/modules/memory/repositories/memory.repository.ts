import { Injectable } from "@nestjs/common";
import { type MemoryRecord, Prisma } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import {
  type CreateMemoryData,
  type UpdateMemoryData,
  type MemoryFilters,
} from "../types/memory.types";

@Injectable()
export class MemoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMemoryData): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.create({ data });
  }

  async findById(id: string): Promise<MemoryRecord | null> {
    return this.prisma.memoryRecord.findUnique({ where: { id } });
  }

  async findAll(
    filters: MemoryFilters,
    page: number,
    limit: number,
  ): Promise<MemoryRecord[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.memoryRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdateMemoryData): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<MemoryRecord> {
    return this.prisma.memoryRecord.delete({ where: { id } });
  }

  async countAll(filters: MemoryFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.memoryRecord.count({ where });
  }

  private buildWhereClause(filters: MemoryFilters): Prisma.MemoryRecordWhereInput {
    const where: Prisma.MemoryRecordWhereInput = {
      userId: filters.userId,
    };

    if (filters.type !== undefined) {
      where.type = filters.type;
    }

    if (filters.isEnabled !== undefined) {
      where.isEnabled = filters.isEnabled;
    }

    if (filters.search) {
      where.content = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }
}
