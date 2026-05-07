'use client';

import { GpuVendor } from '@/enums/gpu-vendor.enum';
import { useHardwareSnapshot } from '@/hooks/local-frontier/use-hardware-snapshot';
import type { GpuBadgeData } from '@/types/gpu-badge.types';
import { classifyGpuVendor } from '@/utilities/gpu-vendor.utility';

export function useGpuBadge(): GpuBadgeData {
  const query = useHardwareSnapshot();
  const hardware = query.data;
  const firstGpu = hardware?.gpus?.[0];

  if (!firstGpu) {
    return { hasGpu: false, vendor: GpuVendor.CPU, model: null, vramGb: null };
  }

  return {
    hasGpu: true,
    vendor: classifyGpuVendor(firstGpu.vendor),
    model: firstGpu.model,
    vramGb: firstGpu.vramGb,
  };
}
