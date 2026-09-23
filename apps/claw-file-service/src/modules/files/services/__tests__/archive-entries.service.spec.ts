import { type Mock, vi } from 'vitest';
import { FileIngestionStatus } from '../../../../generated/prisma';
import { EntityNotFoundException } from '../../../../common/errors';
import { ArchiveEntriesService } from '../archive-entries.service';
import { ARCHIVE_ENTRY_LISTING_MAX } from '../../constants/archive-entries.constants';

type RepoMock = {
  findArchiveParent: Mock;
  findArchiveChildren: Mock;
  countArchiveChildren: Mock;
  countChildrenByParent: Mock;
};

const MANIFEST = [
  '<archive_manifest filename="p.zip">',
  'File tree (2 files, paths relative to the archive root):',
  '- docs/a.md (40 B) — included',
  '- locked.txt (10 B) — skipped-encrypted',
  '',
  '</archive_manifest>',
].join('\n');

const parent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'zip-1',
  userId: 'user-1',
  filename: 'p.zip',
  extractedText: MANIFEST,
  extractionError: null,
  ingestionStatus: FileIngestionStatus.COMPLETED,
  ...overrides,
});

describe('ArchiveEntriesService', () => {
  let repo: RepoMock;
  let service: ArchiveEntriesService;

  beforeEach(() => {
    repo = {
      findArchiveParent: vi.fn().mockResolvedValue(parent()),
      findArchiveChildren: vi.fn().mockResolvedValue([
        {
          id: 'c1',
          archivePath: 'docs/a.md',
          filename: 'a.md',
          sizeBytes: 40,
          mimeType: 'text/markdown',
          ingestionStatus: FileIngestionStatus.COMPLETED,
        },
      ]),
      countArchiveChildren: vi.fn().mockResolvedValue(1),
      countChildrenByParent: vi.fn().mockResolvedValue(new Map()),
    };
    service = new ArchiveEntriesService(repo as never);
  });

  it('lists extracted and skipped entries of an owned archive', async () => {
    const listing = await service.getArchiveEntries('zip-1', 'user-1');

    expect(repo.findArchiveChildren).toHaveBeenCalledWith('zip-1', ARCHIVE_ENTRY_LISTING_MAX);
    expect(repo.countChildrenByParent).toHaveBeenCalledWith(['c1']);
    expect(listing.isArchive).toBe(true);
    expect(
      listing.entries.map((entry) => [entry.archivePath, entry.status, entry.childFileId]),
    ).toEqual([
      ['docs/a.md', 'included', 'c1'],
      ['locked.txt', 'skipped-encrypted', null],
    ]);
    expect(listing.unlistedEntryCount).toBe(0);
  });

  it('answers 404, not 403, for a file owned by someone else', async () => {
    await expect(service.getArchiveEntries('zip-1', 'intruder')).rejects.toThrow(
      EntityNotFoundException,
    );
    expect(repo.findArchiveChildren).not.toHaveBeenCalled();
  });

  it('answers 404 for a file that does not exist', async () => {
    repo.findArchiveParent.mockResolvedValue(null);
    await expect(service.getArchiveEntries('nope', 'user-1')).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('marks an ordinary file as not an archive', async () => {
    repo.findArchiveParent.mockResolvedValue(parent({ extractedText: 'hello world' }));
    repo.findArchiveChildren.mockResolvedValue([]);
    repo.countArchiveChildren.mockResolvedValue(0);

    const listing = await service.getArchiveEntries('zip-1', 'user-1');

    expect(listing.isArchive).toBe(false);
    expect(listing.entries).toEqual([]);
  });

  it('still reports a rejected archive, which has no children and no manifest', async () => {
    repo.findArchiveParent.mockResolvedValue(
      parent({
        extractedText: null,
        extractionError: 'ZIP_BOMB_RATIO: compression ratio too high',
        ingestionStatus: FileIngestionStatus.FAILED,
      }),
    );
    repo.findArchiveChildren.mockResolvedValue([]);
    repo.countArchiveChildren.mockResolvedValue(0);

    const listing = await service.getArchiveEntries('zip-1', 'user-1');

    expect(listing.isArchive).toBe(true);
    expect(listing.extractionError).toBe('ZIP_BOMB_RATIO: compression ratio too high');
    expect(listing.ingestionStatus).toBe(FileIngestionStatus.FAILED);
  });
});
