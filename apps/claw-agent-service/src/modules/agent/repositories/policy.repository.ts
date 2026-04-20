import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { AccessPolicy, Prisma } from '../../../generated/prisma';

@Injectable()
export class PolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AccessPolicyCreateInput): Promise<AccessPolicy> {
    return this.prisma.accessPolicy.create({ data });
  }

  async upsertByName(name: string, data: Prisma.AccessPolicyCreateInput): Promise<AccessPolicy> {
    const existing = await this.prisma.accessPolicy.findFirst({ where: { name, orgId: null } });
    if (existing === null) {
      return this.prisma.accessPolicy.create({ data });
    }
    return this.prisma.accessPolicy.update({ where: { id: existing.id }, data });
  }

  async findActive(): Promise<AccessPolicy[]> {
    return this.prisma.accessPolicy.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string): Promise<AccessPolicy | null> {
    return this.prisma.accessPolicy.findUnique({ where: { id } });
  }

  async list(): Promise<AccessPolicy[]> {
    return this.prisma.accessPolicy.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async setActive(id: string, isActive: boolean): Promise<AccessPolicy> {
    return this.prisma.accessPolicy.update({ where: { id }, data: { isActive } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.accessPolicy.delete({ where: { id } });
  }
}
