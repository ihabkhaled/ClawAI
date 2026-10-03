// HEIC / AVIF / TIFF / BMP are converted to JPEG at upload. These run the REAL
// decoders (libheif wasm, libvips, bmp-js) over real files: the HEIC is a 64x48
// still written by libheif, the others are built here.

import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../errors';
import {
  isNormalizableImageMime,
  normalizeImageUpload,
  withJpegExtension,
} from '../image-normalization.utility';

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const RED = { r: 200, g: 30, b: 30 };

const HEIC = fs.readFileSync(path.join(__dirname, '__fixtures__', 'sample.heic'));

async function redPng(): Promise<Sharp> {
  return sharp({ create: { width: 64, height: 48, channels: 3, background: RED } });
}
type Sharp = ReturnType<typeof sharp>;

/** A 24-bit uncompressed BMP, written byte by byte (BGR rows padded to 4 bytes, bottom-up). */
function buildBmp(width: number, height: number, bgr: [number, number, number]): Buffer {
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowBytes * height;
  const header = Buffer.alloc(54);
  header.write('BM', 0, 'ascii');
  header.writeUInt32LE(54 + pixelBytes, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(width, 18);
  header.writeInt32LE(height, 22);
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(24, 28);
  header.writeUInt32LE(pixelBytes, 34);
  const pixels = Buffer.alloc(pixelBytes);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const at = row * rowBytes + column * 3;
      pixels[at] = bgr[0];
      pixels[at + 1] = bgr[1];
      pixels[at + 2] = bgr[2];
    }
  }
  return Buffer.concat([header, pixels]);
}

async function centerPixel(jpeg: Buffer): Promise<[number, number, number]> {
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });
  const at =
    (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels;
  return [data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0];
}

function expectNear(actual: [number, number, number], expected: [number, number, number]): void {
  for (const [index, channel] of actual.entries()) {
    expect(Math.abs(channel - (expected[index] ?? 0))).toBeLessThanOrEqual(25);
  }
}

describe('isNormalizableImageMime', () => {
  it.each([
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'image/avif',
    'image/tiff',
    'image/bmp',
    'image/x-ms-bmp',
  ])('converts %s', (mime) => {
    expect(isNormalizableImageMime(mime)).toBe(true);
  });

  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'text/plain'])(
    'leaves %s alone',
    (mime) => {
      expect(isNormalizableImageMime(mime)).toBe(false);
    },
  );
});

describe('withJpegExtension', () => {
  it.each([
    ['IMG_0001.HEIC', 'IMG_0001.jpg'],
    ['my.holiday.photo.heif', 'my.holiday.photo.jpg'],
    ['noextension', 'noextension.jpg'],
    ['.hidden', '.hidden.jpg'],
  ])('%s becomes %s', (input, expected) => {
    expect(withJpegExtension(input)).toBe(expected);
  });
});

describe('normalizeImageUpload', () => {
  it('turns a real HEIC into a JPEG that still shows the picture', async () => {
    const result = await normalizeImageUpload({
      filename: 'IMG_0001.HEIC',
      mimeType: 'image/heic',
      buffer: HEIC,
    });

    expect(result).toMatchObject({
      filename: 'IMG_0001.jpg',
      mimeType: 'image/jpeg',
      converted: true,
    });
    expect(result.buffer.subarray(0, 3)).toEqual(JPEG_MAGIC);
    const meta = await sharp(result.buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 64, 48]);
    // Top-left of the fixture is its red field.
    const { data } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
    expectNear([data[0] ?? 0, data[1] ?? 0, data[2] ?? 0], [200, 30, 30]);
  });

  it.each(['image/heif', 'image/heic-sequence', 'image/heif-sequence'])(
    'decodes the same HEIC bytes declared as %s',
    async (mimeType) => {
      const result = await normalizeImageUpload({ filename: 'a.heif', mimeType, buffer: HEIC });
      expect(result.mimeType).toBe('image/jpeg');
    },
  );

  it('converts a TIFF', async () => {
    const tiff = await (await redPng()).tiff().toBuffer();
    const result = await normalizeImageUpload({
      filename: 'scan.tiff',
      mimeType: 'image/tiff',
      buffer: tiff,
    });
    expect(result).toMatchObject({ filename: 'scan.jpg', mimeType: 'image/jpeg', converted: true });
    expectNear(await centerPixel(result.buffer), [200, 30, 30]);
  });

  it('converts an AVIF', async () => {
    const avif = await (await redPng()).avif().toBuffer();
    const result = await normalizeImageUpload({
      filename: 'pic.avif',
      mimeType: 'image/avif',
      buffer: avif,
    });
    expect(result.mimeType).toBe('image/jpeg');
    expectNear(await centerPixel(result.buffer), [200, 30, 30]);
  });

  it.each(['image/bmp', 'image/x-ms-bmp'])(
    'converts a 24-bit %s with its colours the right way round',
    async (mimeType) => {
      // BGR (30, 30, 200) is a BLUE picture: a channel swap would show red.
      const result = await normalizeImageUpload({
        filename: 'paint.bmp',
        mimeType,
        buffer: buildBmp(10, 6, [200, 30, 30]),
      });
      expect(result).toMatchObject({ filename: 'paint.jpg', mimeType: 'image/jpeg' });
      expectNear(await centerPixel(result.buffer), [30, 30, 200]);
    },
  );

  it('flattens a transparent AVIF onto white, not black', async () => {
    const transparent = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .avif()
      .toBuffer();
    const result = await normalizeImageUpload({
      filename: 'cut.avif',
      mimeType: 'image/avif',
      buffer: transparent,
    });
    expectNear(await centerPixel(result.buffer), [255, 255, 255]);
  });

  it.each([
    ['image/jpeg', 'a.jpg'],
    ['image/png', 'a.png'],
    ['application/pdf', 'a.pdf'],
  ])('returns %s untouched', async (mimeType, filename) => {
    const buffer = Buffer.from('bytes');
    const result = await normalizeImageUpload({ filename, mimeType, buffer });
    expect(result).toEqual({ filename, mimeType, buffer, converted: false });
    expect(result.buffer).toBe(buffer);
  });

  it.each([
    ['image/heic', Buffer.from('definitely not a heic file')],
    ['image/tiff', Buffer.from('definitely not a tiff file')],
    ['image/avif', Buffer.from('definitely not an avif file')],
  ])('answers a corrupt %s with a readable 422', async (mimeType, buffer) => {
    const failure = await normalizeImageUpload({ filename: 'x', mimeType, buffer }).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(BusinessException);
    expect(failure).toMatchObject({ code: 'IMAGE_DECODE_FAILED' });
    expect((failure as BusinessException).getStatus()).toBe(422);
    expect((failure as BusinessException).message).toContain('Re-export it as JPEG or PNG');
  });

  it('refuses a BMP header that claims a memory-bomb size before decoding it', async () => {
    const bomb = buildBmp(2, 2, [0, 0, 0]);
    bomb.writeInt32LE(100_000, 18);
    bomb.writeInt32LE(100_000, 22);
    await expect(
      normalizeImageUpload({ filename: 'bomb.bmp', mimeType: 'image/bmp', buffer: bomb }),
    ).rejects.toMatchObject({ code: 'IMAGE_DECODE_FAILED' });
  });

  it('refuses a truncated BMP', async () => {
    await expect(
      normalizeImageUpload({
        filename: 't.bmp',
        mimeType: 'image/bmp',
        buffer: Buffer.from('BM'),
      }),
    ).rejects.toMatchObject({ code: 'IMAGE_DECODE_FAILED' });
  });
});
