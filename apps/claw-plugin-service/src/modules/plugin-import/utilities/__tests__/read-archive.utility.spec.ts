import { randomBytes } from 'node:crypto';

import { ImportErrorCode } from '../../../../common/enums/import-error-code.enum';
import { buildTgz, buildZip } from '../../__tests__/archive-builders';
import { IMPORT_LIMITS } from '../../constants/plugin-import.constants';
import { readArchive } from '../read-archive.utility';
import { readZipArchive } from '../read-zip-archive.utility';
import { isReadablePath } from '../plugin-paths.utility';

const keepAll = (): boolean => true;

function codeOf(action: () => unknown): string | undefined {
  try {
    action();
  } catch (error) {
    return (error as { importCode?: string }).importCode;
  }
  return undefined;
}

describe('plugin import archive reader: zip', () => {
  it('imports reads a normal zip fully in memory', () => {
    const zip = buildZip([
      { name: 'skills/a/SKILL.md', data: '# a' },
      { name: 'skills/', data: '', method: 0, mode: 0o040755 },
      { name: 'notes.exe', data: 'MZ' },
    ]);

    const result = readArchive(zip, isReadablePath);

    expect(result.files.map((f) => f.path)).toEqual(['skills/a/SKILL.md']);
    expect(result.fileCount).toBe(2);
    expect(result.skippedCount).toBe(1);
  });

  it.each([
    ['zip-slip parent traversal', '../evil.md'],
    ['nested traversal', 'skills/../../evil.md'],
    ['absolute path', '/etc/passwd'],
    ['windows drive path', 'C:/Windows/x.md'],
    ['backslash separator', 'skills\\a\\SKILL.md'],
    ['dot segment', './skills/a.md'],
    ['control character in name', 'skills/a\u0001.md'],
    ['bidi override in name', 'skills/a\u202ecod.md'],
  ])('rejects %s', (_label, name) => {
    expect(codeOf(() => readArchive(buildZip([{ name, data: 'x' }]), keepAll))).toBe(
      ImportErrorCode.PATH_UNSAFE,
    );
  });

  it('rejects a path nested deeper than the cap', () => {
    const deep = `${Array.from({ length: IMPORT_LIMITS.maxPathDepth + 1 }, () => 'd').join('/')}/f.md`;
    expect(codeOf(() => readArchive(buildZip([{ name: deep, data: 'x' }]), keepAll))).toBe(
      ImportErrorCode.PATH_TOO_DEEP,
    );
  });

  it('rejects a symlink entry', () => {
    const zip = buildZip([{ name: 'skills/link.md', data: '/etc/passwd', mode: 0o120777 }]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.SYMLINK_REJECTED);
  });

  it('rejects duplicate names, also when only the case differs', () => {
    const zip = buildZip([
      { name: 'skills/a.md', data: '1' },
      { name: 'SKILLS/A.md', data: '2' },
    ]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.DUPLICATE_ENTRY);
  });

  it('rejects an entry name that is not UTF-8', () => {
    const zip = buildZip([{ name: Buffer.from([0x73, 0xff, 0xfe, 0x2e, 0x6d, 0x64]), data: 'x' }]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.NON_UTF8);
  });

  it('rejects encrypted entries', () => {
    const zip = buildZip([{ name: 'skills/a.md', data: 'x', flags: 0x801 }]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.ARCHIVE_ENCRYPTED);
  });

  it('rejects a zip bomb by compression ratio before inflating', () => {
    const zip = buildZip([
      { name: 'skills/a.md', data: Buffer.alloc(IMPORT_LIMITS.maxEntryBytes - 1, 0x61) },
    ]);
    expect(zip.length).toBeLessThan(5000);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.ARCHIVE_BOMB);
  });

  it('rejects an entry that inflates beyond the size it declares', () => {
    const zip = buildZip([
      { name: 'skills/a.md', data: Buffer.alloc(4000, 0x61), declaredSize: 10 },
    ]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.ARCHIVE_BOMB);
  });

  it('rejects a single entry above the per-entry cap', () => {
    const zip = buildZip([
      { name: 'skills/a.md', data: randomBytes(IMPORT_LIMITS.maxEntryBytes + 1), method: 0 },
    ]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(
      ImportErrorCode.ARCHIVE_TOO_LARGE_UNPACKED,
    );
  });

  it('rejects when the total unpacked size passes the cap', () => {
    const entries = Array.from({ length: 11 }, (_unused, index) => ({
      name: `skills/f${String(index)}.md`,
      data: randomBytes(IMPORT_LIMITS.maxEntryBytes - 10),
      method: 0 as const,
    }));
    expect(codeOf(() => readZipArchive(buildZip(entries), () => false))).toBe(
      ImportErrorCode.ARCHIVE_TOO_LARGE_UNPACKED,
    );
  });

  it('rejects an archive with too many entries', () => {
    const entries = Array.from({ length: IMPORT_LIMITS.maxEntries + 1 }, (_unused, index) => ({
      name: `skills/f${String(index)}.md`,
      data: 'x',
      method: 0 as const,
    }));
    expect(codeOf(() => readArchive(buildZip(entries), keepAll))).toBe(
      ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES,
    );
  });

  it('rejects entries whose data ranges overlap', () => {
    const zip = buildZip([
      { name: 'skills/a.md', data: 'aaaa', method: 0 },
      { name: 'skills/b.md', data: 'aaaa', method: 0, localOffsetOf: 0 },
    ]);
    expect(codeOf(() => readArchive(zip, keepAll))).toBe(ImportErrorCode.ARCHIVE_CORRUPT);
  });

  it('rejects a damaged archive and a wrong file type by magic bytes', () => {
    expect(codeOf(() => readArchive(Buffer.from('PK\u0003\u0004 not really a zip'), keepAll))).toBe(
      ImportErrorCode.ARCHIVE_CORRUPT,
    );
    expect(codeOf(() => readArchive(Buffer.from('#!/bin/sh\necho hi\n'), keepAll))).toBe(
      ImportErrorCode.ARCHIVE_UNSUPPORTED,
    );
  });

  it('rejects an empty upload and an upload above the size cap', () => {
    expect(codeOf(() => readArchive(Buffer.alloc(0), keepAll))).toBe(
      ImportErrorCode.UPLOAD_MISSING,
    );
    expect(codeOf(() => readArchive(Buffer.alloc(IMPORT_LIMITS.maxUploadBytes + 1), keepAll))).toBe(
      ImportErrorCode.UPLOAD_TOO_LARGE,
    );
  });
});

