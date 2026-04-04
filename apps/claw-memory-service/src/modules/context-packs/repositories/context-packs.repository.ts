import { Injectable } from "@nestjs/common";
import { type ContextPack, type ContextPackItem } from "../../../generated/prisma";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import {
  CreateContextPackInput,
  CreateContextPackItemInput,
  ContextPackWithItems,
  UpdateContextPackInput,
  UpdateContextPackItemInput,
} from "../types/context-packs.types";

@Injectable()
export class ContextPacksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateContextPackInput): Promise<ContextPack> {
    return this.prisma.contextPack.create({ data: input });
  }

  async findById(id: string): Promise<ContextPackWithItems | null> {
    return this.prisma.contextPack.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  }

  async findByUserId(userId: string): Promise<ContextPack[]> {
    return this.prisma.contextPack.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, input: UpdateContextPackInput): Promise<ContextPack> {
    return this.prisma.contextPack.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<ContextPack> {
    return this.prisma.contextPack.delete({ where: { id } });
  }

  async createItem(input: CreateContextPackItemInput): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.create({ data: input });
  }

  async updateItem(id: string, input: UpdateContextPackItemInput): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.update({
      where: { id },
      data: input,
    });
  }

  async deleteItem(id: string): Promise<ContextPackItem> {
    return this.prisma.contextPackItem.delete({ where: { id } });
  }
}
