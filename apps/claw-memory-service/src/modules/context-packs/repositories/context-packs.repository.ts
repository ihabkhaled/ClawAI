import { Injectable } from "@nestjs/common";
import { type ContextPack, type ContextPackItem, Prisma } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import {
  type CreateContextPackData,
  type UpdateContextPackData,
  type AddContextPackItemData,
  type ContextPackFilters,
  type ContextPackWithItems,
} from "../types/context-packs.types";

@Injectable()
export class ContextPacksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateContextPackData): Promise<ContextPack> {
    return this.prisma.contextPack.create({ data });
  }

  async findById(id: string): Promise<ContextPackWithItems | null> {
    return this.prisma.contextPack.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async findAll(
    filters: ContextPackFilters,
    page: number,
    limit: number,
  ): Promise<ContextPack[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.contextPack.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdateContextPackData): Promise<ContextPack> {
    return this.prisma.contextPack.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<ContextPack> {
    return this.prisma.contextPack.delete({ where: { id } });
  }

  async countAll(filters: ContextPackFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.contextPack.count({ where });
  }

  async addItem(data: AddContextPackItemData): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.create({ data });
  }

  async removeItem(id: string): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.delete({ where: { id } });
  }

  async reorderItems(_contextPackId: string, itemIds: string[]): Promise<void> {
    const updates = itemIds.map((id, index) =>
      this.prisma.contextPackItem.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
  }

  private buildWhereClause(filters: ContextPackFilters): Prisma.ContextPackWhereInput {
    const where: Prisma.ContextPackWhereInput = {
      userId: filters.userId,
    };

    if (filters.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    return where;
  }
}
