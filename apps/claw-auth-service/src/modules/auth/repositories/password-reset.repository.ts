import { Injectable } from '@nestjs/common';
import type { PasswordResetToken, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.PasswordResetTokenCreateInput): Promise<PasswordResetToken> {
    return this.prisma.passwordResetToken.create({ data });
  }

  findActiveByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async consume(id: string): Promise<boolean> {
    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
  }
}
