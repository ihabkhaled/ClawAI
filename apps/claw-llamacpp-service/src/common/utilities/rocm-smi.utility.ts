import * as fs from 'node:fs';
import { Logger } from '@nestjs/common';
import { execFileSafe } from './process-runner.utility';
import { ROCM_SMI_QUERY as ROCM_QUERY } from '../constants/hardware-detect.constants';
import { type GpuInfo } from '../types';

const logger = new Logger('RocmSmi');

export async function detectRocmGpus(): Promise<GpuInfo[]> {
  logger.debug('detectRocmGpus: probing ROCm');
  if (!hasKfdDevice()) {
    logger.debug('detectRocmGpus: /dev/kfd missing — no ROCm GPU available');
    return [];
  }

  const result = await execFileSafe('rocm-smi', ROCM_QUERY, 5000);
  if (result.exitCode !== 0) {
    logger.debug(`detectRocmGpus: rocm-smi unavailable (exit=${String(result.exitCode)})`);
    return [];
  }

  const gpus: GpuInfo[] = parseRocmCsv(result.stdout);
  logger.log(`detectRocmGpus: found ${gpus.length} AMD ROCm GPU(s)`);
  return gpus;
}

function hasKfdDevice(): boolean {
  try {
    return fs.existsSync('/dev/kfd');
  } catch {
    return false;
  }
}

function parseRocmCsv(stdout: string): GpuInfo[] {
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return [];
  }

  const gpus: GpuInfo[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((value) => value.trim());
    if (cols.length < 2) {
      continue;
    }
    const model = cols[1] ?? 'AMD GPU';
    const vramBytes = Number(cols[2] ?? 0);
    gpus.push({
      vendor: 'AMD',
      model,
      vramGb: vramBytes > 0 ? Math.floor(vramBytes / 1_073_741_824) : 0,
      driver: 'rocm',
    });
  }
  return gpus;
}
