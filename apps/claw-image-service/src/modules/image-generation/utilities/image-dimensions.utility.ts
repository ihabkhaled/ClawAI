import {
  JPEG_MARKER_PREFIX,
  JPEG_SOF_MARKERS,
  JPEG_START_OF_IMAGE,
  PNG_ALPHA_COLOR_TYPES,
  PNG_COLOR_TYPE_OFFSET,
  PNG_HEADER_MIN_BYTES,
  PNG_IHDR_HEIGHT_OFFSET,
  PNG_IHDR_WIDTH_OFFSET,
  PNG_SIGNATURE,
} from '../constants/image-edit.constants';
import { type ImageDimensions } from '../types/image-edit.types';

/** True when the bytes start with the PNG signature (magic bytes, not the declared type). */
export function isPng(bytes: Buffer): boolean {
  return (
    bytes.length >= PNG_HEADER_MIN_BYTES &&
    PNG_SIGNATURE.every((byte, index) => bytes.readUInt8(index) === byte)
  );
}

/** True for a PNG whose colour type carries an alpha channel. */
export function pngHasAlpha(bytes: Buffer): boolean {
  return isPng(bytes) && PNG_ALPHA_COLOR_TYPES.includes(bytes.readUInt8(PNG_COLOR_TYPE_OFFSET));
}

/** Width/height from a PNG or JPEG header, or undefined for anything else. */
export function readImageDimensions(bytes: Buffer): ImageDimensions | undefined {
  return isPng(bytes)
    ? {
        width: bytes.readUInt32BE(PNG_IHDR_WIDTH_OFFSET),
        height: bytes.readUInt32BE(PNG_IHDR_HEIGHT_OFFSET),
      }
    : readJpegDimensions(bytes);
}

/** Walks JPEG segments to the first start-of-frame; bounded by the buffer length. */
function readJpegDimensions(bytes: Buffer): ImageDimensions | undefined {
  if (
    bytes.length < 4 ||
    bytes.readUInt8(0) !== JPEG_MARKER_PREFIX ||
    bytes.readUInt8(1) !== JPEG_START_OF_IMAGE
  ) {
    return undefined;
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes.readUInt8(offset) !== JPEG_MARKER_PREFIX) return undefined;
    if (JPEG_SOF_MARKERS.includes(bytes.readUInt8(offset + 1))) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return undefined;
}
