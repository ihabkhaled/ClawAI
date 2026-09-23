import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors';
import { FilesRepository } from '../repositories/files.repository';
import { ARCHIVE_ENTRY_LISTING_MAX } from '../constants/archive-entries.constants';
import { type ArchiveEntryListing } from '../types/archive-entries.types';
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

  constructor(private readonly filesRepository: FilesRepository) {}

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
}