describe('plugin import archive reader: tgz', () => {
  it('imports reads a normal tgz', () => {
    const tgz = buildTgz([
      { name: 'skills/', type: '5' },
      { name: 'skills/a/SKILL.md', data: '# a' },
      { name: 'run.sh', data: 'echo hi' },
    ]);

    const result = readArchive(tgz, isReadablePath);

    expect(result.files.map((f) => f.path)).toEqual(['skills/a/SKILL.md']);
    expect(result.skippedCount).toBe(1);
  });

  it('rejects traversal, absolute names and duplicates', () => {
    expect(codeOf(() => readArchive(buildTgz([{ name: '../x.md', data: 'x' }]), keepAll))).toBe(
      ImportErrorCode.PATH_UNSAFE,
    );
    expect(codeOf(() => readArchive(buildTgz([{ name: '/etc/x.md', data: 'x' }]), keepAll))).toBe(
      ImportErrorCode.PATH_UNSAFE,
    );
    expect(
      codeOf(() =>
        readArchive(
          buildTgz([
            { name: 'a/x.md', data: '1' },
            { name: 'a/X.md', data: '2' },
          ]),
          keepAll,
        ),
      ),
    ).toBe(ImportErrorCode.DUPLICATE_ENTRY);
  });

  it('rejects symlinks, hard links and devices', () => {
    for (const type of ['2', '1']) {
      expect(codeOf(() => readArchive(buildTgz([{ name: 'a/l.md', type }]), keepAll))).toBe(
        ImportErrorCode.SYMLINK_REJECTED,
      );
    }
    expect(codeOf(() => readArchive(buildTgz([{ name: 'dev', type: '3' }]), keepAll))).toBe(
      ImportErrorCode.ARCHIVE_UNSUPPORTED,
    );
  });

  it('rejects a gzip bomb', () => {
    const bomb = buildTgz([
      { name: 'skills/a.md', data: Buffer.alloc(IMPORT_LIMITS.maxEntryBytes - 1, 0x61) },
    ]);
    expect(bomb.length).toBeLessThan(5000);
    expect(codeOf(() => readArchive(bomb, keepAll))).toBe(ImportErrorCode.ARCHIVE_BOMB);
  });

  it('rejects a gzip stream that is not a tar', () => {
    expect(codeOf(() => readArchive(buildTgz([]).subarray(0, 20), keepAll))).toBe(
      ImportErrorCode.ARCHIVE_BOMB,
    );
  });
});
