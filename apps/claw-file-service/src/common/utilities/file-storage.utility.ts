import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import { AppConfig } from '../../app/config/app.config';

const logger = new Logger('FileStorageUtility');

function sanitizeFilename(filename: string): string {
  logger.debug(`sanitizeFilename: sanitizing "${filename}"`);
  const basename = path.basename(filename);
  const sanitized = basename.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  logger.debug(`sanitizeFilename: result="${sanitized}"`);
  return sanitized;
}

function ensureWithinStorageRoot(resolvedPath: string, storageRoot: string): void {
  logger.debug(`ensureWithinStorageRoot: checking path safety`);
  const normalizedRoot = path.resolve(storageRoot);
  const normalizedPath = path.resolve(resolvedPath);
  if (!normalizedPath.startsWith(normalizedRoot + path.sep) && normalizedPath !== normalizedRoot) {
    logger.error('ensureWithinStorageRoot: path traversal detected');
    throw new Error('Path traversal detected: resolved path is outside storage root');
  }
  logger.debug('ensureWithinStorageRoot: path is safe');
}

export function saveFile(filename: string, content: Buffer): string {
  logger.log(`saveFile: saving file "${filename}" (${String(content.length)} bytes)`);
  const config = AppConfig.get();
  const safeFilename = sanitizeFilename(filename);
  const storagePath = path.join(config.FILE_STORAGE_PATH, safeFilename);

  logger.debug(`saveFile: resolved storagePath="${storagePath}"`);
  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  const dir = path.dirname(storagePath);
  if (!fs.existsSync(dir)) {
    logger.debug(`saveFile: creating directory "${dir}"`);
    fs.mkdirSync(dir, { recursive: true });
  }

  logger.debug('saveFile: writing file to disk');
  fs.writeFileSync(storagePath, content);
  logger.log(`saveFile: file saved successfully at "${storagePath}"`);
  return storagePath;
}

export function deleteFile(storagePath: string): void {
  logger.log(`deleteFile: deleting file at "${storagePath}"`);
  const config = AppConfig.get();
  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  if (fs.existsSync(storagePath)) {
    logger.debug('deleteFile: file exists, unlinking');
    fs.unlinkSync(storagePath);
    logger.log('deleteFile: file deleted successfully');
  } else {
    logger.debug('deleteFile: file does not exist, skipping');
  }
}

export function readFile(storagePath: string): Buffer {
  logger.log(`readFile: reading file at "${storagePath}"`);
  const config = AppConfig.get();
  ensureWithinStorageRoot(storagePath, config.FILE_STORAGE_PATH);

  logger.debug('readFile: reading file from disk');
  const content = fs.readFileSync(storagePath);
  logger.log(`readFile: read ${String(content.length)} bytes`);
  return content;
}
