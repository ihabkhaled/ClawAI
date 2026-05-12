import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, UserEmailSignature } from '../../../generated/prisma';

@Injectable()
export class EmailSignatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<UserEmailSignature[]> {
    return this.prisma.userEmailSignature.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<UserEmailSignature | null> {
    return this.prisma.userEmailSignature.findUnique({ where: { id } });
  }

  async findDefaultForUser(userId: string): Promise<UserEmailSignature | null> {
    return this.prisma.userEmailSignature.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async findByName(userId: string, name: string): Promise<UserEmailSignature | null> {
    return this.prisma.userEmailSignature.findUnique({
      where: { userId_name: { userId, name } },
    });
  }

  async create(data: Prisma.UserEmailSignatureUncheckedCreateInput): Promise<UserEmailSignature> {
    return this.prisma.userEmailSignature.create({ data });
  }

  async update(
    id: string,
    data: Prisma.UserEmailSignatureUpdateInput,
  ): Promise<UserEmailSignature> {
    return this.prisma.userEmailSignature.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.userEmailSignature.delete({ where: { id } });
  }

  // Used by setDefault: flip every other row off for this user.
  async clearDefaultsForUser(userId: string, excludeId: string): Promise<void> {
    await this.prisma.userEmailSignature.updateMany({
      where: { userId, isDefault: true, NOT: { id: excludeId } },
      data: { isDefault: false },
    });
  }
}
