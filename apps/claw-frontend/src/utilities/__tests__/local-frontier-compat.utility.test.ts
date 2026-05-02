import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import {
  FrontierDownloadStatus,
  FrontierLoadStatus,
  FrontierModelCategory,
  FrontierQualityTier,
  HardwareCompat,
  PreflightReasonCode,
} from '@/enums/local-frontier.enum';
import type { FrontierCatalogEntry, HardwareSnapshot } from '@/types/local-frontier.types';
import {
  classifyCompat,
  formatBytes,
  formatPercent,
  pickCompatIcon,
  pickCompatLabel,
  pickTierLabel,
} from '@/utilities/local-frontier-compat.utility';

function makeEntry(over: Partial<FrontierCatalogEntry> = {}): FrontierCatalogEntry {
  return {
    id: 'm1',
    name: 'glm-5.1',
    tag: 'Q4_K_M',
    displayName: 'GLM-5.1',
    category: FrontierModelCategory.THINKING,
    description: '',
    parameterCount: '754B',
    totalParamsB: 754,
    activeParamsB: 37,
    contextLength: 200_000,
    capabilities: [],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/GLM-5.1-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    fileSizeBytes: 400 * 1_073_741_824,
    requiredRamGb: 96,
    recommendedRamGb: 128,
    requiredDiskGb: 200,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: FrontierQualityTier.BALANCED,
    sourceUrl: 'https://huggingface.co/x',
    downloadStatus: FrontierDownloadStatus.AVAILABLE,
    loadStatus: FrontierLoadStatus.UNLOADED,
    available: true,
    ...over,
  };
}

function makeHw(over: Partial<HardwareSnapshot> = {}): HardwareSnapshot {
  return {
    totalRamGb: 256,
    freeRamGb: 200,
    totalDiskGb: 1000,
    freeDiskGb: 600,
    cpuCores: 16,
    platform: 'linux-x64-cuda12',
    gpus: [{ vendor: 'NVIDIA', model: 'RTX 4090', vramGb: 24, driver: '550' }],
    gpuBackend: 'CUDA',
    capturedAt: new Date().toISOString(),
    ...over,
  };
}

describe('classifyCompat', () => {
  it('returns WARNS with no reasons when hardware snapshot is missing', () => {
    expect(classifyCompat(makeEntry(), undefined)).toEqual({
      chip: HardwareCompat.WARNS,
      reasons: [],
    });
  });

  it('returns FITS when all requirements are met', () => {
    const result = classifyCompat(makeEntry(), makeHw());
    expect(result.chip).toBe(HardwareCompat.FITS);
    expect(result.reasons).toHaveLength(0);
  });

  it('returns REFUSES (non-overridable) when disk insufficient', () => {
    const result = classifyCompat(makeEntry(), makeHw({ freeDiskGb: 50 }));
    expect(result.chip).toBe(HardwareCompat.REFUSES);
    expect(result.reasons).toContain(PreflightReasonCode.DISK_INSUFFICIENT);
  });

  it('returns WARNS when RAM insufficient (but disk ok)', () => {
    const result = classifyCompat(makeEntry({ requiredRamGb: 1024 }), makeHw());
    expect(result.chip).toBe(HardwareCompat.WARNS);
    expect(result.reasons).toContain(PreflightReasonCode.RAM_INSUFFICIENT);
  });

  it('returns WARNS when GPU model expected but no GPUs reported', () => {
    const result = classifyCompat(makeEntry(), makeHw({ gpus: [] }));
    expect(result.chip).toBe(HardwareCompat.WARNS);
    expect(result.reasons).toContain(PreflightReasonCode.GPU_INSUFFICIENT);
  });

  it('returns WARNS even with no errors when host RAM below recommended', () => {
    const result = classifyCompat(makeEntry({ recommendedRamGb: 9999 }), makeHw());
    expect(result.chip).toBe(HardwareCompat.WARNS);
    expect(result.reasons).toHaveLength(0);
  });
});

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1_048_576, '1.0 MB'],
    [1_073_741_824, '1.0 GB'],
    [400 * 1_073_741_824, '400.0 GB'],
  ])('formats %d bytes as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});

describe('formatPercent', () => {
  it('returns 0 when total is zero or negative', () => {
    expect(formatPercent(0, 0)).toBe(0);
    expect(formatPercent(50, -1)).toBe(0);
  });

  it('floors the percentage', () => {
    expect(formatPercent(33, 100)).toBe(33);
    expect(formatPercent(33.9, 100)).toBe(33);
  });

  it('clamps to 100 when downloaded exceeds total', () => {
    expect(formatPercent(200, 100)).toBe(100);
  });
});

describe('pickCompatIcon', () => {
  it('FITS → ShieldCheck', () => {
    expect(pickCompatIcon(HardwareCompat.FITS)).toBe(ShieldCheck);
  });
  it('REFUSES → ShieldX', () => {
    expect(pickCompatIcon(HardwareCompat.REFUSES)).toBe(ShieldX);
  });
  it('WARNS (and any other) → ShieldAlert', () => {
    expect(pickCompatIcon(HardwareCompat.WARNS)).toBe(ShieldAlert);
  });
});

describe('pickCompatLabel', () => {
  const labels = { fits: 'Fits', warns: 'Warns', refuses: 'Refuses' };
  it('selects label by chip', () => {
    expect(pickCompatLabel(HardwareCompat.FITS, labels)).toBe('Fits');
    expect(pickCompatLabel(HardwareCompat.WARNS, labels)).toBe('Warns');
    expect(pickCompatLabel(HardwareCompat.REFUSES, labels)).toBe('Refuses');
  });
});

describe('pickTierLabel', () => {
  const labels = { survival: 'Survival', balanced: 'Balanced', best: 'Best' };
  it('selects label by tier', () => {
    expect(pickTierLabel(FrontierQualityTier.SURVIVAL, labels)).toBe('Survival');
    expect(pickTierLabel(FrontierQualityTier.BALANCED, labels)).toBe('Balanced');
    expect(pickTierLabel(FrontierQualityTier.BEST, labels)).toBe('Best');
  });
});
