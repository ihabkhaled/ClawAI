'use client';

import { Permission } from '@/enums';
import { GpuVendor } from '@/enums/gpu-vendor.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { useHardwareSnapshot } from '@/hooks/local-frontier/use-hardware-snapshot';
import type { GpuBadgeData } from '@/types/gpu-badge.types';
import { classifyGpuVendor } from '@/utilities/gpu-vendor.utility';

export function useGpuBadge(): GpuBadgeData {
  const { can } = usePermissions();
  const canView = can(Permission.ADMIN_SYSTEM_VIEW);
  const query = useHardwareSnapshot();
  const hardware = query.data;
  const firstGpu = hardware?.gpus?.[0];

  if (!firstGpu) {
    return { canView, hasGpu: false, vendor: GpuVendor.CPU, model: null, vramGb: null };
  }

  return {
    canView,
    hasGpu: true,
    vendor: classifyGpuVendor(firstGpu.vendor),
    model: firstGpu.model,
    vramGb: firstGpu.vramGb,
  };
}
