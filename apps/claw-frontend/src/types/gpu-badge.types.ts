import type { GpuVendor } from '@/enums/gpu-vendor.enum';

export interface GpuBadgeData {
  hasGpu: boolean;
  vendor: GpuVendor;
  model: string | null;
  vramGb: number | null;
}
