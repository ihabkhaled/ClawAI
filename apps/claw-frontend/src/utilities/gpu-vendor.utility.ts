import { GpuVendor } from '@/enums/gpu-vendor.enum';

/**
 * Maps the raw `vendor` field from a HardwareSnapshot GPU entry into the
 * normalized GpuVendor enum used by the GPU badge.
 */
export function classifyGpuVendor(rawVendor: string): GpuVendor {
  const lower = rawVendor.toLowerCase();
  if (lower.includes('nvidia')) {
    return GpuVendor.NVIDIA;
  }
  if (lower.includes('amd') || lower.includes('radeon')) {
    return GpuVendor.AMD;
  }
  if (lower.includes('apple')) {
    return GpuVendor.METAL;
  }
  if (lower.includes('intel') || lower.includes('vulkan')) {
    return GpuVendor.INTEL;
  }
  return GpuVendor.UNKNOWN;
}
