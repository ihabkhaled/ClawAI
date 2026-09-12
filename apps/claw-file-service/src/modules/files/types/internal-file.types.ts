import { type FileIngestionStatus } from '../../../generated/prisma';

export type CreateInternalFileBody = {
  userId: string;
  filename: string;
  mimeType: string;
  // base64-encoded content body
  contentBase64: string;
  sourceWorkspaceObjectId?: string;
};

/**
 * What another service is given when it asks for a file's content.
 *
 * `content` and `extractedText` are NOT interchangeable:
 *   - `content` is base64 of the ORIGINAL bytes. It is what a vision model needs
 *     for an image, and it is meaningless to a text model for a PDF.
 *   - `extractedText` is the readable text pulled out of those bytes. It is what
 *     a text model needs, and it is null until extraction finishes.
 *
 * Handing `content` to a text model is what produced the "I can't read the
 * attached file" replies. Callers choose by modality, and consult
 * `ingestionStatus` before concluding a file has no text.
 */
export type InternalFileContentResponse = {
  id: string;
  filename: string;
  mimeType: string;
  content: string | null;
  extractedText: string | null;
  ingestionStatus: FileIngestionStatus;
  extractionError: string | null;
};

/**
 * The cheap readiness check. Carries the length of the extracted text rather
 * than the text itself so a poller never transfers megabytes to learn a boolean.
 */
export type FileIngestionState = {
  id: string;
  filename: string;
  mimeType: string;
  ingestionStatus: FileIngestionStatus;
  extractionError: string | null;
  extractedTextLength: number;
};
