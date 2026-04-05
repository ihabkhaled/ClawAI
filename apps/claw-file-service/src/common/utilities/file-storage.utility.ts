import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppConfig } from '../../app/config/app.config';

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function ensureWithinStorageRoot(resolvedPath: string, storageRoot: string): void {
  const normalizedRoot = path.resolve(storageRoot);
  const normalizedPath = path.resolve(resolvedPath);
  if (!normalizedPath.startsWith(normalizedRoot + path.sep) && normalizedPath !== normalizedRoot) {
    throw new Error('Path traversal detected: resolved path is outside storage root');
  }
}

export function saveFile(filename: string, content: Buffer): string {
  const config = AppConfig.get();
  const safeFilename = sanitizeFilename(filename);
  const storagePath = path.join(config.FILE_STORAGE_PATH, safeFilename);

  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(storagePath, content);
  return storagePath;
}

export function deleteFile(storagePath: string): void {
  const config = AppConfig.get();
  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  if (fs.existsSync(storagePath)) {
    fs.unlinkSync(storagePath);
  }
}

export function readFile(storagePath: string): Buffer {
  const config = AppConfig.get();
  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  return fs.readFileSync(storagePath);
}
