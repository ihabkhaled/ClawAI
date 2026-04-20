import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { RefreshTokenStatus } from '../../../common/enums/refresh-token-status.enum';
import type { Prisma, RefreshToken } from '../../../generated/prisma';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { jti } });
  }

  async markUsed(id: string, replacedById: string, ip: string | null): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        status: RefreshTokenStatus.USED,
        usedAt: new Date(),
        replacedById,
        lastUsedIp: ip,
      },
    });
  }

  async revokeAllForDevice(deviceId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { deviceId, status: { in: [RefreshTokenStatus.ACTIVE, RefreshTokenStatus.USED] } },
      data: { status: RefreshTokenStatus.REVOKED },
    });
    return result.count;
  }

  async purgeExpired(cutoff: Date): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return result.count;
  }
}
