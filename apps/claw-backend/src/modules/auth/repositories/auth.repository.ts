import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { Session, User } from "@prisma/client";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createSession(data: {
    userId: string;
    refreshToken: string;
    expiresAt: Date;
  }): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { refreshToken } });
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
