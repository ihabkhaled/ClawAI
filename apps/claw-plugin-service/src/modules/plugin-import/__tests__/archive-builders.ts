import { crc32, deflateRawSync, gzipSync } from 'node:zlib';

export type ZipEntrySpec = {
  name: string | Buffer;
  data?: Buffer | string;
  /** 0 = stored, 8 = deflate. */
  method?: 0 | 8;
  /** Unix mode in the external attributes (e.g. 0o120777 for a symlink). */
  mode?: number;
  /** Host system in version-made-by (3 = unix, the default; 0 = DOS/Windows). */
  host?: number;
  flags?: number;
  /** Lies about the uncompressed size in both headers. */
  declaredSize?: number;
  /** Points the central directory at another entry's local header. */
  localOffsetOf?: number;
};

function toBuffer(value: Buffer | string | undefined): Buffer {
  if (value === undefined) return Buffer.alloc(0);
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
}

/** Builds a .zip in memory, including the malformed shapes the reader must refuse. */
export function buildZip(entries: ZipEntrySpec[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  const offsets: number[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = typeof entry.name === 'string' ? Buffer.from(entry.name, 'utf8') : entry.name;
    const raw = toBuffer(entry.data);
    const method = entry.method ?? 8;
    const body = method === 8 ? deflateRawSync(raw) : raw;
    const size = entry.declaredSize ?? raw.length;
    const flags = entry.flags ?? 0x800;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04_03_4b_50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(raw), 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    offsets.push(offset);
    const localBytes = Buffer.concat([local, name, body]);
    locals.push(localBytes);
    offset += localBytes.length;
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02_01_4b_50, 0);
    central.writeUInt16LE(((entry.host ?? 3) << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc32(raw), 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38);
    const target =
      entry.localOffsetOf === undefined
        ? (offsets.at(-1) ?? 0)
        : (offsets[entry.localOffsetOf] ?? 0);
    central.writeUInt32LE(target, 42);
    centrals.push(Buffer.concat([central, name]));
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06_05_4b_50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

export type TarEntrySpec = { name: string; data?: Buffer | string; type?: string };

function octal(value: number, length: number): string {
  return `${value.toString(8).padStart(length - 1, '0')}\0`;
}

/** Builds a .tgz in memory (ustar headers). */
export function buildTgz(entries: TarEntrySpec[]): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const data = toBuffer(entry.data);
    const header = Buffer.alloc(512);
    header.write(entry.name, 0, 100, 'utf8');
    header.write(octal(0o644, 8), 100, 8, 'latin1');
    header.write(octal(0, 8), 108, 8, 'latin1');
    header.write(octal(0, 8), 116, 8, 'latin1');
    header.write(octal(data.length, 12), 124, 12, 'latin1');
    header.write(octal(0, 12), 136, 12, 'latin1');
    header.write('        ', 148, 8, 'latin1');
    header.write(entry.type ?? '0', 156, 1, 'latin1');
    header.write('ustar\0', 257, 6, 'latin1');
    header.write('00', 263, 2, 'latin1');
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'latin1');
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}
