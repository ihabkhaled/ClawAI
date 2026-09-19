import { Injectable, Logger } from '@nestjs/common';

import { type OpsAccessToken, type Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

/** Pure data access. Never logs a token or a hash. */
@Injectable()
export class OpsTokenRepository {
  private readonly logger = new Logger(OpsTokenRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.OpsAccessTokenCreateInput): Promise<OpsAccessToken> {
    this.logger.debug(`create: name=${data.name}`);
    return this.prisma.opsAccessToken.create({ data });
  }

  async listAll(): Promise<OpsAccessToken[]> {
    return this.prisma.opsAccessToken.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async countActiveForUser(userId: string, now: Date): Promise<number> {
    return this.prisma.opsAccessToken.count({
      where: { createdByUserId: userId, revokedAt: null, expiresAt: { gt: now } },
    });
  }

  async findByHash(tokenHash: string): Promise<OpsAccessToken | null> {
    return this.prisma.opsAccessToken.findUnique({ where: { tokenHash } });
  }

  async recordUse(id: string, now: Date): Promise<void> {
    await this.prisma.opsAccessToken.update({
      where: { id },
      data: { lastUsedAt: now, useCount: { increment: 1 } },
    });
  }

  async revoke(id: string, now: Date): Promise<OpsAccessToken | null> {
    const result = await this.prisma.opsAccessToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
    return result.count === 0 ? null : this.prisma.opsAccessToken.findUnique({ where: { id } });
  }
}
