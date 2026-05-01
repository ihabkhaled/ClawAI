import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  AiActionPolicyMutableFields,
  AiActionPolicyWriteInput,
} from '../types/ai-action-policy.types';
import type { AiActionPolicy } from '../../../generated/prisma';

@Injectable()
export class AiActionPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<AiActionPolicy[]> {
    return this.prisma.aiActionPolicy.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });
  }

  async findById(id: string): Promise<AiActionPolicy | null> {
    return this.prisma.aiActionPolicy.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<AiActionPolicy | null> {
    return this.prisma.aiActionPolicy.findUnique({ where: { name } });
  }

  async listAll(): Promise<AiActionPolicy[]> {
    return this.prisma.aiActionPolicy.findMany({ orderBy: [{ priority: 'desc' }, { name: 'asc' }] });
  }

  async create(data: AiActionPolicyWriteInput): Promise<AiActionPolicy> {
    return this.prisma.aiActionPolicy.create({ data });
  }

  async update(id: string, data: Partial<AiActionPolicyMutableFields>): Promise<AiActionPolicy> {
    return this.prisma.aiActionPolicy.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.aiActionPolicy.delete({ where: { id } });
  }

  async upsertSystemDefault(
    name: string,
    data: AiActionPolicyMutableFields,
  ): Promise<AiActionPolicy> {
    return this.prisma.aiActionPolicy.upsert({
      where: { name },
      create: { ...data, name },
      update: data,
    });
  }
}
