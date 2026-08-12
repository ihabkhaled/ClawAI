import { Injectable } from '@nestjs/common';
import type { EmailVerificationToken, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.EmailVerificationTokenCreateInput): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.create({ data });
  }

  async replaceForUser(
    userId: string,
    data: Omit<Prisma.EmailVerificationTokenCreateInput, 'user'>,
  ): Promise<EmailVerificationToken> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.emailVerificationToken.deleteMany({ where: { userId, consumedAt: null } });
      return transaction.emailVerificationToken.create({
        data: { ...data, user: { connect: { id: userId } } },
      });
    });
  }

  async consumeAndActivate(tokenHash: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await transaction.emailVerificationToken.findFirst({
        where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!token) return false;
      const consumed = await transaction.emailVerificationToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return false;
      await transaction.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
      return true;
    });
  }
}
