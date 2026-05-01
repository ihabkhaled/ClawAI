import { Logger } from '@nestjs/common';
import { execFileSafe } from './process-runner.utility';
import { NVIDIA_SMI_QUERY } from '../constants/hardware-detect.constants';
import { type GpuInfo } from '../types';

const logger = new Logger('NvidiaSmi');

export async function detectNvidiaGpus(): Promise<GpuInfo[]> {
  logger.debug('detectNvidiaGpus: invoking nvidia-smi');
  const result = await execFileSafe('nvidia-smi', NVIDIA_SMI_QUERY, 5000);
  if (result.exitCode !== 0) {
    logger.debug(`detectNvidiaGpus: nvidia-smi unavailable (exit=${String(result.exitCode)})`);
    return [];
  }
  const gpus: GpuInfo[] = [];
  const lines = result.stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    const parts = line.split(',').map((part) => part.trim());
    if (parts.length < 3) {
      continue;
    }
    const model = parts[0] ?? 'Unknown';
    const memMb = Number(parts[1] ?? 0);
    const driver = parts[2] ?? 'unknown';
    gpus.push({
      vendor: 'NVIDIA',
      model,
      vramGb: Math.floor(memMb / 1024),
      driver,
    });
  }
  logger.log(`detectNvidiaGpus: found ${gpus.length} NVIDIA GPU(s)`);
  return gpus;
}
