import { BusinessException } from '../../../../common/errors';
import { IMAGE_MASK_MAX_BYTES } from '../../constants/image-edit.constants';
import { isPng, pngHasAlpha, readImageDimensions } from '../image-dimensions.utility';
import { assertValidImageMask } from '../image-mask.utility';

/** A minimal PNG header: signature + IHDR (width, height, bit depth 8, colour type). */
const png = (width: number, height: number, colorType = 6): Buffer => {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.writeUInt8(8, 24);
  bytes.writeUInt8(colorType, 25);
  return bytes;
};

/** A minimal JPEG: SOI, then SOF0 carrying height and width. */
const jpeg = (width: number, height: number): Buffer => {
  const bytes = Buffer.alloc(20);
  bytes.writeUInt16BE(0xffd8, 0);
  bytes.writeUInt16BE(0xffc0, 2);
  bytes.writeUInt16BE(17, 4);
  bytes.writeUInt8(8, 6);
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
};

const ref = (bytes: Buffer): { base64: string; mimeType: string } => ({
  base64: bytes.toString('base64'),
  mimeType: 'image/png',
});

const codeOf = (fn: () => void): string => {
  try {
    fn();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(BusinessException);
    const business = error as BusinessException;
    expect(business.getStatus()).toBe(422);
    return business.code;
  }
  return 'NO_ERROR';
};

describe('image dimensions', () => {
  it('reads PNG and JPEG sizes and recognises PNG by magic bytes', () => {
    expect(readImageDimensions(png(512, 256))).toEqual({ width: 512, height: 256 });
    expect(readImageDimensions(jpeg(800, 600))).toEqual({ width: 800, height: 600 });
    expect(readImageDimensions(Buffer.from('GIF89a-not-supported'))).toBeUndefined();
    expect(isPng(jpeg(1, 1))).toBe(false);
    expect(pngHasAlpha(png(1, 1, 6))).toBe(true);
    expect(pngHasAlpha(png(1, 1, 2))).toBe(false);
  });
});

describe('assertValidImageMask (pack §81)', () => {
  it('accepts a same-size RGBA PNG mask for a PNG or a JPEG source', () => {
    expect(codeOf(() => assertValidImageMask(ref(png(512, 512)), ref(png(512, 512))))).toBe(
      'NO_ERROR',
    );
    expect(codeOf(() => assertValidImageMask(ref(png(800, 600)), ref(jpeg(800, 600))))).toBe(
      'NO_ERROR',
    );
  });

  it.each([
    ['a JPEG pretending to be a mask', jpeg(512, 512), png(512, 512)],
    ['a PNG without alpha', png(512, 512, 2), png(512, 512)],
    ['a different size', png(256, 256), png(512, 512)],
    ['a source whose size cannot be read', png(512, 512), Buffer.from('not an image')],
  ])('refuses %s with 422 IMAGE_MASK_INVALID', (_label, mask, source) => {
    expect(codeOf(() => assertValidImageMask(ref(mask), ref(source)))).toBe('IMAGE_MASK_INVALID');
  });

  it('refuses a mask over the size cap before parsing it', () => {
    const huge = Buffer.concat([png(512, 512), Buffer.alloc(IMAGE_MASK_MAX_BYTES)]);
    expect(codeOf(() => assertValidImageMask(ref(huge), ref(png(512, 512))))).toBe(
      'IMAGE_MASK_INVALID',
    );
  });
});
