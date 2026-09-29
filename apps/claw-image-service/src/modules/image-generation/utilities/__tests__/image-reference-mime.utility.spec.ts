import { REFERENCE_MAX_BYTES } from '../../constants/image-reference-mime.constants';
import {
  base64DecodedLength,
  isStorableReferenceSize,
  referenceFilename,
  sniffReferenceImageMime,
} from '../image-reference-mime.utility';

const b64 = (bytes: number[]): string => Buffer.from(bytes).toString('base64');

describe('image-reference-mime utility', () => {
  it.each([
    ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0], 'image/png'],
    ['JPEG', [0xff, 0xd8, 0xff, 0xe0, 0, 0x10], 'image/jpeg'],
    ['GIF', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'image/gif'],
    [
      'WEBP',
      [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50],
      'image/webp',
    ],
  ])('recognises %s by its magic bytes', (_name, bytes, mime) => {
    expect(sniffReferenceImageMime(b64(bytes))).toBe(mime);
  });

  it.each([
    ['text', Buffer.from('hello world').toString('base64')],
    ['RIFF that is not WEBP', b64([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45])],
    ['a PDF', Buffer.from('%PDF-1.7 ...').toString('base64')],
    ['empty', ''],
  ])('refuses %s', (_name, value) => {
    expect(sniffReferenceImageMime(value)).toBeUndefined();
  });

  it('computes decoded length from the base64 padding', () => {
    expect(base64DecodedLength(Buffer.from('a').toString('base64'))).toBe(1);
    expect(base64DecodedLength(Buffer.from('ab').toString('base64'))).toBe(2);
    expect(base64DecodedLength(Buffer.from('abc').toString('base64'))).toBe(3);
  });

  it('accepts a non-empty reference within the cap and refuses empty or oversized ones', () => {
    expect(isStorableReferenceSize(b64([1, 2, 3]))).toBe(true);
    expect(isStorableReferenceSize('')).toBe(false);
    const oversized = 'A'.repeat(Math.ceil(((REFERENCE_MAX_BYTES + 3) * 4) / 3));
    expect(isStorableReferenceSize(oversized)).toBe(false);
  });

  it('names the stored file after the generation and the sniffed type', () => {
    expect(referenceFilename('img-9', 'image/jpeg')).toBe('image-reference-img-9.jpg');
    expect(referenceFilename('img-9', 'image/x-unknown')).toBe('image-reference-img-9.bin');
  });
});
