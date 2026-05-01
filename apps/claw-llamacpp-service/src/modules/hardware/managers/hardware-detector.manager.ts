import * as os from 'node:os';
import { Injectable, Logger } from '@nestjs/common';
import { detectNvidiaGpus, detectPlatform, getDiskSpace } from '../../../common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { GpuBackend } from '../../../common/enums';
import { type HardwareSnapshot } from '../types/hardware.types';
import { HardwareSnapshotRepository } from '../repositories/hardware-snapshot.repository';
import { HARDWARE_CACHE_TTL_MS, HARDWARE_RETAIN } from '../constants/hardware.constants';

@Injectable()
export class HardwareDetectorManager {
  private readonly logger = new Logger(HardwareDetectorManager.name);
  private cached: HardwareSnapshot | null = null;
  private cachedAt = 0;

  constructor(private readonly snapshotRepo: HardwareSnapshotRepository) {}

  async snapshot(force = false): Promise<HardwareSnapshot> {
    if (!force && this.cached && Date.now() - this.cachedAt < HARDWARE_CACHE_TTL_MS) {
      return this.cached;
    }
    this.logger.log('snapshot: capturing fresh hardware snapshot');
    const platform = await detectPlatform();
    const gpus = await detectNvidiaGpus();
    const disk = await getDiskSpace(AppConfig.get().LLAMACPP_DATA_PATH);
    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();

    const snap: HardwareSnapshot = {
      totalRamGb: this.bytesToGb(BigInt(totalRamBytes)),
      freeRamGb: this.bytesToGb(BigInt(freeRamBytes)),
      totalDiskGb: this.bytesToGb(disk.totalBytes),
      freeDiskGb: this.bytesToGb(disk.freeBytes),
      cpuCores: os.cpus().length,
      platform: platform.key,
      gpus,
      gpuBackend: this.deriveBackend(platform.gpuBackend, gpus),
      capturedAt: new Date(),
    };
    this.cached = snap;
    this.cachedAt = Date.now();
    try {
      await this.snapshotRepo.insert(snap);
      await this.snapshotRepo.pruneOlderThan(HARDWARE_RETAIN);
    } catch (error) {
      this.logger.error(`snapshot: persist failed — ${(error as Error).message}`);
    }
    return snap;
  }

  getCached(): HardwareSnapshot | null {
    return this.cached;
  }

  private bytesToGb(value: bigint): number {
    if (value <= 0n) {
      return 0;
    }
    return Number(value / 1_073_741_824n);
  }

  private deriveBackend(detected: GpuBackend, gpus: HardwareSnapshot['gpus']): GpuBackend {
    if (gpus.length > 0) {
      return GpuBackend.CUDA;
    }
    return detected === GpuBackend.AUTO ? GpuBackend.CPU : detected;
  }
}
