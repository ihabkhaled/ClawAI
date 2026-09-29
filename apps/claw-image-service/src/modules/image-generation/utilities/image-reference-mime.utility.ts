import {
  REFERENCE_GIF_SIGNATURE,
  REFERENCE_JPEG_SIGNATURE,
  REFERENCE_MAX_BYTES,
  REFERENCE_MIME_EXTENSIONS,
  REFERENCE_PNG_SIGNATURE,
  REFERENCE_RIFF_SIGNATURE,
  REFERENCE_SNIFF_BASE64_CHARS,
  REFERENCE_STORED_FILENAME_PREFIX,
  REFERENCE_WEBP_SIGNATURE,
  REFERENCE_WEBP_TAG_OFFSET,
} from '../constants/image-reference-mime.constants';

function startsWithAt(bytes: Buffer, signature: readonly number[], offset: number): boolean {
  return (
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes.readUInt8(offset + index) === byte)
  );
}

/**
 * The image type the bytes ARE (PNG, JPEG, GIF, WEBP), from their magic
 * bytes, or undefined for anything else. Only the head of the base64 is
 * decoded, so a large payload is not copied just to be sniffed.
 */
export function sniffReferenceImageMime(base64: string): string | undefined {
  const head = Buffer.from(base64.slice(0, REFERENCE_SNIFF_BASE64_CHARS), 'base64');
  if (startsWithAt(head, REFERENCE_PNG_SIGNATURE, 0)) return 'image/png';
  if (startsWithAt(head, REFERENCE_JPEG_SIGNATURE, 0)) return 'image/jpeg';
  if (startsWithAt(head, REFERENCE_GIF_SIGNATURE, 0)) return 'image/gif';
  const isWebp =
    startsWithAt(head, REFERENCE_RIFF_SIGNATURE, 0) &&
    startsWithAt(head, REFERENCE_WEBP_SIGNATURE, REFERENCE_WEBP_TAG_OFFSET);
  return isWebp ? 'image/webp' : undefined;
}

/** Decoded size of a base64 string, computed without decoding it. */
export function base64DecodedLength(base64: string): number {
  const padding = base64.length - base64.replace(/=+$/u, '').length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** True when the decoded reference is non-empty and within `REFERENCE_MAX_BYTES`. */
export function isStorableReferenceSize(base64: string): boolean {
  const size = base64DecodedLength(base64);
  return size > 0 && size <= REFERENCE_MAX_BYTES;
}

/** `image-reference-<generationId>.<ext>` for a sniffed type. */
export function referenceFilename(generationId: string, mimeType: string): string {
  const extension = REFERENCE_MIME_EXTENSIONS.get(mimeType) ?? 'bin';
  return `${REFERENCE_STORED_FILENAME_PREFIX}-${generationId}.${extension}`;
}
