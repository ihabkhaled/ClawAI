// Batch A2 — every non-ZIP format through the real 7-Zip (WASM) engine.
//
// Each archive is built in the test (see __fixtures__/archive-fixtures.ts),
// written to a temp file, and opened by validateAndExtractArchive exactly as
// ZipExpansionManager opens an upload. Nothing about the engine is mocked.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import JSZip from 'jszip';
import { validateAndExtractArchive } from '../archive-extraction.utility';
import { BusinessException } from '../../errors/business.exception';
import { ArchiveEntryStatus } from '../../enums/archive-entry-status.enum';
import {
  buildRar4,
  buildRar5,
  buildTar,
  buildWithSevenZip,
  writeTempArchive,
} from './__fixtures__/archive-fixtures';
import type {
  ZipExtractionContext,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../../modules/files/types/zip-expansion.types';

const MB = 1024 * 1024;

const THRESHOLDS: ZipExtractionThresholds = {
  maxExtractedSizeMb: 50,
  maxEntryCount: 100,
  maxNestingDepth: 3,
  compressionRatioThreshold: 1000,
};

const rootContext = (thresholds: ZipExtractionThresholds = THRESHOLDS): ZipExtractionContext => ({
  depth: 1,
  budget: { remainingBytes: thresholds.maxExtractedSizeMb * MB },
});

const TAR_ENTRIES = [
  { name: 'docs/', type: '5' },
  { name: 'docs/readme.md', data: '# Readme\nhello from tar' },
  { name: 'notes.txt', data: 'plain notes' },
];

describe('validateAndExtractArchive (7-Zip engine)', () => {
  const created: string[] = [];

  const destDir = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-archive-dest-'));
    created.push(dir);
    return dir;
  };

  const open = async (
    bytes: Buffer,
    filename: string,
    thresholds: ZipExtractionThresholds = THRESHOLDS,
    context: ZipExtractionContext = rootContext(thresholds),
  ): Promise<{ result: ZipExtractionResult; dir: string }> => {
    const archivePath = writeTempArchive(bytes, filename);
    created.push(path.dirname(archivePath));
    const dir = destDir();
    const result = await validateAndExtractArchive(archivePath, dir, thresholds, context, {
      archiveFilename: filename,
    });
    return { result, dir };
  };

  const codeOf = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      return (error as BusinessException).code;
    }
    throw new Error('expected a BusinessException');
  };

  const textOf = (result: ZipExtractionResult, archivePath: string): string => {
    const entry = result.entries.find((candidate) => candidate.archivePath === archivePath);
    return entry === undefined ? '' : fs.readFileSync(entry.path, 'utf8');
  };

  afterEach(() => {
    for (const target of created.splice(0)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  });

  describe('each format extracts', () => {
    it('tar', async () => {
      const { result } = await open(buildTar(TAR_ENTRIES), 'bundle.tar');

      expect(result.entries.map((entry) => entry.archivePath).sort()).toEqual([
        'docs/readme.md',
        'notes.txt',
      ]);
      expect(textOf(result, 'docs/readme.md')).toContain('hello from tar');
      expect(result.entries.find((e) => e.archivePath === 'docs/readme.md')?.mimeType).toBe(
        'text/markdown',
      );
      expect(result.fileEntryCount).toBe(2);
    });

    it.each([
      [
        'tar.gz',
        'site.tar.gz',
        (tar: Buffer): Promise<Buffer> => Promise.resolve(zlib.gzipSync(tar)),
      ],
      ['tgz', 'site.tgz', (tar: Buffer): Promise<Buffer> => Promise.resolve(zlib.gzipSync(tar))],
      [
        'tar.bz2',
        'site.tar.bz2',
        (tar: Buffer): Promise<Buffer> => buildWithSevenZip('bzip2', { 'site.tar': tar }),
      ],
      [
        'tar.xz',
        'site.tar.xz',
        (tar: Buffer): Promise<Buffer> => buildWithSevenZip('xz', { 'site.tar': tar }),
      ],
    ])('%s: the stream is decompressed and its tar expanded', async (_label, filename, wrap) => {
      const { result } = await open(await wrap(buildTar(TAR_ENTRIES)), filename);

      expect(result.entries.map((entry) => entry.archivePath).sort()).toEqual([
        'docs/readme.md',
        'notes.txt',
      ]);
      expect(textOf(result, 'notes.txt')).toBe('plain notes');
    });

    it('7z', async () => {
      const bytes = await buildWithSevenZip('7z', {
        'src/index.ts': 'export const answer = 42;',
        'README.md': '# Seven',
      });

      const { result } = await open(bytes, 'project.7z');

      expect(result.entries.map((entry) => entry.archivePath).sort()).toEqual([
        'README.md',
        'src/index.ts',
      ]);
      expect(textOf(result, 'src/index.ts')).toBe('export const answer = 42;');
    });

    it.each([
      ['RAR4', buildRar4],
      ['RAR5', buildRar5],
    ])('%s', async (_label, build) => {
      const bytes = build([
        { name: 'hello.txt', data: 'hello rar' },
        { name: 'sub/data.csv', data: 'a,b\n1,2\n' },
      ]);

      const { result } = await open(bytes, 'bundle.rar');

      expect(textOf(result, 'hello.txt')).toBe('hello rar');
      expect(textOf(result, 'sub/data.csv')).toBe('a,b\n1,2\n');
    });

    it.each([
      [
        'gz',
        'report.csv.gz',
        (data: Buffer): Promise<Buffer> => Promise.resolve(zlib.gzipSync(data)),
      ],
      [
        'bz2',
        'report.csv.bz2',
        (data: Buffer): Promise<Buffer> => buildWithSevenZip('bzip2', { 'x.csv': data }),
      ],
      [
        'xz',
        'report.csv.xz',
        (data: Buffer): Promise<Buffer> => buildWithSevenZip('xz', { 'x.csv': data }),
      ],
    ])(
      'single-file %s yields one child named without the codec suffix',
      async (_label, filename, wrap) => {
        const { result } = await open(await wrap(Buffer.from('a,b\n1,2\n')), filename);

        expect(result.fileEntryCount).toBe(1);
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0]?.archivePath).toBe('report.csv');
        expect(result.entries[0]?.mimeType).toBe('text/csv');
        expect(textOf(result, 'report.csv')).toBe('a,b\n1,2\n');
        expect(result.totalExtractedBytes).toBe(8);
      },
    );

    it('names a .tgz that holds no tar after the archive, suffix swapped for .tar', async () => {
      const { result } = await open(zlib.gzipSync(Buffer.from('not a tar')), 'odd.tgz');

      expect(result.entries[0]?.archivePath).toBe('odd.tar');
    });
  });

  describe('entries that are never extracted', () => {
    it('rejects the whole archive for a traversal entry', async () => {
      const bytes = buildTar([
        { name: 'ok.txt', data: 'fine' },
        { name: '../evil.txt', data: 'escape' },
      ]);

      await expect(codeOf(open(bytes, 'evil.tar'))).resolves.toBe('ZIP_PATH_TRAVERSAL');
    });

    it('rejects an absolute entry path inside a .tar.gz', async () => {
      const bytes = buildTar([{ name: '/etc/cron.d/job', data: 'x' }]);

      await expect(codeOf(open(zlib.gzipSync(bytes), 'abs.tar.gz'))).resolves.toBe(
        'ZIP_PATH_TRAVERSAL',
      );
    });

    it('skips symlinks, hard links and device nodes, and delivers the rest', async () => {
      const bytes = buildTar([
        { name: 'real.txt', data: 'real content' },
        { name: 'passwd', type: '2', link: '/etc/passwd' },
        { name: 'hard', type: '1', link: 'real.txt' },
        { name: 'tty', type: '3' },
        { name: 'pipe', type: '6' },
      ]);

      const { result, dir } = await open(bytes, 'links.tar');

      expect(result.entries.map((entry) => entry.archivePath)).toEqual(['real.txt']);
      const statusOf = (name: string): ArchiveEntryStatus | undefined =>
        result.skippedEntries.find((entry) => entry.archivePath === name)?.status;
      expect(statusOf('passwd')).toBe(ArchiveEntryStatus.SKIPPED_LINK);
      expect(statusOf('hard')).toBe(ArchiveEntryStatus.SKIPPED_LINK);
      expect(statusOf('tty')).toBe(ArchiveEntryStatus.SKIPPED_SPECIAL_FILE);
      expect(statusOf('pipe')).toBe(ArchiveEntryStatus.SKIPPED_SPECIAL_FILE);
      // Nothing but the real file was written.
      expect(fs.readdirSync(dir)).toEqual(['real.txt']);
    });

    it('rejects a tar whose regular file shares its path with a symlink', async () => {
      // 7-Zip extracts by name, so the list file would select BOTH entries and
      // the file would be written through the link.
      const bytes = buildTar([
        { name: 'job', type: '2', link: '/etc/cron.d/job' },
        { name: 'job', data: '* * * * * root evil' },
      ]);

      await expect(codeOf(open(bytes, 'shadow.tar'))).resolves.toBe('ZIP_PATH_TRAVERSAL');
    });

    it('rejects a tar that stores a file beneath a symlinked directory', async () => {
      const bytes = buildTar([
        { name: 'escape', type: '2', link: '/' },
        { name: 'escape/tmp/owned.txt', data: 'written outside' },
      ]);

      await expect(codeOf(open(zlib.gzipSync(bytes), 'beneath.tgz'))).resolves.toBe(
        'ZIP_PATH_TRAVERSAL',
      );
    });

    it('skips a nested archive at the depth limit, by extension', async () => {
      const inner = zlib.gzipSync(buildTar(TAR_ENTRIES));
      const bytes = buildTar([
        { name: 'inner.tgz', data: inner },
        { name: 'top.txt', data: 'top' },
      ]);
      const thresholds = { ...THRESHOLDS, maxNestingDepth: 1 };

      const { result } = await open(bytes, 'outer.tar', thresholds);

      expect(result.entries.map((entry) => entry.archivePath)).toEqual(['top.txt']);
      expect(result.skippedEntries).toEqual([
        {
          archivePath: 'inner.tgz',
          sizeBytes: inner.length,
          status: ArchiveEntryStatus.SKIPPED_NESTING_DEPTH,
        },
      ]);
    });
  });

  describe('bombs and caps', () => {
    it('rejects a 7z entry whose compression ratio exceeds the threshold', async () => {
      const bytes = await buildWithSevenZip('7z', { 'zeros.bin': Buffer.alloc(2 * MB) });

      await expect(
        codeOf(open(bytes, 'bomb.7z', { ...THRESHOLDS, compressionRatioThreshold: 50 })),
      ).resolves.toBe('ZIP_BOMB_RATIO');
    });

    it('stops a gzip stream at the ratio limit instead of inflating it', async () => {
      const bytes = zlib.gzipSync(Buffer.alloc(4 * MB));

      await expect(
        codeOf(open(bytes, 'zeros.gz', { ...THRESHOLDS, compressionRatioThreshold: 50 })),
      ).resolves.toBe('ZIP_BOMB_RATIO');
    });

    it('stops a stream at the size cap, and does not leave the payload behind', async () => {
      const bytes = zlib.gzipSync(Buffer.alloc(3 * MB, 0x61));
      const thresholds = {
        ...THRESHOLDS,
        maxExtractedSizeMb: 1,
        compressionRatioThreshold: 100_000,
      };

      const archivePath = writeTempArchive(bytes, 'big.gz');
      created.push(path.dirname(archivePath));
      const dir = destDir();
      await expect(
        codeOf(
          validateAndExtractArchive(archivePath, dir, thresholds, rootContext(thresholds), {
            archiveFilename: 'big.gz',
          }),
        ),
      ).resolves.toBe('ZIP_BOMB_RATIO');
      expect(fs.existsSync(`${dir}.payload`)).toBe(false);
    });

    it('rejects an archive declaring more than the cap before writing anything', async () => {
      const bytes = await buildWithSevenZip('7z', { 'big.txt': 'x'.repeat(2 * MB) });
      const thresholds = {
        ...THRESHOLDS,
        maxExtractedSizeMb: 1,
        compressionRatioThreshold: 100_000,
      };

      const archivePath = writeTempArchive(bytes, 'big.7z');
      created.push(path.dirname(archivePath));
      const dir = destDir();
      await expect(
        codeOf(
          validateAndExtractArchive(archivePath, dir, thresholds, rootContext(thresholds), {
            archiveFilename: 'big.7z',
          }),
        ),
      ).resolves.toBe('ZIP_BOMB_RATIO');
      expect(fs.readdirSync(dir)).toEqual([]);
    });

    it('rejects an archive with more entries than allowed', async () => {
      const bytes = buildTar(
        Array.from({ length: 6 }, (_unused, index) => ({
          name: `f${String(index)}.txt`,
          data: 'x',
        })),
      );

      await expect(
        codeOf(open(bytes, 'many.tar', { ...THRESHOLDS, maxEntryCount: 5 })),
      ).resolves.toBe('ZIP_TOO_MANY_ENTRIES');
    });

    it('charges every level of a nested expansion to the one shared budget', async () => {
      const context: ZipExtractionContext = { depth: 2, budget: { remainingBytes: 10 } };

      await expect(
        codeOf(
          open(
            buildTar([{ name: 'a.txt', data: 'more than ten bytes' }]),
            'n.tar',
            THRESHOLDS,
            context,
          ),
        ),
      ).resolves.toBe('ZIP_CUMULATIVE_SIZE_EXCEEDED');
    });
  });

  describe('encryption', () => {
    it('reports encrypted RAR entries as ARCHIVE_ENCRYPTED skips and delivers the rest', async () => {
      const bytes = buildRar4([
        { name: 'open.txt', data: 'readable' },
        { name: 'secret.txt', data: 'xxxxxxxx', encrypted: true },
      ]);

      const { result } = await open(bytes, 'mixed.rar');

      expect(textOf(result, 'open.txt')).toBe('readable');
      expect(result.encryptedEntryCount).toBe(1);
      expect(result.fileEntryCount).toBe(2);
      expect(result.skippedEntries).toEqual([
        { archivePath: 'secret.txt', sizeBytes: 8, status: ArchiveEntryStatus.SKIPPED_ENCRYPTED },
      ]);
    });

    it('counts every entry of a password-protected 7z as encrypted', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha', 'b.txt': 'beta' }, [
        '-pSECRET',
      ]);

      const { result } = await open(bytes, 'locked.7z');

      expect(result.entries).toEqual([]);
      expect(result.encryptedEntryCount).toBe(2);
      expect(result.fileEntryCount).toBe(2);
    });

    it('fails a 7z whose file list itself is encrypted with ARCHIVE_ENCRYPTED, without hanging on stdin', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' }, ['-pSECRET', '-mhe=on']);

      await expect(codeOf(open(bytes, 'headers.7z'))).resolves.toBe('ARCHIVE_ENCRYPTED');
    });

    it('opens a header-encrypted 7z when the right password is supplied (batch A3 contract)', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' }, ['-pSECRET', '-mhe=on']);
      const archivePath = writeTempArchive(bytes, 'headers.7z');
      created.push(path.dirname(archivePath));
      const dir = destDir();

      const result = await validateAndExtractArchive(archivePath, dir, THRESHOLDS, rootContext(), {
        archiveFilename: 'headers.7z',
        password: 'SECRET',
      });

      // The list is readable; the entries are still reported, not decrypted —
      // decrypting them is A3's work.
      expect(result.fileEntryCount).toBe(1);
      expect(result.encryptedEntryCount).toBe(1);
    });
  });

  describe('engine hygiene', () => {
    it('leaves process.exitCode untouched after a failing 7-Zip run', async () => {
      const before = process.exitCode;
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' }, ['-pSECRET', '-mhe=on']);

      await codeOf(open(bytes, 'headers.7z'));

      expect(process.exitCode).toBe(before);
    });

    it('refuses bytes that are no supported archive', async () => {
      await expect(codeOf(open(Buffer.from('just some text'), 'fake.7z'))).resolves.toBe(
        'ARCHIVE_UNSUPPORTED_FORMAT',
      );
    });

    it('fails a truncated 7z cleanly instead of crashing', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha '.repeat(200) });

      await expect(codeOf(open(bytes.subarray(0, 40), 'cut.7z'))).resolves.toBe(
        'ZIP_EXPANSION_FAILED',
      );
    });

    it('still opens a ZIP through node-stream-zip', async () => {
      const zip = new JSZip();
      zip.file('z.txt', 'zipped');
      const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

      const { result } = await open(bytes, 'plain.zip');

      expect(textOf(result, 'z.txt')).toBe('zipped');
    });
  });
});
