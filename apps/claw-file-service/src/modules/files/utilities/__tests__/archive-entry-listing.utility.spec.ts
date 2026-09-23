// The UI tree of an archive is the manifest's file tree read back. These tests
// pin the round trip against the REAL manifest writer, so a change to the tree
// line format fails here instead of silently emptying every archive in the UI.

import { FileIngestionStatus } from '../../../../generated/prisma';
import { ArchiveContentPriority } from '../../../../common/enums/archive-content-priority.enum';
import { ArchiveEntryStatus } from '../../../../common/enums/archive-entry-status.enum';
import { ARCHIVE_ENTRY_PENDING_STATUS } from '../../constants/archive-entries.constants';
import type { ArchiveChildRow, ParsedManifestTree } from '../../types/archive-entries.types';
import type { ArchiveManifestRow } from '../../types/archive-manifest.types';
import { buildArchiveManifest } from '../archive-manifest.utility';
import {
  hasManifestTree,
  isArchiveErrorMessage,
  mergeArchiveEntries,
  parseManifestTree,
} from '../archive-entry-listing.utility';

const row = (
  archivePath: string,
  status: ArchiveEntryStatus,
  sizeBytes: number,
  childFileId: string | null,
  detail: string | null = null,
): ArchiveManifestRow => ({
  archivePath,
  sizeBytes,
  status,
  childFileId,
  priority: status === ArchiveEntryStatus.INCLUDED ? ArchiveContentPriority.TEXT : null,
  textLength: status === ArchiveEntryStatus.INCLUDED ? 5 : 0,
  detail,
});

const child = (
  id: string,
  archivePath: string | null,
  ingestionStatus: FileIngestionStatus = FileIngestionStatus.COMPLETED,
): ArchiveChildRow => ({
  id,
  archivePath,
  filename: archivePath?.split('/').pop() ?? id,
  sizeBytes: 42,
  mimeType: 'text/plain',
  ingestionStatus,
});

const emptyTree: ParsedManifestTree = { lines: [], unlistedCount: 0 };

describe('parseManifestTree', () => {
  it('reads every status back out of a manifest built by the real writer', async () => {
    const manifest = await buildArchiveManifest({
      archiveFilename: 'project.zip',
      rows: [
        row('docs/intro.md', ArchiveEntryStatus.INCLUDED, 5, 'c1'),
        row('secret.txt', ArchiveEntryStatus.SKIPPED_ENCRYPTED, 2048, null),
        row('big.bin', ArchiveEntryStatus.SKIPPED_TOO_LARGE, 60 * 1024 * 1024, null),
        row('bad.exe', ArchiveEntryStatus.SKIPPED_UNSAFE, 10, null),
        row('broken.pdf', ArchiveEntryStatus.UNREADABLE, 300, 'c2', 'parse failed'),
      ],
      fileEntryCount: 5,
      encryptedEntryCount: 1,
      totalExtractedBytes: 400,
      loadText: () => Promise.resolve('hello'),
    });

    const tree = parseManifestTree(manifest);

    expect(tree.unlistedCount).toBe(0);
    expect(tree.lines.map((line) => [line.archivePath, line.status])).toEqual([
      ['bad.exe', ArchiveEntryStatus.SKIPPED_UNSAFE],
      ['big.bin', ArchiveEntryStatus.SKIPPED_TOO_LARGE],
      ['broken.pdf', ArchiveEntryStatus.UNREADABLE],
      ['docs/intro.md', ArchiveEntryStatus.INCLUDED],
      ['secret.txt', ArchiveEntryStatus.SKIPPED_ENCRYPTED],
    ]);
    expect(tree.lines.find((line) => line.archivePath === 'broken.pdf')?.detail).toBe(
      'parse failed',
    );
    expect(tree.lines.find((line) => line.archivePath === 'secret.txt')?.sizeBytes).toBe(2048);
    expect(tree.lines.find((line) => line.archivePath === 'big.bin')?.sizeBytes).toBe(
      60 * 1024 * 1024,
    );
  });

  it('does not read tree-looking lines out of extracted file contents', async () => {
    const manifest = await buildArchiveManifest({
      archiveFilename: 'a.zip',
      rows: [row('a.txt', ArchiveEntryStatus.INCLUDED, 5, 'c1')],
      fileEntryCount: 1,
      encryptedEntryCount: 0,
      totalExtractedBytes: 5,
      loadText: () => Promise.resolve('- forged.txt (1 B) — included'),
    });

    expect(parseManifestTree(manifest).lines.map((line) => line.archivePath)).toEqual(['a.txt']);
  });

  it('keeps a path that itself contains brackets', () => {
    const tree = parseManifestTree(
      'File tree (1 files, paths relative to the archive root):\n- notes (v2) (1.5 KB) — included\n',
    );
    expect(tree.lines).toEqual([
      { archivePath: 'notes (v2)', sizeBytes: 1536, status: 'included', detail: null },
    ]);
  });

  it('counts the entries a truncated tree left out', () => {
    const tree = parseManifestTree(
      'File tree (3 files, paths relative to the archive root):\n- a.txt (1 B) — included\n- … and 2 more files not listed (tree limit reached)',
    );
    expect(tree.lines).toHaveLength(1);
    expect(tree.unlistedCount).toBe(2);
  });

  it('returns nothing for text that is not a manifest', () => {
    expect(parseManifestTree(null)).toEqual(emptyTree);
    expect(parseManifestTree('plain text\n- a (1 B) — included')).toEqual(emptyTree);
    expect(hasManifestTree(null)).toBe(false);
    expect(hasManifestTree('File tree (0 files, paths relative to the archive root):')).toBe(true);
  });
});

