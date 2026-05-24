import { Injectable } from '@nestjs/common';
import { type ContextPackVersion } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { toPrismaJsonInput } from '../../../common/utilities/prisma-json.utility';
import type { VersionPayload } from '../types/context-pack-version.types';

@Injectable()
export class ContextPackVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(
    contextPackId: string,
    version: number,
    payload: VersionPayload,
    changedBy: string,
    summary: string | null,
  ): Promise<ContextPackVersion> {
    return this.prisma.contextPackVersion.create({
      data: {
        contextPackId,
        version,
        payloadJson: toPrismaJsonInput(payload),
        changedBy,
        summary,
      },
    });
  }

  async listForPack(contextPackId: string, limit = 50): Promise<ContextPackVersion[]> {
    return this.prisma.contextPackVersion.findMany({
      where: { contextPackId },
      orderBy: { version: 'desc' },
      take: limit,
    });
  }

  async findByVersion(contextPackId: string, version: number): Promise<ContextPackVersion | null> {
    return this.prisma.contextPackVersion.findUnique({
      where: { contextPackId_version: { contextPackId, version } },
    });
  }

  async prune(contextPackId: string, keep: number): Promise<number> {
    const all = await this.prisma.contextPackVersion.findMany({
      where: { contextPackId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true },
    });
    const toDelete = all.slice(keep).map((v) => v.id);
    if (toDelete.length === 0) return 0;
    const result = await this.prisma.contextPackVersion.deleteMany({
      where: { id: { in: toDelete } },
    });
    return result.count;
  }
}
