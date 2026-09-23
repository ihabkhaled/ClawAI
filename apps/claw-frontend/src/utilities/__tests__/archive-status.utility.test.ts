import { describe, expect, it } from 'vitest';

import { FileIngestionStatus } from '@/enums';
import { ArchiveEntryDisplayStatus } from '@/enums/archive-entry-display-status.enum';
import { ArchiveEntryStatus } from '@/enums/archive-entry-status.enum';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import type { UploadedFile } from '@/types/file.types';
import {
  getArchiveDisplayStatus,
  getArchiveFileCount,
  getArchiveRejection,
  isArchiveEntrySelectable,
  isArchiveFile,
  isArchiveListingPending,
  parseArchiveErrorCode,
} from '@/utilities/archive-status.utility';

describe('getArchiveDisplayStatus', () => {
  it('maps every known backend status to one of the eight display buckets', () => {
    expect(getArchiveDisplayStatus(ArchiveEntryStatus.Included)).toBe(
      ArchiveEntryDisplayStatus.Extracted,
    );
    expect(getArchiveDisplayStatus(ArchiveEntryStatus.IncludedTruncated)).toBe(
      ArchiveEntryDisplayStatus.Partial,
    );
    expect(getArchiveDisplayStatus(ArchiveEntryStatus.SkippedEncrypted)).toBe(
      ArchiveEntryDisplayStatus.Encrypted,
    );
    expect(getArchiveDisplayStatus(ArchiveEntryStatus.SkippedLink)).toBe(
      ArchiveEntryDisplayStatus.Blocked,
    );
  });

  it('falls a status this build does not know to Unsupported, not a raw string', () => {
    expect(getArchiveDisplayStatus('skipped-something-new-from-a2')).toBe(
      ArchiveEntryDisplayStatus.Unsupported,
    );
  });
});

describe('parseArchiveErrorCode', () => {
  it('reads the CODE prefix off an extractionError', () => {
    expect(parseArchiveErrorCode('ZIP_PATH_TRAVERSAL: ../etc/passwd')).toBe('ZIP_PATH_TRAVERSAL');
    expect(parseArchiveErrorCode('ARCHIVE_UNSUPPORTED_FORMAT: not an archive')).toBe(
      'ARCHIVE_UNSUPPORTED_FORMAT',
    );
  });

  it('returns null for a non-archive error and for no error at all', () => {
    expect(parseArchiveErrorCode('PDF parse failed')).toBeNull();
    expect(parseArchiveErrorCode(null)).toBeNull();
    expect(parseArchiveErrorCode(undefined)).toBeNull();
  });
});

describe('getArchiveRejection', () => {
  it('reports a known code by its mapped reason', () => {
    const rejection = getArchiveRejection(
      'ZIP_BOMB_RATIO: compression ratio too high',
      FileIngestionStatus.FAILED,
    );
    expect(rejection).toEqual({
      reason: ArchiveRejectionReason.Bomb,
      isFatal: true,
      code: 'ZIP_BOMB_RATIO',
    });
  });

  it('falls an unknown code back to a keyword match, then to Generic', () => {
    expect(
      getArchiveRejection('ARCHIVE_FOO_TRAVERSAL_BAR: x', FileIngestionStatus.FAILED)?.reason,
    ).toBe(ArchiveRejectionReason.Traversal);
    expect(getArchiveRejection('ARCHIVE_TOTALLY_NEW: x', FileIngestionStatus.FAILED)?.reason).toBe(
      ArchiveRejectionReason.Generic,
    );
  });

  it('downgrades ARCHIVE_ENCRYPTED to a partial-skip reason on a row that still completed', () => {
    const rejection = getArchiveRejection(
      'ARCHIVE_ENCRYPTED: 1 of 3 files are password-protected and were skipped',
      FileIngestionStatus.COMPLETED,
    );
    expect(rejection).toEqual({
      reason: ArchiveRejectionReason.PartlyEncrypted,
      isFatal: false,
      code: 'ARCHIVE_ENCRYPTED',
    });
  });

  it('is null for a file with no archive error', () => {
    expect(getArchiveRejection(null, FileIngestionStatus.COMPLETED)).toBeNull();
    expect(getArchiveRejection('PDF parse failed', FileIngestionStatus.FAILED)).toBeNull();
  });
});