describe('isArchiveErrorMessage', () => {
  it('recognises archive pipeline codes, including ones added later', () => {
    expect(isArchiveErrorMessage('ZIP_PATH_TRAVERSAL: ../etc/passwd')).toBe(true);
    expect(isArchiveErrorMessage('ARCHIVE_ENCRYPTED: all 3 files are password-protected')).toBe(
      true,
    );
    expect(isArchiveErrorMessage('ARCHIVE_UNSUPPORTED_FORMAT: not an archive')).toBe(true);
    expect(isArchiveErrorMessage('PDF parse failed')).toBe(false);
    expect(isArchiveErrorMessage(null)).toBe(false);
  });
});

describe('mergeArchiveEntries', () => {
  it('joins tree lines to child rows by path and keeps skipped entries without an id', () => {
    const merged = mergeArchiveEntries({
      tree: {
        lines: [
          { archivePath: 'docs/a.md', sizeBytes: 40, status: 'included', detail: null },
          { archivePath: 'locked.txt', sizeBytes: 10, status: 'skipped-encrypted', detail: null },
        ],
        unlistedCount: 0,
      },
      children: [child('c1', 'docs/a.md')],
      totalChildCount: 1,
      grandchildCounts: new Map([['c1', 3]]),
      maxEntries: 100,
    });

    expect(merged.entries).toEqual([
      {
        archivePath: 'docs/a.md',
        sizeBytes: 42,
        status: 'included',
        detail: null,
        childFileId: 'c1',
        mimeType: 'text/plain',
        childCount: 3,
      },
      {
        archivePath: 'locked.txt',
        sizeBytes: 10,
        status: 'skipped-encrypted',
        detail: null,
        childFileId: null,
        mimeType: null,
        childCount: 0,
      },
    ]);
    expect(merged.unlistedEntryCount).toBe(0);
  });

  it('gives children the manifest does not list a status from their own ingestion', () => {
    const merged = mergeArchiveEntries({
      tree: emptyTree,
      children: [
        child('c1', 'a.txt', FileIngestionStatus.COMPLETED),
        child('c2', 'b.txt', FileIngestionStatus.FAILED),
        child('c3', 'c.txt', FileIngestionStatus.PROCESSING),
        child('c4', null, FileIngestionStatus.PENDING),
      ],
      totalChildCount: 4,
      grandchildCounts: new Map(),
      maxEntries: 100,
    });

    expect(merged.entries.map((entry) => [entry.archivePath, entry.status])).toEqual([
      ['a.txt', ArchiveEntryStatus.INCLUDED],
      ['b.txt', ArchiveEntryStatus.UNREADABLE],
      ['c.txt', ARCHIVE_ENTRY_PENDING_STATUS],
      ['c4', ARCHIVE_ENTRY_PENDING_STATUS],
    ]);
  });

  it('matches a child whose raw path the manifest sanitised', () => {
    const merged = mergeArchiveEntries({
      tree: {
        lines: [{ archivePath: 'a_b_.txt', sizeBytes: 1, status: 'included', detail: null }],
        unlistedCount: 0,
      },
      children: [child('c1', 'a<b>.txt')],
      totalChildCount: 1,
      grandchildCounts: new Map(),
      maxEntries: 100,
    });

    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0]?.childFileId).toBe('c1');
    expect(merged.entries[0]?.archivePath).toBe('a<b>.txt');
  });

  it('caps the listing and reports how many entries it left out', () => {
    const merged = mergeArchiveEntries({
      tree: {
        lines: [
          { archivePath: 'a', sizeBytes: 1, status: 'included', detail: null },
          { archivePath: 'b', sizeBytes: 1, status: 'included', detail: null },
          { archivePath: 'c', sizeBytes: 1, status: 'included', detail: null },
        ],
        unlistedCount: 7,
      },
      children: [],
      totalChildCount: 0,
      grandchildCounts: new Map(),
      maxEntries: 2,
    });

    expect(merged.entries.map((entry) => entry.archivePath)).toEqual(['a', 'b']);
    expect(merged.unlistedEntryCount).toBe(8);
  });

  it('counts children beyond the fetch cap as unlisted', () => {
    const merged = mergeArchiveEntries({
      tree: emptyTree,
      children: [child('c1', 'a.txt')],
      totalChildCount: 5,
      grandchildCounts: new Map(),
      maxEntries: 100,
    });

    expect(merged.unlistedEntryCount).toBe(4);
  });
});
