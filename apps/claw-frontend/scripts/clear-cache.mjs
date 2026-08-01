import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDirectory = resolve(frontendRoot, '.next');

if (dirname(cacheDirectory) !== frontendRoot) {
  throw new Error('Refusing to clear a cache outside the frontend workspace');
}

await rm(cacheDirectory, { force: true, recursive: true });
