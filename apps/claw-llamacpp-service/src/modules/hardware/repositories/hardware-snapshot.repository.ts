import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type GpuBackend } from '../../../common/enums';
import { type HardwareSnapshot } from '../types/hardware.types';

@Injectable()
export class HardwareSnapshotRepository {
  private readonly logger = new Logger(HardwareSnapshotRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async insert(snapshot: HardwareSnapshot): Promise<void> {
    this.logger.debug(`insert: capturedAt=${snapshot.capturedAt.toISOString()}`);
    await this.prisma.hardwareSnapshot.create({
      data: {
        totalRamGb: snapshot.totalRamGb,
        freeRamGb: snapshot.freeRamGb,
        totalDiskGb: snapshot.totalDiskGb,
        freeDiskGb: snapshot.freeDiskGb,
        cpuCores: snapshot.cpuCores,
        platform: snapshot.platform,
        gpus: snapshot.gpus as unknown as object,
        gpuBackend: snapshot.gpuBackend,
        capturedAt: snapshot.capturedAt,
      },
    });
  }

  async findLatest(): Promise<HardwareSnapshot | null> {
    const row = await this.prisma.hardwareSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } });
    if (!row) {
      return null;
    }
    return {
      totalRamGb: row.totalRamGb,
      freeRamGb: row.freeRamGb,
      totalDiskGb: row.totalDiskGb,
      freeDiskGb: row.freeDiskGb,
      cpuCores: row.cpuCores,
      platform: row.platform,
      gpus: row.gpus as unknown as HardwareSnapshot['gpus'],
      gpuBackend: row.gpuBackend as GpuBackend,
      capturedAt: row.capturedAt,
    };
  }

  async pruneOlderThan(keep: number): Promise<void> {
    const rows = await this.prisma.hardwareSnapshot.findMany({
      orderBy: { capturedAt: 'desc' },
      skip: keep,
      select: { id: true },
    });
    if (rows.length === 0) {
      return;
    }
    await this.prisma.hardwareSnapshot.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  }
}
