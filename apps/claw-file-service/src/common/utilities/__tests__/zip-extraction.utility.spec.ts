// Slice C backend 2 — ZIP extraction utility unit tests.
//
// Exercises validateAndExtractZip end-to-end against small in-memory archives
// built with JSZip. We write each fixture to a temp file (node-stream-zip
// requires a file path), run the utility, and assert on the result OR the
// BusinessException code that fired.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import JSZip from 'jszip';
import { validateAndExtractZip } from '../zip-extraction.utility';
import { BusinessException } from '../../errors/business.exception';
import type { ZipExtractionThresholds } from '../../../modules/files/types/zip-expansion.types';

const TEST_THRESHOLDS: ZipExtractionThresholds = {
  maxExtractedSizeMb: 50,
  maxEntryCount: 100,
  maxNestingDepth: 1,
  compressionRatioThreshold: 1000,
};

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

    const result = await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS);

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
      await validateAndExtractZip(zipPath, destDir, thresholds);
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
      await validateAndExtractZip(zipPath, destDir, thresholds);
      throw new Error('Expected ZIP_TOO_MANY_ENTRIES to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_TOO_MANY_ENTRIES');
    }
  });

  it('throws ZIP_NESTING_TOO_DEEP when an inner .zip entry exceeds the depth limit', async () => {
    // Slice C policy: any inner .zip when maxNestingDepth <= 1 is rejected.
    const inner = new JSZip();
    inner.file('inside.txt', 'inner payload');
    const innerBuffer = await inner.generateAsync({ type: 'nodebuffer' });

    const outer = new JSZip();
    outer.file('child.zip', innerBuffer);
    outer.file('peer.txt', 'sibling text');
    const zipPath = await writeZipToDisk(outer, 'nested');
    const destDir = makeDestDir('nested');
    createdPaths.push(zipPath, destDir);

    try {
      await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS);
      throw new Error('Expected ZIP_NESTING_TOO_DEEP to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_NESTING_TOO_DEEP');
    }
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
      await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS);
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
      await validateAndExtractZip(zipPath, destDir, TEST_THRESHOLDS);
      throw new Error('Expected ZIP_PATH_TRAVERSAL to be thrown');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).code).toBe('ZIP_PATH_TRAVERSAL');
    }
  });
});

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
