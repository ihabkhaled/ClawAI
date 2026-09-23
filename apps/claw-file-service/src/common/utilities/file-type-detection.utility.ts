import { Logger } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

const logger = new Logger('FileTypeDetection');

// The only file that imports `file-type` (rules/13). It reads a buffer's leading
// bytes and, for ZIP containers, looks inside — which is why it, and not a bare
// signature check, decides whether a mislabelled upload is a plain archive or a
// DOCX / XLSX / EPUB / JAR that merely shares ZIP's signature.

/** The MIME type the bytes really are, or null when unknown. Never throws. */
export async function detectMimeTypeFromBytes(buffer: Uint8Array): Promise<string | null> {
  try {
    const result = await fileTypeFromBuffer(buffer);
    return result?.mime ?? null;
  } catch (error: unknown) {
    logger.warn(
      `detectMimeTypeFromBytes: detection failed — ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return null;
  }
}
