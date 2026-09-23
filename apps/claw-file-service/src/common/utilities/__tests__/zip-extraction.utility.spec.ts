// Slice C backend 2 — ZIP extraction utility unit tests.
//
// Exercises validateAndExtractZip end-to-end against small in-memory archives
// built with JSZip. We write each fixture to a temp file (node-stream-zip
// requires a file path), run the utility, and assert on the result OR the
// BusinessException code that fired.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import JSZip from 'jszip';
import {
  prepareExtractionDir,
  removeExtractionDir,
  validateAndExtractZip,
} from '../zip-extraction.utility';
import { BusinessException } from '../../errors/business.exception';
import { ArchiveEntryStatus } from '../../enums/archive-entry-status.enum';
import type {
  ZipExtractionContext,
  ZipExtractionThresholds,
} from '../../../modules/files/types/zip-expansion.types';

const TEST_THRESHOLDS: ZipExtractionThresholds = {
  maxExtractedSizeMb: 50,
  maxEntryCount: 100,
  maxNestingDepth: 1,
  compressionRatioThreshold: 1000,
};

const MB = 1024 * 1024;

// A fresh root context per call: depth 1, the whole per-archive cap as budget.
const rootContext = (
  thresholds: ZipExtractionThresholds = TEST_THRESHOLDS,
): ZipExtractionContext => ({
  depth: 1,
  budget: { remainingBytes: thresholds.maxExtractedSizeMb * MB },
});

