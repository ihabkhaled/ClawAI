import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { IMPORT_LIMITS } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import {
  type ArchiveReadResult,
  type BundleFile,
  type KeepPredicate,
} from '../types/plugin-import.types';
import { normalizeArchivePath } from './normalize-archive-path.utility';

/**
 * The bookkeeping both readers share: entry count, duplicate names (compared case-insensitively, so
 * `A.md` and `a.md` cannot both exist), per-entry and total size, and the keep decision.
 */
export class ArchiveEntryRegistry {
  private readonly seen = new Set<string>();
  private entries = 0;
  private total = 0;
  private skipped = 0;
  private readonly kept: BundleFile[] = [];

  constructor(private readonly keep: KeepPredicate) {}

  /** Counts one raw entry (file, directory or anything else) against the entry cap. */
  countEntry(): void {
    this.entries += 1;
    if (this.entries > IMPORT_LIMITS.maxEntries) {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES,
        'archive has too many entries',
      );
    }
  }

  /** Registers a file entry's name and size; returns its safe path and whether its bytes are wanted. */
  registerFile(rawName: string, declaredBytes: number): { path: string; wanted: boolean } {
    const path = normalizeArchivePath(rawName);
    const key = path.toLowerCase();
    if (this.seen.has(key)) {
      throw new PluginImportError(ImportErrorCode.DUPLICATE_ENTRY, 'duplicate archive entry');
    }
    this.seen.add(key);
    if (declaredBytes > IMPORT_LIMITS.maxEntryBytes) {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_TOO_LARGE_UNPACKED,
        'an archive entry is too large',
      );
    }
    this.total += declaredBytes;
    if (this.total > IMPORT_LIMITS.maxUnpackedBytes) {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_TOO_LARGE_UNPACKED,
        'archive is too large when unpacked',
      );
    }
    const wanted = this.keep(path) && declaredBytes <= IMPORT_LIMITS.maxStoredFileBytes;
    if (!wanted) this.skipped += 1;
    return { path, wanted };
  }

  addKept(file: BundleFile): void {
    this.kept.push(file);
  }

  result(): ArchiveReadResult {
    return {
      files: this.kept,
      fileCount: this.kept.length + this.skipped,
      skippedCount: this.skipped,
      totalBytes: this.total,
    };
  }
}
