import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';

const logger = new Logger('Archive');

export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  logger.log(`extractArchive: ${archivePath} → ${destDir}`);
  await fs.promises.mkdir(destDir, { recursive: true });
  const lower = archivePath.toLowerCase();
  if (lower.endsWith('.zip')) {
    await extractZip(archivePath, destDir);
    return;
  }
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.tar')) {
    await extractTar(archivePath, destDir);
    return;
  }
  logger.error(`extractArchive: unsupported archive type ${path.extname(archivePath)}`);
  throw new Error(`Unsupported archive: ${archivePath}`);
}

async function extractTar(archivePath: string, destDir: string): Promise<void> {
  // Lazy require so test/mocks can override; service runtime always loads the real lib.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tar = require('tar') as { extract: (opts: { file: string; cwd: string; strip?: number }) => Promise<void> };
  await tar.extract({ file: archivePath, cwd: destDir, strip: 1 });
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const StreamZip = require('node-stream-zip');
  const zip = new StreamZip.async({ file: archivePath });
  try {
    await zip.extract(null, destDir);
  } finally {
    await zip.close();
  }
}
