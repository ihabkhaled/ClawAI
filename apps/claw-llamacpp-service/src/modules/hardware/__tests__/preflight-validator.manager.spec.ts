import { PreflightReason, GpuBackend, ModelCategory, QualityTier, DownloadStatus, LoadStatus } from '../../../common/enums';
import { PreflightValidatorManager } from '../managers/preflight-validator.manager';
import { type CatalogEntry } from '../../catalog/types/catalog.types';
import { type HardwareSnapshot } from '../types/hardware.types';

describe('PreflightValidatorManager', () => {
  const fakePrisma = {
    preflightOverrideAudit: { create: jest.fn().mockResolvedValue({}) },
  };
  const fakeEvents = {
    preflightOverridden: jest.fn(),
  };
  const validator = new PreflightValidatorManager(fakePrisma as any, fakeEvents as any);

  const baseModel: CatalogEntry = {
    id: 'model-1',
    name: 'glm-5.1',
    tag: 'Q4_K_M',
    displayName: 'GLM-5.1',
    category: ModelCategory.THINKING,
    description: '',
    parameterCount: '754B',
    totalParamsB: 754,
    activeParamsB: 37,
    contextLength: 200_000,
    capabilities: [],
    license: 'MIT',
    huggingfaceRepo: 'unsloth/GLM-5.1-GGUF',
    filePattern: '*Q4_K_M*.gguf',
    manifestSha256: null,
    fileSizeBytes: 400n * 1_073_741_824n,
    requiredRamGb: 192,
    recommendedRamGb: 256,
    requiredDiskGb: 420,
    recommendedGpuVramGb: 24,
    isRecommended: true,
    qualityTier: QualityTier.BALANCED,
    sourceUrl: 'https://huggingface.co/x',
    chatTemplate: null,
    available: true,
    downloadStatus: DownloadStatus.AVAILABLE,
    loadStatus: LoadStatus.UNLOADED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseHw: HardwareSnapshot = {
    totalRamGb: 256,
    freeRamGb: 200,
    totalDiskGb: 1000,
    freeDiskGb: 600,
    cpuCores: 16,
    platform: 'linux-x64-cuda12',
    gpus: [{ vendor: 'NVIDIA', model: 'RTX 4090', vramGb: 24, driver: '550.0' }],
    gpuBackend: GpuBackend.CUDA,
    capturedAt: new Date(),
  };

  it('accepts when hardware is sufficient', () => {
    const result = validator.validate(baseModel, baseHw, false);
    expect(result.ok).toBe(true);
  });

  it('refuses with DISK_INSUFFICIENT (non-overridable)', () => {
    const result = validator.validate(baseModel, { ...baseHw, freeDiskGb: 100 }, true);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(PreflightReason.DISK_INSUFFICIENT);
    expect(result.overridable).toBe(false);
  });

  it('refuses with RAM_INSUFFICIENT', () => {
    const result = validator.validate(baseModel, { ...baseHw, totalRamGb: 96 }, false);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(PreflightReason.RAM_INSUFFICIENT);
    expect(result.overridable).toBe(true);
  });

  it('allows override path for RAM but not disk', () => {
    const result = validator.validate(baseModel, { ...baseHw, totalRamGb: 96 }, true);
    expect(result.ok).toBe(true);
    expect(result.overrideUsed).toBe(true);
    expect(result.overriddenReasons).toContain(PreflightReason.RAM_INSUFFICIENT);
  });

  it('refuses GPU when none available for GPU-required model', () => {
    const result = validator.validate(baseModel, { ...baseHw, gpus: [] }, false);
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain(PreflightReason.GPU_INSUFFICIENT);
  });
});
