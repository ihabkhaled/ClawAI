import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { FilesRepository } from '../repositories/files.repository';
import { ARCHIVE_ENTRY_LISTING_MAX } from '../constants/archive-entries.constants';
import {
  ARCHIVE_ENCRYPTED_ERROR_CODE,
  ARCHIVE_NOT_ENCRYPTED_ERROR_CODE,
  ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED_ERROR_CODE,
  ARCHIVE_PASSWORD_MAX_ATTEMPTS,
} from '../constants/zip-expansion.constants';
import { ZipExpansionManager } from '../managers/zip-expansion.manager';
import { type ArchiveEntryListing } from '../types/archive-entries.types';
import { type ArchiveExtractionMetadata } from '../types/zip-expansion.types';
import {
  hasManifestTree,
  isArchiveErrorMessage,
  mergeArchiveEntries,
  parseManifestTree,
} from '../utilities/archive-entry-listing.utility';

/**
 * The contents of one uploaded archive, entry by entry, for the file list, the
 * composer's attachment picker and message attachments.
 *
 * Read-only: it reports what expansion decided (see ZipExpansionManager) and
 * never re-derives a status.
 */
@Injectable()
export class ArchiveEntriesService {
  private readonly logger = new Logger(ArchiveEntriesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly zipExpansionManager: ZipExpansionManager,
  ) {}

  async getArchiveEntries(id: string, userId: string): Promise<ArchiveEntryListing> {
    const parent = await this.filesRepository.findArchiveParent(id);
    // Someone else's file is "not found", not "forbidden": a 403 would confirm
    // the id exists.
    if (parent?.userId !== userId) {
      throw new EntityNotFoundException('File', id);
    }

    const [children, totalChildCount] = await Promise.all([
      this.filesRepository.findArchiveChildren(id, ARCHIVE_ENTRY_LISTING_MAX),
      this.filesRepository.countArchiveChildren(id),
    ]);
    const grandchildCounts = await this.filesRepository.countChildrenByParent(
      children.map((child) => child.id),
    );
    const merged = mergeArchiveEntries({
      tree: parseManifestTree(parent.extractedText),
      children,
      totalChildCount,
      grandchildCounts,
      maxEntries: ARCHIVE_ENTRY_LISTING_MAX,
    });

    this.logger.debug(
      `getArchiveEntries: file=${id} entries=${String(merged.entries.length)} unlisted=${String(merged.unlistedEntryCount)}`,
    );
    return {
      archiveFileId: parent.id,
      filename: parent.filename,
      ingestionStatus: parent.ingestionStatus,
      extractionError: parent.extractionError,
      isArchive:
        totalChildCount > 0 ||
        hasManifestTree(parent.extractedText) ||
        isArchiveErrorMessage(parent.extractionError),
      entries: merged.entries,
      unlistedEntryCount: merged.unlistedEntryCount,
    };
  }

  /**
   * Batch A3 — the password a user typed in chat for an archive that failed
   * with ARCHIVE_ENCRYPTED. Re-runs extraction with it and returns the fresh
   * listing: COMPLETED on a right password, FAILED with ARCHIVE_ENCRYPTED
   * again (one attempt spent) on a wrong one.
   *
   * The password itself never leaves this call: it is handed to
   * `ZipExpansionManager.expandArchive`, which passes it to the 7-Zip engine
   * as an argument only. Nothing here logs it, stores it, or puts it in an
   * error message or event payload.
   */
  async submitPassword(id: string, userId: string, password: string): Promise<ArchiveEntryListing> {
    const file = await this.filesRepository.findForPasswordRetry(id);
    if (file === null || file.userId !== userId) {
      // Someone else's file is "not found", not "forbidden" — see getArchiveEntries.
      throw new EntityNotFoundException('File', id);
    }
    if (!file.extractionError?.startsWith(`${ARCHIVE_ENCRYPTED_ERROR_CODE}:`)) {
      throw new BusinessException(
        'This file is not an archive waiting for a password',
        ARCHIVE_NOT_ENCRYPTED_ERROR_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = file.extractionMetadata as ArchiveExtractionMetadata | null;
    const priorAttempts = metadata?.passwordAttempts ?? 0;
    if (priorAttempts >= ARCHIVE_PASSWORD_MAX_ATTEMPTS) {
      this.logger.warn(`submitPassword: file=${id} attempts exhausted at ${String(priorAttempts)}`);
      throw new BusinessException(
        `Too many wrong passwords for this archive (limit ${String(ARCHIVE_PASSWORD_MAX_ATTEMPTS)})`,
        ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED_ERROR_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.zipExpansionManager.expandArchive(file, undefined, password, priorAttempts + 1);
    return this.getArchiveEntries(id, userId);
  }
}
