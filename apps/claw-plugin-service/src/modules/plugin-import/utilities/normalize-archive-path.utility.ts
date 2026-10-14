import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { DRIVE_PREFIX, IMPORT_LIMITS } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import { containsControlOrInvisible } from './character-classes.utility';

function unsafe(reason: string): never {
  throw new PluginImportError(ImportErrorCode.PATH_UNSAFE, `unsafe archive path: ${reason}`);
}

/**
 * One archive entry name to a safe relative path, or a refusal. Nothing is ever joined to a disk path
 * (entries stay in memory), but the rules are the ones that make an extraction safe anyway:
 * no absolute path, no drive letter, no backslash, no `..`, no empty or `.` segment, no control or
 * bidi-override characters, bounded length and depth. A trailing slash (a directory) is stripped.
 */
export function normalizeArchivePath(raw: string): string {
  const name = raw.normalize('NFC');
  if (name.length === 0 || name.length > IMPORT_LIMITS.maxPathLength) unsafe('length');
  if (containsControlOrInvisible(name)) unsafe('control character');
  if (name.includes('\\')) unsafe('backslash');
  if (name.startsWith('/') || DRIVE_PREFIX.test(name)) unsafe('absolute path');
  const trimmed = name.endsWith('/') ? name.slice(0, -1) : name;
  const segments = trimmed.split('/');
  for (const segment of segments) {
    if (segment === '' || segment === '.' || segment === '..') unsafe('traversal segment');
  }
  if (segments.length > IMPORT_LIMITS.maxPathDepth) {
    throw new PluginImportError(ImportErrorCode.PATH_TOO_DEEP, 'path too deep');
  }
  return trimmed;
}

/** A component path declared inside a manifest: same rules, relative to the plugin root, `./` allowed. */
export function normalizeManifestPath(raw: string): string {
  return normalizeArchivePath(raw.startsWith('./') ? raw.slice(2) : raw);
}