function file(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: 'f1',
    userId: 'u1',
    filename: 'a.zip',
    mimeType: 'application/zip',
    sizeBytes: 100,
    storagePath: '/x',
    ingestionStatus: FileIngestionStatus.COMPLETED,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('isArchiveFile', () => {
  it('is an archive by the parent/child relation, never by MIME type', () => {
    expect(isArchiveFile(file({ childCount: 3 }))).toBe(true);
    expect(isArchiveFile(file({ extractionMetadata: { fileEntryCount: 5 } }))).toBe(true);
    expect(
      isArchiveFile(
        file({ extractionError: 'ZIP_BOMB_RATIO: x', ingestionStatus: FileIngestionStatus.FAILED }),
      ),
    ).toBe(true);
  });

  it('is not an archive for a plain uploaded file, even one named .zip', () => {
    expect(
      isArchiveFile(file({ childCount: 0, extractionMetadata: null, extractionError: null })),
    ).toBe(false);
  });
});

describe('getArchiveFileCount / isArchiveEntrySelectable', () => {
  it('prefers the recorded total entry count over the extracted child count', () => {
    expect(
      getArchiveFileCount(file({ childCount: 2, extractionMetadata: { fileEntryCount: 9 } })),
    ).toBe(9);
    expect(getArchiveFileCount(file({ childCount: 2 }))).toBe(2);
  });

  it('only an entry that became a file is selectable', () => {
    expect(
      isArchiveEntrySelectable({
        archivePath: 'a.txt',
        sizeBytes: 1,
        status: 'included',
        detail: null,
        childFileId: 'c1',
        mimeType: 'text/plain',
        childCount: 0,
      }),
    ).toBe(true);
    expect(
      isArchiveEntrySelectable({
        archivePath: 'a.txt',
        sizeBytes: 1,
        status: 'skipped-encrypted',
        detail: null,
        childFileId: null,
        mimeType: null,
        childCount: 0,
      }),
    ).toBe(false);
  });
});

describe('isArchiveListingPending', () => {
  it('keeps polling while the archive row itself has not finished', () => {
    expect(
      isArchiveListingPending({
        archiveFileId: 'z1',
        filename: 'a.zip',
        ingestionStatus: FileIngestionStatus.PROCESSING,
        extractionError: null,
        isArchive: true,
        entries: [],
        unlistedEntryCount: 0,
      }),
    ).toBe(true);
  });

  it('keeps polling while any entry is still pending', () => {
    expect(
      isArchiveListingPending({
        archiveFileId: 'z1',
        filename: 'a.zip',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractionError: null,
        isArchive: true,
        entries: [
          {
            archivePath: 'a',
            sizeBytes: 1,
            status: 'pending',
            detail: null,
            childFileId: 'c1',
            mimeType: null,
            childCount: 0,
          },
        ],
        unlistedEntryCount: 0,
      }),
    ).toBe(true);
  });

  it('stops once every entry has an outcome', () => {
    expect(
      isArchiveListingPending({
        archiveFileId: 'z1',
        filename: 'a.zip',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractionError: null,
        isArchive: true,
        entries: [
          {
            archivePath: 'a',
            sizeBytes: 1,
            status: 'included',
            detail: null,
            childFileId: 'c1',
            mimeType: null,
            childCount: 0,
          },
        ],
        unlistedEntryCount: 0,
      }),
    ).toBe(false);
    expect(isArchiveListingPending(undefined)).toBe(false);
  });
});
