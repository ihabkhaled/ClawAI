import * as fs from 'node:fs';
import { Logger } from '@nestjs/common';
import { type DiskSpace } from '../types/disk-space.type';

const logger = new Logger('DiskSpace');

export async function getDiskSpace(targetPath: string): Promise<DiskSpace> {
  try {
    const stat = await fs.promises.statfs(targetPath);
    const blocks = BigInt(stat.blocks);
    const bavail = BigInt(stat.bavail);
    const bsize = BigInt(stat.bsize);
    return { totalBytes: blocks * bsize, freeBytes: bavail * bsize };
  } catch (error) {
    logger.warn(`getDiskSpace: ${targetPath} — ${(error as Error).message}; reporting 0/0`);
    return { totalBytes: 0n, freeBytes: 0n };
  }
}
