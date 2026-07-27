import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { Prisma, Session, User } from '../../../generated/prisma';
import type { CreateSessionInput, RotateSessionInput } from '../types/session.types';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async createSession(data: CreateSessionInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { refreshTokenHash } });
  }

  async rotateSession(input: RotateSessionInput): Promise<Session | null> {
    return this.prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.session.updateMany({
        where: {
          id: input.currentSessionId,
          revokedAt: null,
          usedAt: null,
        },
        data: {
          replacedBySessionId: input.replacement.id,
          usedAt: input.usedAt,
        },
      });

      if (updateResult.count !== 1) {
        return null;
      }

      return transaction.session.create({
        data: input.replacement,
      });
    });
  }

  async revokeSessionFamily(familyId: string, revokedAt = new Date()): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: { revokedAt },
    });

    return result.count;
  }

  async revokeSessionForUser(
    sessionId: string,
    userId: string,
    revokedAt = new Date(),
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt },
    });

    return result.count;
  }

  async deleteSession(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async deleteSessionsByUserId(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
