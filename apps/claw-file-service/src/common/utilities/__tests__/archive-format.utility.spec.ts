import * as zlib from 'node:zlib';
import JSZip from 'jszip';
import {
  isArchiveMimeType,
  resolveUploadMimeType,
  sniffArchiveFormat,
  streamMemberName,
} from '../archive-format.utility';
import { ArchiveFormat } from '../../enums/archive-format.enum';
import { ALLOWED_MIME_TYPES } from '../../../modules/files/types/files.types';
import { ARCHIVE_MIME_TYPES } from '../../../modules/files/constants/archive-formats.constants';
import { buildRar4, buildRar5, buildTar, buildWithSevenZip } from './__fixtures__/archive-fixtures';

const TAR = buildTar([{ name: 'a.txt', data: 'alpha' }]);

// A pre-POSIX tar: no "ustar" magic, recognisable only by its checksum.
const v7Tar = (): Buffer => {
  const tar = Buffer.from(TAR);
  tar.fill(0, 257, 265);
  let sum = 0;
  for (let index = 0; index < 512; index += 1) {
    sum += index >= 148 && index < 156 ? 0x20 : (tar[index] ?? 0);
  }
  tar.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return tar;
};

describe('sniffArchiveFormat', () => {
  it.each([
    ['zip', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]), ArchiveFormat.ZIP],
    ['empty zip', Buffer.from([0x50, 0x4b, 0x05, 0x06, 0, 0]), ArchiveFormat.ZIP],
    ['rar4', buildRar4([{ name: 'a', data: 'b' }]), ArchiveFormat.RAR],
    ['rar5', buildRar5([{ name: 'a', data: 'b' }]), ArchiveFormat.RAR5],
    ['gzip', zlib.gzipSync('x'), ArchiveFormat.GZIP],
    ['ustar', TAR, ArchiveFormat.TAR],
    ['v7 tar', v7Tar(), ArchiveFormat.TAR],
  ])('%s', (_label, bytes, expected) => {
    expect(sniffArchiveFormat(bytes)).toBe(expected);
  });

  it('recognises 7z, bzip2 and xz written by 7-Zip', async () => {
    expect(sniffArchiveFormat(await buildWithSevenZip('7z', { 'a.txt': 'a' }))).toBe(
      ArchiveFormat.SEVEN_ZIP,
    );
    expect(sniffArchiveFormat(await buildWithSevenZip('bzip2', { 'a.txt': 'a' }))).toBe(
      ArchiveFormat.BZIP2,
    );
    expect(sniffArchiveFormat(await buildWithSevenZip('xz', { 'a.txt': 'a' }))).toBe(
      ArchiveFormat.XZ,
    );
  });

  it.each([
    ['text', Buffer.from('hello world, definitely not an archive')],
    ['pdf', Buffer.from('%PDF-1.7\n')],
    ['empty', Buffer.alloc(0)],
    ['a zeroed block', Buffer.alloc(512)],
    [
      'a tar block with a wrong checksum',
      ((): Buffer => {
        const t = v7Tar();
        t[0] = 0x7a;
        return t;
      })(),
    ],
  ])('returns null for %s', (_label, bytes) => {
    expect(sniffArchiveFormat(bytes)).toBeNull();
  });
});

describe('streamMemberName', () => {
  it.each([
    ['report.csv.gz', 'report.csv'],
    ['REPORT.CSV.GZ', 'REPORT.CSV'],
    ['site.tgz', 'site.tar'],
    ['site.tar.bz2', 'site.tar'],
    ['site.tbz2', 'site.tar'],
    ['site.txz', 'site.tar'],
    ['log.xz', 'log'],
    ['noext', 'noext'],
    ['.gz', 'decompressed'],
    ['..gz', 'decompressed'],
    ['dir/../evil.gz', 'evil'],
  ])('%s → %s', (archiveName, expected) => {
    expect(streamMemberName(archiveName)).toBe(expected);
  });
});

describe('resolveUploadMimeType', () => {
  it('re-labels an octet-stream 7z as the archive it is', async () => {
    const bytes = await buildWithSevenZip('7z', { 'a.txt': 'alpha' });

    await expect(resolveUploadMimeType('application/octet-stream', bytes)).resolves.toBe(
      'application/x-7z-compressed',
    );
  });

  it.each([
    ['rar', buildRar5([{ name: 'a', data: 'b' }]), 'application/vnd.rar'],
    ['tar', TAR, 'application/x-tar'],
    ['gzip', zlib.gzipSync(TAR), 'application/gzip'],
  ])('re-labels an octet-stream %s', async (_label, bytes, expected) => {
    await expect(resolveUploadMimeType('application/octet-stream', bytes)).resolves.toBe(expected);
  });

  it('re-labels a wrong text MIME too', async () => {
    await expect(resolveUploadMimeType('text/plain', zlib.gzipSync('x'))).resolves.toBe(
      'application/gzip',
    );
  });

  it('re-labels an octet-stream plain ZIP', async () => {
    const zip = new JSZip();
    zip.file('a.txt', 'alpha');
    const bytes = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(resolveUploadMimeType('application/octet-stream', bytes)).resolves.toBe(
      'application/zip',
    );
  });

  it('leaves a DOCX that merely shares the ZIP signature alone', async () => {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    );
    zip.file('word/document.xml', '<w:document/>');
    const bytes = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(resolveUploadMimeType('application/octet-stream', bytes)).resolves.toBe(
      'application/octet-stream',
    );
  });

  it.each([
    ['a declared archive MIME (the magic check decides)', 'application/x-7z-compressed'],
    ['a PDF, which has its own signature check', 'application/pdf'],
    ['an image', 'image/png'],
  ])('never overrides %s', async (_label, declared) => {
    await expect(resolveUploadMimeType(declared, zlib.gzipSync('x'))).resolves.toBe(declared);
  });

  it('keeps octet-stream for bytes that are no archive', async () => {
    await expect(
      resolveUploadMimeType('application/octet-stream', Buffer.from('plain text')),
    ).resolves.toBe('application/octet-stream');
  });
});

describe('archive MIME lists', () => {
  it('every archive MIME is an allowed upload type', () => {
    for (const mimeType of ARCHIVE_MIME_TYPES) {
      expect(ALLOWED_MIME_TYPES as readonly string[]).toContain(mimeType);
      expect(isArchiveMimeType(mimeType)).toBe(true);
    }
  });

  it('does not treat a document as an archive', () => {
    expect(isArchiveMimeType('application/pdf')).toBe(false);
    expect(isArchiveMimeType('application/octet-stream')).toBe(false);
  });
});