const writeZipToDisk = async (zip: JSZip, name: string): Promise<string> => {
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });
  const filePath = path.join(os.tmpdir(), `claw-zip-test-${Date.now()}-${name}.zip`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const writeRawZipToDisk = (buffer: Buffer, name: string): string => {
  const filePath = path.join(os.tmpdir(), `claw-zip-test-${Date.now()}-${name}.zip`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

const makeDestDir = (suffix: string): string => {
  const dir = path.join(
    os.tmpdir(),
    `claw-zip-extract-${Date.now()}-${Math.random().toString(36).slice(2)}-${suffix}`,
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const cleanup = (...targets: string[]): void => {
  for (const target of targets) {
    try {
      if (fs.existsSync(target)) {
        const stat = fs.statSync(target);
        if (stat.isDirectory()) {
          fs.rmSync(target, { recursive: true, force: true });
        } else {
          fs.unlinkSync(target);
        }
      }
    } catch {
      // Best-effort cleanup; test isolation already passed.
    }
  }
};

describe('validateAndExtractZip', () => {
  let createdPaths: string[] = [];

  afterEach(() => {
    cleanup(...createdPaths);
    createdPaths = [];
  });

  it('extracts a legitimate 3-file zip cleanly', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'Hello world');
    zip.file('data.json', JSON.stringify({ key: 'value' }));
    zip.file('notes.md', '# Markdown\nSome text.');
    const zipPath = await writeZipToDisk(zip, 'happy');
    const destDir = makeDestDir('happy');
    createdPaths.push(zipPath, destDir);

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries).toHaveLength(3);
    expect(result.totalExtractedBytes).toBeGreaterThan(0);
    const filenames = result.entries.map((e) => path.basename(e.path)).sort();
    expect(filenames).toEqual(['data.json', 'notes.md', 'readme.txt']);
    for (const entry of result.entries) {
      expect(fs.existsSync(entry.path)).toBe(true);
      expect(entry.sizeBytes).toBeGreaterThan(0);
    }
    const txtEntry = result.entries.find((e) => e.path.endsWith('readme.txt'));
    expect(txtEntry?.mimeType).toBe('text/plain');
    const jsonEntry = result.entries.find((e) => e.path.endsWith('data.json'));
    expect(jsonEntry?.mimeType).toBe('application/json');
    const mdEntry = result.entries.find((e) => e.path.endsWith('notes.md'));
    expect(mdEntry?.mimeType).toBe('text/markdown');
  });

  it('throws ZIP_BOMB_RATIO when an entry has a suspicious compression ratio', async () => {
    // Highly compressible: 200 KB of zeros deflates to a few bytes — ratio >> 1000:1.
    const zip = new JSZip();
    zip.file('bomb.bin', Buffer.alloc(200 * 1024, 0));
    const zipPath = await writeZipToDisk(zip, 'bomb');
    const destDir = makeDestDir('bomb');
    createdPaths.push(zipPath, destDir);

    const thresholds: ZipExtractionThresholds = {
      ...TEST_THRESHOLDS,
      compressionRatioThreshold: 100,
    };

    try {
      await validateAndExtractZip(zipPath, destDir, thresholds, rootContext(thresholds));
      throw new Error('Expected ZIP_BOMB_RATIO to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_BOMB_RATIO');
    }
  });

  it('throws ZIP_TOO_MANY_ENTRIES when entryCount exceeds maxEntryCount', async () => {
    const zip = new JSZip();
    for (let i = 0; i < 25; i += 1) {
      zip.file(`f-${String(i)}.txt`, `content ${String(i)}`);
    }
    const zipPath = await writeZipToDisk(zip, 'count');
    const destDir = makeDestDir('count');
    createdPaths.push(zipPath, destDir);

    const thresholds: ZipExtractionThresholds = {
      ...TEST_THRESHOLDS,
      maxEntryCount: 10,
    };

    try {
      await validateAndExtractZip(zipPath, destDir, thresholds, rootContext(thresholds));
      throw new Error('Expected ZIP_TOO_MANY_ENTRIES to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_TOO_MANY_ENTRIES');
    }
  });

  it('skips (does not fail on) a nested archive at the depth limit and extracts the rest', async () => {
    const inner = new JSZip();
    inner.file('inside.txt', 'inner payload');
    const innerBuffer = await inner.generateAsync({ type: 'nodebuffer' });

    const outer = new JSZip();
    outer.file('child.zip', innerBuffer);
    outer.file('peer.txt', 'sibling text');
    const zipPath = await writeZipToDisk(outer, 'nested');
    const destDir = makeDestDir('nested');
    createdPaths.push(zipPath, destDir);

    // maxNestingDepth 1 and depth 1: this archive is AT the limit.
    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries.map((e) => e.archivePath)).toEqual(['peer.txt']);
    expect(result.skippedEntries).toEqual([
      expect.objectContaining({
        archivePath: 'child.zip',
        status: ArchiveEntryStatus.SKIPPED_NESTING_DEPTH,
      }),
    ]);
    expect(fs.existsSync(path.join(destDir, 'child.zip'))).toBe(false);
  });

  it('extracts a nested archive while depth is below ZIP_MAX_NESTING_DEPTH', async () => {
    const inner = new JSZip();
    inner.file('inside.txt', 'inner payload');
    const innerBuffer = await inner.generateAsync({ type: 'nodebuffer' });
    const outer = new JSZip();
    outer.file('child.zip', innerBuffer);
    const zipPath = await writeZipToDisk(outer, 'nested-ok');
    const destDir = makeDestDir('nested-ok');
    const destDirAtLimit = makeDestDir('nested-3');
    createdPaths.push(zipPath, destDir, destDirAtLimit);
    const thresholds = { ...TEST_THRESHOLDS, maxNestingDepth: 3 };

    const atTwo = await validateAndExtractZip(zipPath, destDir, thresholds, {
      depth: 2,
      budget: { remainingBytes: 50 * MB },
    });
    expect(atTwo.entries.map((e) => e.archivePath)).toEqual(['child.zip']);

    const atThree = await validateAndExtractZip(zipPath, destDirAtLimit, thresholds, {
      depth: 3,
      budget: { remainingBytes: 50 * MB },
    });
    expect(atThree.entries).toHaveLength(0);
    expect(atThree.skippedEntries[0]?.status).toBe(ArchiveEntryStatus.SKIPPED_NESTING_DEPTH);
  });

  it('keeps the folder path of each entry as archivePath', async () => {
    const zip = new JSZip();
    zip.file('src/index.ts', 'export {};');
    zip.file('test/index.ts', 'it();');
    const zipPath = await writeZipToDisk(zip, 'paths');
    const destDir = makeDestDir('paths');
    createdPaths.push(zipPath, destDir);

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries.map((e) => e.archivePath).sort()).toEqual([
      'src/index.ts',
      'test/index.ts',
    ]);
    expect(result.fileEntryCount).toBe(2);
  });

  it('spends the shared budget and throws ZIP_CUMULATIVE_SIZE_EXCEEDED once it runs out', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'a'.repeat(600));
    zip.file('b.txt', 'b'.repeat(600));
    const zipPath = await writeZipToDisk(zip, 'budget');
    const firstDir = makeDestDir('budget-1');
    const secondDir = makeDestDir('budget-2');
    createdPaths.push(zipPath, firstDir, secondDir);

    // Enough budget for the first archive: it is spent, not just checked.
    const budget = { remainingBytes: 2_000 };
    const first = await validateAndExtractZip(zipPath, firstDir, TEST_THRESHOLDS, {
      depth: 2,
      budget,
    });
    expect(first.totalExtractedBytes).toBe(1_200);
    expect(budget.remainingBytes).toBe(800);

    // An archive at another level shares what is left: 1,200 > 800.
    try {
      await validateAndExtractZip(zipPath, secondDir, TEST_THRESHOLDS, { depth: 3, budget });
      throw new Error('Expected ZIP_CUMULATIVE_SIZE_EXCEEDED to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_CUMULATIVE_SIZE_EXCEEDED');
    }
    expect(fs.readdirSync(secondDir)).toEqual([]);
  });

  it('rejects on the declared total before writing anything (per-archive cap keeps ZIP_BOMB_RATIO)', async () => {
    const zip = new JSZip();
    // Random bytes do not compress, so the ratio check cannot be what fires.
    zip.file('big.bin', crypto.randomBytes(3 * MB));
    const zipPath = await writeZipToDisk(zip, 'declared');
    const destDir = makeDestDir('declared');
    createdPaths.push(zipPath, destDir);
    const thresholds = { ...TEST_THRESHOLDS, maxExtractedSizeMb: 1 };

    try {
      await validateAndExtractZip(zipPath, destDir, thresholds, rootContext(thresholds));
      throw new Error('Expected ZIP_BOMB_RATIO to be thrown');
    } catch (error: unknown) {
      expect((error as BusinessException).code).toBe('ZIP_BOMB_RATIO');
    }
    expect(fs.existsSync(path.join(destDir, 'big.bin'))).toBe(false);
  });

  it('skips encrypted entries up front and extracts the rest', async () => {
    const zipPath = writeRawZipToDisk(
      buildStoredZip([
        { name: 'open.txt', data: Buffer.from('plain text') },
        { name: 'secret.txt', data: Buffer.from('ciphertext'), encrypted: true },
      ]),
      'encrypted-partial',
    );
    const destDir = makeDestDir('encrypted-partial');
    createdPaths.push(zipPath, destDir);

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries.map((e) => e.archivePath)).toEqual(['open.txt']);
    expect(fs.readFileSync(result.entries[0]?.path ?? '', 'utf8')).toBe('plain text');
    expect(result.skippedEntries).toEqual([
      { archivePath: 'secret.txt', sizeBytes: 10, status: ArchiveEntryStatus.SKIPPED_ENCRYPTED },
    ]);
    expect(result.encryptedEntryCount).toBe(1);
    expect(result.fileEntryCount).toBe(2);
  });

  it('skips a Unix symlink or device entry, reading its type from the external attributes', async () => {
    const zip = new JSZip();
    zip.file('real.txt', 'real content');
    zip.file('passwd', '/etc/passwd', { unixPermissions: 0o120_777 });
    zip.file('tty', '', { unixPermissions: 0o020_644 });
    zip.file('script.sh', 'echo ok', { unixPermissions: 0o100_755 });
    const buffer = await zip.generateAsync({ type: 'nodebuffer', platform: 'UNIX' });
    const zipPath = writeRawZipToDisk(buffer, 'unix-links');
    const destDir = makeDestDir('unix-links');
    createdPaths.push(zipPath, destDir);

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries.map((e) => e.archivePath).sort()).toEqual(['real.txt', 'script.sh']);
    expect(result.skippedEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ archivePath: 'passwd', status: ArchiveEntryStatus.SKIPPED_LINK }),
        expect.objectContaining({
          archivePath: 'tty',
          status: ArchiveEntryStatus.SKIPPED_SPECIAL_FILE,
        }),
      ]),
    );
    expect(fs.existsSync(path.join(destDir, 'passwd'))).toBe(false);
  });

  it('reports an all-encrypted archive without throwing', async () => {
    const zipPath = writeRawZipToDisk(
      buildStoredZip([
        { name: 'a.txt', data: Buffer.from('aaa'), encrypted: true },
        { name: 'b.txt', data: Buffer.from('bbb'), encrypted: true },
      ]),
      'encrypted-all',
    );
    const destDir = makeDestDir('encrypted-all');
    createdPaths.push(zipPath, destDir);

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());

    expect(result.entries).toHaveLength(0);
    expect(result.encryptedEntryCount).toBe(2);
    expect(result.fileEntryCount).toBe(2);
  });

  it('skips an entry larger than a single upload may be, as skipped-too-large', async () => {
    // Declared 60 MB (above the 50 MB upload cap), stored as 100 KB, so the
    // ratio (~600:1) passes and only the per-entry cap can catch it.
    const zipPath = writeRawZipToDisk(
      buildStoredZip([
        { name: 'huge.log', data: Buffer.alloc(100 * 1024, 7), declaredSize: 60 * MB },
        { name: 'small.txt', data: Buffer.from('small') },
      ]),
      'too-large',
    );
    const destDir = makeDestDir('too-large');
    createdPaths.push(zipPath, destDir);
    const thresholds = { ...TEST_THRESHOLDS, maxExtractedSizeMb: 500 };

    const result = await validateAndExtractZip(
      zipPath,
      destDir,
      thresholds,
      rootContext(thresholds),
    );

    expect(result.entries.map((e) => e.archivePath)).toEqual(['small.txt']);
    expect(result.skippedEntries).toEqual([
      { archivePath: 'huge.log', sizeBytes: 60 * MB, status: ArchiveEntryStatus.SKIPPED_TOO_LARGE },
    ]);
  });

  it('removeExtractionDir deletes the staging dir and never throws', () => {
    const dir = prepareExtractionDir(os.tmpdir(), `claw-zip-rm-${String(Date.now())}`);
    fs.writeFileSync(path.join(dir, 'left.txt'), 'x');

    removeExtractionDir(dir);
    expect(fs.existsSync(dir)).toBe(false);
    expect(() => removeExtractionDir(dir)).not.toThrow();
  });

  it("throws ZIP_PATH_TRAVERSAL when an entry path contains '..'", async () => {
    // node-stream-zip's own validateName() blocks the canonical "../evil.txt"
    // shape, so to exercise OUR rejectUnsafePath we use a name that contains
    // ".." outside a path-segment boundary (e.g. "foo..bar.txt"). The utility
    // rejects any "..", which is wider than node-stream-zip's regex — this
    // verifies our defense-in-depth fires before any extraction happens.
    const filename = 'foo..bar.txt';
    const filenameBuffer = Buffer.from(filename, 'utf8');
    const dataBuffer = Buffer.from('evil', 'utf8');
    const crc32 = computeCrc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // method (stored)
    localHeader.writeUInt16LE(0, 10); // last mod time
    localHeader.writeUInt16LE(0, 12); // last mod date
    localHeader.writeUInt32LE(crc32, 14); // CRC-32
    localHeader.writeUInt32LE(dataBuffer.length, 18); // compressed size
    localHeader.writeUInt32LE(dataBuffer.length, 22); // uncompressed size
    localHeader.writeUInt16LE(filenameBuffer.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra length

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central dir signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // method
    centralHeader.writeUInt16LE(0, 12); // time
    centralHeader.writeUInt16LE(0, 14); // date
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(filenameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(0, 42); // local header offset

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    const localTotalSize = localHeader.length + filenameBuffer.length + dataBuffer.length;
    const centralTotalSize = centralHeader.length + filenameBuffer.length;
    eocd.writeUInt32LE(centralTotalSize, 12);
    eocd.writeUInt32LE(localTotalSize, 16);
    eocd.writeUInt16LE(0, 20);

    const zipBuffer = Buffer.concat([
      localHeader,
      filenameBuffer,
      dataBuffer,
      centralHeader,
      filenameBuffer,
      eocd,
    ]);
    const zipPath = writeRawZipToDisk(zipBuffer, 'traversal');
    const destDir = makeDestDir('traversal');
    createdPaths.push(zipPath, destDir);

    try {
      await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());
      throw new Error('Expected ZIP_PATH_TRAVERSAL to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_PATH_TRAVERSAL');
    }
  });

  it('rejects entries with a null byte in the path', async () => {
    // The same handcrafted-zip strategy works for null-byte names.
    const filename = 'safe\0name.txt';
    const filenameBuffer = Buffer.from(filename, 'utf8');
    const dataBuffer = Buffer.from('payload', 'utf8');
    const crc32 = computeCrc32(dataBuffer);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(filenameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(0, 42);

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    const localTotalSize = localHeader.length + filenameBuffer.length + dataBuffer.length;
    const centralTotalSize = centralHeader.length + filenameBuffer.length;
    eocd.writeUInt32LE(centralTotalSize, 12);
    eocd.writeUInt32LE(localTotalSize, 16);
    eocd.writeUInt16LE(0, 20);

    const zipBuffer = Buffer.concat([
      localHeader,
      filenameBuffer,
      dataBuffer,
      centralHeader,
      filenameBuffer,
      eocd,
    ]);
    const zipPath = writeRawZipToDisk(zipBuffer, 'nullbyte');
    const destDir = makeDestDir('nullbyte');
    createdPaths.push(zipPath, destDir);

    try {
      await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS, rootContext());
      throw new Error('Expected ZIP_PATH_TRAVERSAL to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_PATH_TRAVERSAL');
    }
  });
});

// ---- Stored-method zip builder ----------------------------------------------
// JSZip cannot write encrypted entries or lie about sizes, so these fixtures are
// assembled by hand. Bit 0 of the general-purpose flags marks an entry
// encrypted; node-stream-zip reads it from the central directory.

type RawEntry = { name: string; data: Buffer; encrypted?: boolean; declaredSize?: number };

function buildStoredZip(entries: RawEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const crc = computeCrc32(entry.data);
    const flags = entry.encrypted === true ? 1 : 0;
    const size = entry.declaredSize ?? entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    locals.push(local, nameBuffer, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuffer);

    offset += local.length + nameBuffer.length + entry.data.length;
  }
  const centralSize = centrals.reduce((sum, b) => sum + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

// ---- CRC-32 helper (zip spec) ---------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = new Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function computeCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    const byte = buf[i] ?? 0;
    const tableEntry = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
    crc = tableEntry ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
