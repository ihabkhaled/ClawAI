import { HardwareCompat, PreflightReasonCode } from '@/enums/local-frontier.enum';
import type {
  CompatChipMeta,
  FrontierCatalogEntry,
  HardwareSnapshot,
} from '@/types/local-frontier.types';

const DISK_HEADROOM_FACTOR = 1.05;

export function classifyCompat(
  entry: FrontierCatalogEntry,
  hardware: HardwareSnapshot | undefined,
): CompatChipMeta {
  if (!hardware) {
    return { chip: HardwareCompat.WARNS, reasons: [] };
  }
  const reasons: PreflightReasonCode[] = [];
  if (hardware.freeDiskGb < Math.ceil(entry.requiredDiskGb * DISK_HEADROOM_FACTOR)) {
    reasons.push(PreflightReasonCode.DISK_INSUFFICIENT);
  }
  if (hardware.totalRamGb > 0 && hardware.totalRamGb < entry.requiredRamGb) {
    reasons.push(PreflightReasonCode.RAM_INSUFFICIENT);
  }
  if (entry.recommendedGpuVramGb > 0 && hardware.gpus.length === 0) {
    reasons.push(PreflightReasonCode.GPU_INSUFFICIENT);
  }
  if (reasons.length === 0) {
    if (hardware.totalRamGb < entry.recommendedRamGb) {
      return { chip: HardwareCompat.WARNS, reasons };
    }
    return { chip: HardwareCompat.FITS, reasons };
  }
  if (reasons.includes(PreflightReasonCode.DISK_INSUFFICIENT)) {
    return { chip: HardwareCompat.REFUSES, reasons };
  }
  return { chip: HardwareCompat.WARNS, reasons };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }
  return `${bytes} B`;
}

export function formatPercent(downloaded: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.floor((downloaded / total) * 100));
}
