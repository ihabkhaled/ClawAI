// The 7-Zip engine wrapper, against the real WASM build.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { ArchiveFormat } from '../../enums/archive-format.enum';
import {
  extractSevenZipEntries,
  listSevenZipArchive,
  streamSevenZipPayload,
} from '../seven-zip.utility';
import { buildTar, buildWithSevenZip, writeTempArchive } from './__fixtures__/archive-fixtures';

describe('seven-zip.utility', () => {
  const created: string[] = [];

  const tempArchive = (bytes: Buffer, name: string): string => {
    const archivePath = writeTempArchive(bytes, name);
    created.push(path.dirname(archivePath));
    return archivePath;
  };

  afterEach(() => {
    for (const target of created.splice(0)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  });

  describe('listSevenZipArchive', () => {
    it('returns the -slt listing of an archive', async () => {
      const archivePath = tempArchive(buildTar([{ name: 'a.txt', data: 'alpha' }]), 'a.tar');

      const listing = await listSevenZipArchive({
        archivePath,
        format: ArchiveFormat.TAR,
        maxOutputBytes: 1_000_000,
      });

      expect(listing.exitCode).toBe(0);
      expect(listing.text).toContain('Path = a.txt');
      expect(listing.passwordRequired).toBe(false);
      expect(listing.outputLimitReached).toBe(false);
    });

    it('aborts, rather than buffers, a listing past maxOutputBytes', async () => {
      const archivePath = tempArchive(
        buildTar(Array.from({ length: 20 }, (_u, i) => ({ name: `f${String(i)}.txt`, data: 'x' }))),
        'many.tar',
      );

      const listing = await listSevenZipArchive({
        archivePath,
        format: ArchiveFormat.TAR,
        maxOutputBytes: 600,
      });

      expect(listing.outputLimitReached).toBe(true);
      expect(Buffer.byteLength(listing.text)).toBeLessThanOrEqual(600);
    });

    it('reports a password prompt for encrypted headers and does not read stdin', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' }, ['-pSECRET', '-mhe=on']);
      const archivePath = tempArchive(bytes, 'h.7z');

      const listing = await listSevenZipArchive({
        archivePath,
        format: ArchiveFormat.SEVEN_ZIP,
        maxOutputBytes: 1_000_000,
      });

      expect(listing.passwordRequired).toBe(true);
      expect(listing.exitCode).toBeNull();
    });

    it('opens it with the right password', async () => {
      const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' }, ['-pSECRET', '-mhe=on']);
      const archivePath = tempArchive(bytes, 'h.7z');

      const listing = await listSevenZipArchive({
        archivePath,
        format: ArchiveFormat.SEVEN_ZIP,
        password: 'SECRET',
        maxOutputBytes: 1_000_000,
      });

      expect(listing.exitCode).toBe(0);
      expect(listing.text).toContain('Path = a.txt');
    });
  });

  describe('extractSevenZipEntries', () => {
    const twoFiles = (): string =>
      tempArchive(
        buildTar([
          { name: 'one.txt', data: 'first' },
          { name: 'two.txt', data: 'second' },
        ]),
        'w.tar',
      );

    const freshDir = (): string => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-7z-x-'));
      created.push(dir);
      return dir;
    };

    it('extracts only the named entries', async () => {
      const destDir = freshDir();

      const outcome = await extractSevenZipEntries({
        archivePath: twoFiles(),
        format: ArchiveFormat.TAR,
        destDir,
        entryNames: ['two.txt'],
      });

      expect(outcome.exitCode).toBe(0);
      expect(fs.readdirSync(destDir)).toEqual(['two.txt']);
      expect(fs.readFileSync(path.join(destDir, 'two.txt'), 'utf8')).toBe('second');
    });

    it('treats a name as a literal, never as a wildcard', async () => {
      const destDir = freshDir();

      await extractSevenZipEntries({
        archivePath: twoFiles(),
        format: ArchiveFormat.TAR,
        destDir,
        entryNames: ['*.txt'],
      });

      expect(fs.readdirSync(destDir)).toEqual([]);
    });
  });

  describe('streamSevenZipPayload', () => {
    it('writes the decompressed stream and counts its bytes', async () => {
      const archivePath = tempArchive(zlib.gzipSync(Buffer.from('hello stream')), 's.gz');
      const outPath = path.join(path.dirname(archivePath), 'out.bin');

      const outcome = await streamSevenZipPayload({
        archivePath,
        format: ArchiveFormat.GZIP,
        outPath,
        maxBytes: 1000,
      });

      expect(outcome.exitCode).toBe(0);
      expect(outcome.bytesWritten).toBe(12);
      expect(outcome.limitExceeded).toBe(false);
      expect(fs.readFileSync(outPath, 'utf8')).toBe('hello stream');
    });

    it('stops at maxBytes and never writes past it', async () => {
      const archivePath = tempArchive(zlib.gzipSync(Buffer.alloc(1024 * 1024)), 'z.gz');
      const outPath = path.join(path.dirname(archivePath), 'out.bin');

      const outcome = await streamSevenZipPayload({
        archivePath,
        format: ArchiveFormat.GZIP,
        outPath,
        maxBytes: 70_000,
      });

      expect(outcome.limitExceeded).toBe(true);
      expect(outcome.bytesWritten).toBe(70_000);
      expect(fs.statSync(outPath).size).toBe(70_000);
    });

    it('restores process.exitCode after the aborted run', async () => {
      const before = process.exitCode;
      const archivePath = tempArchive(zlib.gzipSync(Buffer.alloc(100_000)), 'z.gz');

      await streamSevenZipPayload({
        archivePath,
        format: ArchiveFormat.GZIP,
        outPath: path.join(path.dirname(archivePath), 'out.bin'),
        maxBytes: 10,
      });

      expect(process.exitCode).toBe(before);
    });
  });
});
