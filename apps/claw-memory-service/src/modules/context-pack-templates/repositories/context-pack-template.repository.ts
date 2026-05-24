import { Injectable } from '@nestjs/common';
import { type ContextPackTemplate } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { toPrismaJsonInput } from '../../../common/utilities/prisma-json.utility';
import type { TemplatePayload } from '../types/context-pack-template.types';

@Injectable()
export class ContextPackTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(category?: string): Promise<ContextPackTemplate[]> {
    return this.prisma.contextPackTemplate.findMany({
      where: category !== undefined ? { category } : {},
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<ContextPackTemplate | null> {
    return this.prisma.contextPackTemplate.findUnique({ where: { id } });
  }

  async upsertSystem(
    name: string,
    description: string,
    category: string,
    payload: TemplatePayload,
  ): Promise<ContextPackTemplate> {
    const existing = await this.prisma.contextPackTemplate.findFirst({
      where: { name, isSystem: true },
    });
    if (existing) {
      return this.prisma.contextPackTemplate.update({
        where: { id: existing.id },
        data: {
          description,
          category,
          payloadJson: toPrismaJsonInput(payload),
        },
      });
    }
    return this.prisma.contextPackTemplate.create({
      data: {
        name,
        description,
        category,
        isSystem: true,
        payloadJson: toPrismaJsonInput(payload),
      },
    });
  }
}
