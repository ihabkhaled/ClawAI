import { HttpStatus, Logger } from '@nestjs/common';
import bmp from 'bmp-js';
import convertHeic from 'heic-convert';
import sharp from 'sharp';
import { BusinessException } from '../errors';
import {
  BMP_BYTES_PER_PIXEL_RGBA,
  BMP_HEADER_MIN_BYTES,
  BMP_HEIGHT_OFFSET,
  BMP_IMAGE_MIME_TYPES,
  BMP_MAX_PIXELS,
  BMP_WIDTH_OFFSET,
  HEIC_JPEG_QUALITY,
  HEIF_IMAGE_MIME_TYPES,
  NORMALIZED_IMAGE_BACKGROUND,
  NORMALIZED_IMAGE_CODE,
  NORMALIZED_IMAGE_EXTENSION,
  NORMALIZED_IMAGE_MIME_TYPE,
  OPAQUE_ALPHA,
  SHARP_IMAGE_MIME_TYPES,
  SHARP_JPEG_QUALITY,
} from '../../modules/files/constants/image-normalization.constants';
import type {
  NormalizedImageUpload,
  NormalizeImageInput,
} from '../../modules/files/types/image-normalization.types';

const logger = new Logger('ImageNormalization');

// The only file that imports `heic-convert`, `sharp` and `bmp-js` (rules/13).

/** True when this MIME type is converted to JPEG at upload. */
export function isNormalizableImageMime(mimeType: string): boolean {
  return (
    HEIF_IMAGE_MIME_TYPES.has(mimeType) ||
    SHARP_IMAGE_MIME_TYPES.has(mimeType) ||
    BMP_IMAGE_MIME_TYPES.has(mimeType)
  );
}

/** `IMG_0001.HEIC` becomes `IMG_0001.jpg`; a name with no extension just gains one. */
export function withJpegExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return `${dot > 0 ? filename.slice(0, dot) : filename}${NORMALIZED_IMAGE_EXTENSION}`;
}

function decodeFailure(reason: string): BusinessException {
  return new BusinessException(
    `This image could not be read (${reason}). Re-export it as JPEG or PNG and upload it again.`,
    NORMALIZED_IMAGE_CODE,
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

async function heifToJpeg(buffer: Buffer): Promise<Buffer> {
  const jpeg = await convertHeic({ buffer, format: 'JPEG', quality: HEIC_JPEG_QUALITY });
  return Buffer.from(jpeg);
}

async function sharpToJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: 'error' })
    .rotate()
    .flatten({ background: NORMALIZED_IMAGE_BACKGROUND })
    .jpeg({ quality: SHARP_JPEG_QUALITY })
    .toBuffer();
}

async function bmpToJpeg(buffer: Buffer): Promise<Buffer> {
  if (buffer.length < BMP_HEADER_MIN_BYTES) {
    throw decodeFailure('truncated BMP');
  }
  const width = buffer.readInt32LE(BMP_WIDTH_OFFSET);
  const height = Math.abs(buffer.readInt32LE(BMP_HEIGHT_OFFSET));
  if (width <= 0 || height <= 0 || width * height > BMP_MAX_PIXELS) {
    throw decodeFailure('BMP dimensions out of range');
  }
  const decoded = bmp.decode(buffer);
  // bmp-js hands back A-B-G-R per pixel with a zero alpha byte; sharp wants R-G-B-A.
  const pixels = decoded.width * decoded.height;
  const rgba = Buffer.alloc(pixels * BMP_BYTES_PER_PIXEL_RGBA);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const at = pixel * BMP_BYTES_PER_PIXEL_RGBA;
    rgba.set(
      [
        decoded.data.readUInt8(at + 3),
        decoded.data.readUInt8(at + 2),
        decoded.data.readUInt8(at + 1),
        OPAQUE_ALPHA,
      ],
      at,
    );
  }
  return sharp(rgba, {
    raw: { width: decoded.width, height: decoded.height, channels: BMP_BYTES_PER_PIXEL_RGBA },
  })
    .jpeg({ quality: SHARP_JPEG_QUALITY })
    .toBuffer();
}

/**
 * Converts HEIC / HEIF / AVIF / TIFF / BMP to a JPEG, because no vision
 * provider reads them (Gemini takes HEIC but not AVIF or TIFF; OpenAI and
 * Anthropic take none of the five) and a browser cannot show most of them.
 * Any other image or file is returned untouched. A file that will not decode is
 * a 422 that says so, never a stored row no model can read.
 */
export async function normalizeImageUpload(
  input: NormalizeImageInput,
): Promise<NormalizedImageUpload> {
  const { mimeType, buffer } = input;
  if (!isNormalizableImageMime(mimeType)) {
    return { filename: input.filename, mimeType, buffer, converted: false };
  }
  try {
    let jpeg: Buffer;
    if (HEIF_IMAGE_MIME_TYPES.has(mimeType)) {
      jpeg = await heifToJpeg(buffer);
    } else if (BMP_IMAGE_MIME_TYPES.has(mimeType)) {
      jpeg = await bmpToJpeg(buffer);
    } else {
      jpeg = await sharpToJpeg(buffer);
    }
    logger.log(
      `normalizeImageUpload: ${mimeType} (${String(buffer.length)} bytes) -> ${NORMALIZED_IMAGE_MIME_TYPE} (${String(jpeg.length)} bytes)`,
    );
    return {
      filename: withJpegExtension(input.filename),
      mimeType: NORMALIZED_IMAGE_MIME_TYPE,
      buffer: jpeg,
      converted: true,
    };
  } catch (error: unknown) {
    if (error instanceof BusinessException) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : 'unknown decoder error';
    logger.warn(`normalizeImageUpload: ${mimeType} did not decode: ${reason}`);
    throw decodeFailure('the file is damaged or uses an unsupported variant');
  }
}
