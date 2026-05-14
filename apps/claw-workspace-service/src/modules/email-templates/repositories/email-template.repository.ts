import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, UserEmailTemplate } from '../../../generated/prisma';

@Injectable()
export class EmailTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<UserEmailTemplate[]> {
    return this.prisma.userEmailTemplate.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<UserEmailTemplate | null> {
    return this.prisma.userEmailTemplate.findUnique({ where: { id } });
  }

  async findDefaultForUser(userId: string): Promise<UserEmailTemplate | null> {
    return this.prisma.userEmailTemplate.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async findByName(userId: string, name: string): Promise<UserEmailTemplate | null> {
    return this.prisma.userEmailTemplate.findUnique({
      where: { userId_name: { userId, name } },
    });
  }

  async create(data: Prisma.UserEmailTemplateUncheckedCreateInput): Promise<UserEmailTemplate> {
    return this.prisma.userEmailTemplate.create({ data });
  }

  async update(
    id: string,
    data: Prisma.UserEmailTemplateUpdateInput,
  ): Promise<UserEmailTemplate> {
    return this.prisma.userEmailTemplate.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.userEmailTemplate.delete({ where: { id } });
  }

  // Used by setDefault: flip every other row off for this user.
  async clearDefaultsForUser(userId: string, excludeId: string): Promise<void> {
    await this.prisma.userEmailTemplate.updateMany({
      where: { userId, isDefault: true, NOT: { id: excludeId } },
      data: { isDefault: false },
    });
  }
}
