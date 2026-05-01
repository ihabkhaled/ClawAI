import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { type GpuInfo } from '../types';

import { DRI_DIR } from '../constants/hardware-detect.constants';

const logger = new Logger('Dri');

/**
 * Detects GPUs reachable via Linux DRI render nodes (/dev/dri/renderD*).
 * Used as a fallback for Intel iGPUs / Intel Arc / generic Vulkan-capable GPUs
 * when no NVIDIA or AMD ROCm device is present.
 *
 * We only enumerate the render nodes; vendor/model identification requires
 * lspci or sysfs walks which are intentionally avoided (no extra dependency).
 * llama.cpp Vulkan build will discover device details at runtime.
 */
export function detectDriGpus(): GpuInfo[] {
  if (!directoryExists(DRI_DIR)) {
    return [];
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(DRI_DIR);
  } catch (error) {
    logger.debug(`detectDriGpus: readdir failed — ${(error as Error).message}`);
    return [];
  }

  const renderNodes = entries.filter((name) => name.startsWith('renderD'));
  if (renderNodes.length === 0) {
    return [];
  }

  const gpus: GpuInfo[] = renderNodes.map((node) => ({
    vendor: 'Intel/Vulkan',
    model: path.join(DRI_DIR, node),
    vramGb: 0,
    driver: 'vulkan',
  }));

  logger.log(`detectDriGpus: found ${gpus.length} DRI render node(s)`);
  return gpus;
}

function directoryExists(target: string): boolean {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}
