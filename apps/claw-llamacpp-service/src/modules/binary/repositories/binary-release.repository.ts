import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

@Injectable()
export class BinaryReleaseRepository {
  private readonly logger = new Logger(BinaryReleaseRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findActive(platform: string): Promise<{
    id: string;
    version: string;
    platform: string;
    binaryPath: string;
    archiveSha256: string;
  } | null> {
    this.logger.debug(`findActive: platform=${platform}`);
    const row = await this.prisma.binaryRelease.findFirst({
      where: { platform, isActive: true },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      version: row.version,
      platform: row.platform,
      binaryPath: row.binaryPath,
      archiveSha256: row.archiveSha256,
    };
  }

  async upsertActive(payload: {
    version: string;
    platform: string;
    archiveUrl: string;
    archiveSha256: string;
    binaryPath: string;
  }): Promise<void> {
    this.logger.log(`upsertActive: ${payload.platform} v${payload.version}`);
    await this.prisma.binaryRelease.updateMany({
      where: { platform: payload.platform },
      data: { isActive: false },
    });
    await this.prisma.binaryRelease.upsert({
      where: { version_platform: { version: payload.version, platform: payload.platform } },
      create: {
        version: payload.version,
        platform: payload.platform,
        archiveUrl: payload.archiveUrl,
        archiveSha256: payload.archiveSha256,
        binaryPath: payload.binaryPath,
        isActive: true,
      },
      update: {
        archiveUrl: payload.archiveUrl,
        archiveSha256: payload.archiveSha256,
        binaryPath: payload.binaryPath,
        isActive: true,
      },
    });
  }
}
