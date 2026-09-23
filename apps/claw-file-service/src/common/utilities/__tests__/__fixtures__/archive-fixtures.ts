// Builders for tiny real archives, generated in the test run rather than
// committed as binaries.
//
// - tar, RAR4 and RAR5 are written byte by byte: they are simple formats, and a
//   hand-built one can carry entries no normal tool would write (a traversal
//   name, a device node, an encrypted RAR entry).
// - 7z, gzip, bzip2 and xz are written by 7-Zip itself (the same WASM engine the
//   service reads them with). RAR cannot be CREATED by 7-Zip — only read — which
//   is why RAR is built by hand.

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import SevenZip from '7z-wasm';

export type TarFixtureEntry = {
  name: string;
  data?: string | Buffer;
  /** Tar typeflag: '0' file, '1' hard link, '2' symlink, '3' char device, '5' dir, '6' FIFO. */
  type?: string;
  link?: string;
};

export type RarFixtureEntry = {
  name: string;
  data: string | Buffer;
  encrypted?: boolean;
};

const TAR_BLOCK = 512;

function tarHeader(entry: TarFixtureEntry, size: number): Buffer {
  const header = Buffer.alloc(TAR_BLOCK);
  header.write(entry.name, 0, 100, 'utf8');
  header.write('0000644\0', 100);
  header.write('0000000\0', 108);
  header.write('0000000\0', 116);
  header.write(`${size.toString(8).padStart(11, '0')}\0`, 124);
  header.write('00000000000\0', 136);
  header.write('        ', 148);
  header.write(entry.type ?? '0', 156);
  header.write(entry.link ?? '', 157, 100, 'utf8');
  header.write('ustar\0', 257);
  header.write('00', 263);
  let sum = 0;
  for (const byte of header) {
    sum += byte;
  }
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  return header;
}

/** A POSIX ustar archive. */
export function buildTar(entries: TarFixtureEntry[]): Buffer {
  const parts: Buffer[] = [];
  for (const entry of entries) {
    const data = Buffer.from(entry.data ?? '');
    parts.push(tarHeader(entry, data.length));
    if (data.length > 0) {
      parts.push(data, Buffer.alloc((TAR_BLOCK - (data.length % TAR_BLOCK)) % TAR_BLOCK));
    }
  }
  parts.push(Buffer.alloc(TAR_BLOCK * 2));
  return Buffer.concat(parts);
}

function u16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function rar4Block(type: number, flags: number, body: Buffer): Buffer {
  const rest = Buffer.concat([Buffer.from([type]), u16(flags), u16(7 + body.length), body]);
  return Buffer.concat([u16(zlib.crc32(rest) & 0xffff), rest]);
}

/** A RAR 1.5–4.x archive with stored (uncompressed) members. */
export function buildRar4(entries: RarFixtureEntry[]): Buffer {
  const parts = [
    Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]),
    rar4Block(0x73, 0, Buffer.alloc(6)),
  ];
  for (const entry of entries) {
    const data = Buffer.from(entry.data);
    const name = Buffer.from(entry.name);
    const body = Buffer.concat([
      u32(data.length),
      u32(data.length),
      Buffer.from([3]),
      u32(zlib.crc32(data)),
      u32(0x5a000000),
      Buffer.from([20, 0x30]),
      u16(name.length),
      u32(0o100644),
      name,
    ]);
    // 0x8000 = data follows the header; 0x04 = the member is encrypted.
    parts.push(rar4Block(0x74, 0x8000 | (entry.encrypted === true ? 0x04 : 0), body), data);
  }
  parts.push(rar4Block(0x7b, 0x4000, Buffer.alloc(0)));
  return Buffer.concat(parts);
}

function vint(value: number): Buffer {
  const bytes: number[] = [];
  let rest = value;
  do {
    let byte = rest & 0x7f;
    rest = Math.floor(rest / 128);
    if (rest > 0) {
      byte |= 0x80;
    }
    bytes.push(byte);
  } while (rest > 0);
  return Buffer.from(bytes);
}

function rar5Header(fields: Buffer[]): Buffer {
  const body = Buffer.concat(fields);
  const sized = Buffer.concat([vint(body.length), body]);
  return Buffer.concat([u32(zlib.crc32(sized)), sized]);
}

/** A RAR5 archive with stored members — the format WinRAR writes by default. */
export function buildRar5(entries: RarFixtureEntry[]): Buffer {
  const parts = [
    Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
    rar5Header([vint(1), vint(0), vint(0)]),
  ];
  for (const entry of entries) {
    const data = Buffer.from(entry.data);
    const name = Buffer.from(entry.name);
    parts.push(
      rar5Header([
        vint(2),
        vint(0x02),
        vint(data.length),
        vint(0x04),
        vint(data.length),
        vint(0o644),
        u32(zlib.crc32(data)),
        vint(0),
        vint(1),
        vint(name.length),
        name,
      ]),
      data,
    );
  }
  parts.push(rar5Header([vint(5), vint(0), vint(0)]));
  return Buffer.concat(parts);
}

/**
 * Runs `7zz a <switches> out <inputs>` over `files` in 7-Zip's in-memory
 * filesystem and returns the archive bytes. `format` is a `-t` type name.
 */
export async function buildWithSevenZip(
  format: string,
  files: Record<string, string | Buffer>,
  extraSwitches: string[] = [],
): Promise<Buffer> {
  const engine = await SevenZip({ print: () => {}, printErr: () => {} });
  engine.FS.mkdir('/src');
  engine.FS.chdir('/src');
  for (const [name, content] of Object.entries(files)) {
    const dir = path.posix.dirname(name);
    if (dir !== '.') {
      mkdirDeep(engine.FS, dir);
    }
    engine.FS.writeFile(
      `/src/${name}`,
      typeof content === 'string' ? content : new Uint8Array(content),
    );
  }
  const previousExitCode = process.exitCode;
  const tops = [...new Set(Object.keys(files).map((name) => name.split('/')[0] ?? name))];
  engine.callMain(['a', `-t${format}`, ...extraSwitches, '/out.bin', ...tops]);
  process.exitCode = previousExitCode;
  return Buffer.from(engine.FS.readFile('/out.bin'));
}

function mkdirDeep(
  fsApi: { mkdir(p: string): unknown; readdir(p: string): string[] },
  dir: string,
): void {
  let current = '/src';
  for (const part of dir.split('/')) {
    current = `${current}/${part}`;
    try {
      fsApi.mkdir(current);
    } catch {
      // Already exists.
    }
  }
}

/** Writes bytes to a fresh temp file and returns its path. */
export function writeTempArchive(bytes: Buffer, name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-archive-src-'));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, bytes);
  return filePath;
}
