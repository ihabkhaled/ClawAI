import { type GpuBackend, type PreflightReason } from '../../../common/enums';
import { type GpuInfo } from '../../../common/types';

export interface HardwareSnapshot {
  totalRamGb: number;
  freeRamGb: number;
  totalDiskGb: number;
  freeDiskGb: number;
  cpuCores: number;
  platform: string;
  gpus: GpuInfo[];
  gpuBackend: GpuBackend;
  capturedAt: Date;
}

export interface PreflightResult {
  ok: boolean;
  reasons: PreflightReason[];
  overridable: boolean;
  overrideUsed: boolean;
  overriddenReasons: PreflightReason[];
}
