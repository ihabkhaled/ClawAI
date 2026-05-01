import * as os from 'node:os';
import { Logger } from '@nestjs/common';
import { GpuBackend } from '../enums';
import { type PlatformDescriptor } from '../types';
import { detectDriGpus } from './dri.utility';
import { detectNvidiaGpus } from './nvidia-smi.utility';
import { detectRocmGpus } from './rocm-smi.utility';

const logger = new Logger('Platform');

export async function detectPlatform(): Promise<PlatformDescriptor> {
  logger.debug('detectPlatform: detecting OS/arch/gpu');
  const platform = os.platform();
  const arch = os.arch();

  const osNorm = normalizeOs(platform);
  const archNorm = normalizeArch(arch);
  const gpuBackend = await detectGpuBackend(osNorm);
  const key = buildPlatformKey(osNorm, archNorm, gpuBackend);
  logger.log(`detectPlatform: ${key}`);
  return { os: osNorm, arch: archNorm, gpuBackend, key };
}

function normalizeOs(platform: NodeJS.Platform): 'linux' | 'darwin' | 'win32' {
  if (platform === 'darwin') {
    return 'darwin';
  }
  if (platform === 'win32') {
    return 'win32';
  }
  return 'linux';
}

function normalizeArch(arch: string): 'x64' | 'arm64' {
  if (arch === 'arm64') {
    return 'arm64';
  }
  return 'x64';
}

async function detectGpuBackend(osNorm: 'linux' | 'darwin' | 'win32'): Promise<GpuBackend> {
  if (osNorm === 'darwin') {
    return GpuBackend.METAL;
  }

  // NVIDIA wins if present (CUDA gives best llama.cpp perf today).
  const nvidia = await detectNvidiaGpus();
  if (nvidia.length > 0) {
    return GpuBackend.CUDA;
  }

  // AMD ROCm next — Linux only, but cheap to probe via /dev/kfd.
  if (osNorm === 'linux') {
    const rocm = await detectRocmGpus();
    if (rocm.length > 0) {
      return GpuBackend.ROCM;
    }

    // Intel iGPU / Intel Arc / generic Vulkan via /dev/dri render nodes.
    const dri = detectDriGpus();
    if (dri.length > 0) {
      return GpuBackend.VULKAN;
    }
  }

  return GpuBackend.CPU;
}

function buildPlatformKey(
  osNorm: 'linux' | 'darwin' | 'win32',
  archNorm: 'x64' | 'arm64',
  gpu: GpuBackend,
): string {
  return `${pickOsLabel(osNorm)}-${archNorm}-${pickGpuLabel(gpu)}`;
}

function pickOsLabel(osNorm: 'linux' | 'darwin' | 'win32'): string {
  if (osNorm === 'win32') return 'win';
  if (osNorm === 'darwin') return 'darwin';
  return 'linux';
}

function pickGpuLabel(gpu: GpuBackend): string {
  if (gpu === GpuBackend.CUDA) return 'cuda12';
  if (gpu === GpuBackend.ROCM) return 'rocm';
  if (gpu === GpuBackend.METAL) return 'metal';
  return gpu.toLowerCase();
}
