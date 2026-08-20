import { Injectable } from '@nestjs/common';
import type { EmailChangeRequest, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { EmailChangeStage } from '../enums/email-change-stage.enum';
import { EMAIL_CHANGE_OTP_MAX_ATTEMPTS } from '../constants/email-change.constants';
import type { EmailChangeCompletionResult } from '../types/email-change.types';

@Injectable()
export class EmailChangeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(data: Prisma.EmailChangeRequestCreateInput): Promise<EmailChangeRequest> {
    return this.prisma.emailChangeRequest.create({ data });
  }

  async findActiveByUserId(userId: string): Promise<EmailChangeRequest | null> {
    return this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        activeKey: userId,
        stage: {
          in: [EmailChangeStage.OLD_EMAIL_PENDING, EmailChangeStage.NEW_EMAIL_PENDING],
        },
      },
    });
  }

  async findActiveById(id: string): Promise<EmailChangeRequest | null> {
    return this.prisma.emailChangeRequest.findFirst({
      where: {
        id,
        activeKey: {
          not: null,
        },
      },
    });
  }

  async countRecentForUser(userId: string, since: Date): Promise<number> {
    return this.prisma.emailChangeRequest.count({
      where: {
        userId,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  async touchLastSentAt(id: string): Promise<boolean> {
    const result = await this.prisma.emailChangeRequest.updateMany({
      where: {
        id,
        activeKey: {
          not: null,
        },
        stage: {
          in: [EmailChangeStage.OLD_EMAIL_PENDING, EmailChangeStage.NEW_EMAIL_PENDING],
        },
      },
      data: {
        lastSentAt: new Date(),
      },
    });
    return result.count === 1;
  }

  async cancel(id: string): Promise<boolean> {
    const result = await this.prisma.emailChangeRequest.updateMany({
      where: {
        id,
        activeKey: {
          not: null,
        },
        stage: {
          in: [EmailChangeStage.OLD_EMAIL_PENDING, EmailChangeStage.NEW_EMAIL_PENDING],
        },
      },
      data: {
        stage: EmailChangeStage.CANCELLED,
        activeKey: null,
        cancelledAt: new Date(),
      },
    });
    return result.count === 1;
  }

  async recordOldEmailFailure(id: string): Promise<EmailChangeRequest | null> {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const incrementResult = await transaction.emailChangeRequest.updateMany({
        where: {
          id,
          activeKey: {
            not: null,
          },
          stage: EmailChangeStage.OLD_EMAIL_PENDING,
          oldEmailOtpExpiresAt: {
            gt: now,
          },
          oldEmailAttempts: {
            lt: EMAIL_CHANGE_OTP_MAX_ATTEMPTS,
          },
        },
        data: {
          oldEmailAttempts: {
            increment: 1,
          },
        },
      });

      if (incrementResult.count !== 1) {
        return null;
      }

      let updated = await transaction.emailChangeRequest.findUnique({ where: { id } });
      if (updated === null) {
        return null;
      }

      if (updated.oldEmailAttempts >= EMAIL_CHANGE_OTP_MAX_ATTEMPTS) {
        const cancelResult = await transaction.emailChangeRequest.updateMany({
          where: {
            id,
            activeKey: {
              not: null,
            },
            stage: EmailChangeStage.OLD_EMAIL_PENDING,
          },
          data: {
            stage: EmailChangeStage.CANCELLED,
            activeKey: null,
            cancelledAt: now,
          },
        });

        if (cancelResult.count !== 1) {
          return null;
        }

        updated = await transaction.emailChangeRequest.findUnique({ where: { id } });
      }

      return updated;
    });
  }

  async updateOldEmailOtp(
    id: string,
    oldEmailOtpHash: string,
    expiresAt: Date,
  ): Promise<EmailChangeRequest | null> {
    const now = new Date();
    const result = await this.prisma.emailChangeRequest.updateMany({
      where: {
        id,
        activeKey: {
          not: null,
        },
        stage: EmailChangeStage.OLD_EMAIL_PENDING,
      },
      data: {
        oldEmailOtpHash,
        oldEmailOtpExpiresAt: expiresAt,
        oldEmailAttempts: 0,
        lastSentAt: now,
      },
    });
    if (result.count !== 1) {
      return null;
    }
    return this.prisma.emailChangeRequest.findUnique({ where: { id } });
  }

  async markOldEmailVerified(
    id: string,
    newEmailTokenHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.prisma.emailChangeRequest.updateMany({
      where: {
        id,
        activeKey: {
          not: null,
        },
        stage: EmailChangeStage.OLD_EMAIL_PENDING,
        oldEmailOtpExpiresAt: {
          gt: now,
        },
      },
      data: {
        stage: EmailChangeStage.NEW_EMAIL_PENDING,
        oldEmailVerifiedAt: now,
        newEmailTokenHash,
        newEmailExpiresAt: expiresAt,
        lastSentAt: now,
      },
    });
    return result.count === 1;
  }

  async consumeAndApplyEmailChange(tokenHash: string): Promise<EmailChangeCompletionResult> {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.emailChangeRequest.findFirst({
        where: {
          newEmailTokenHash: tokenHash,
          stage: EmailChangeStage.NEW_EMAIL_PENDING,
          activeKey: {
            not: null,
          },
          newEmailExpiresAt: {
            gt: now,
          },
        },
      });

      if (request === null) {
        return { changed: false };
      }

      const conflictingOwner = await transaction.user.findUnique({
        where: { email: request.newEmail },
      });

      if (conflictingOwner !== null && conflictingOwner.id !== request.userId) {
        return { changed: false };
      }

      const currentUser = await transaction.user.findUnique({
        where: { id: request.userId },
        select: { email: true },
      });
      if (currentUser === null) {
        return { changed: false };
      }

      const updateRequestResult = await transaction.emailChangeRequest.updateMany({
        where: {
          id: request.id,
          stage: EmailChangeStage.NEW_EMAIL_PENDING,
          activeKey: {
            not: null,
          },
          newEmailTokenHash: tokenHash,
          newEmailExpiresAt: {
            gt: now,
          },
        },
        data: {
          stage: EmailChangeStage.COMPLETED,
          activeKey: null,
          completedAt: now,
        },
      });

      if (updateRequestResult.count !== 1) {
        return { changed: false };
      }

      await transaction.user.update({
        where: { id: request.userId },
        data: {
          email: request.newEmail,
          emailVerifiedAt: now,
        },
      });

      await transaction.session.deleteMany({ where: { userId: request.userId } });
      await transaction.passwordResetToken.deleteMany({ where: { userId: request.userId } });
      await transaction.emailVerificationToken.deleteMany({ where: { userId: request.userId } });

      return { changed: true, oldEmail: currentUser.email };
    });
  }
}
