import { z } from 'zod';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../types/files.types';
import {
  CHUNKED_UPLOAD_ID_PATTERN,
  CHUNKED_UPLOAD_MAX_CHUNK_BYTES,
  CHUNKED_UPLOAD_MAX_CHUNKS,
} from '../constants/chunked-upload.constants';

export const initChunkedUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be at most 255 characters'),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .max(100, 'MIME type must be at most 100 characters')
    .refine((val) => (ALLOWED_MIME_TYPES as readonly string[]).includes(val), {
      message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
  sizeBytes: z
    .number()
    .int()
    .min(1, 'File size must be at least 1 byte')
    .max(MAX_FILE_SIZE, `File size must be at most ${MAX_FILE_SIZE} bytes (50MB)`),
  totalChunks: z
    .number()
    .int()
    .min(1, 'A session needs at least one chunk')
    .max(
      CHUNKED_UPLOAD_MAX_CHUNKS,
      `A session cannot declare more than ${CHUNKED_UPLOAD_MAX_CHUNKS} chunks`,
    ),
});

export type InitChunkedUploadDto = z.infer<typeof initChunkedUploadSchema>;

export const uploadIdParamSchema = z.object({
  uploadId: z.string().regex(CHUNKED_UPLOAD_ID_PATTERN, 'Invalid upload id'),
});

export type UploadIdParamDto = z.infer<typeof uploadIdParamSchema>;

export const chunkIndexParamSchema = z.object({
  uploadId: z.string().regex(CHUNKED_UPLOAD_ID_PATTERN, 'Invalid upload id'),
  index: z.coerce.number().int().min(0, 'Chunk index must be 0 or greater'),
});

export type ChunkIndexParamDto = z.infer<typeof chunkIndexParamSchema>;

export const uploadChunkSchema = z.object({
  content: z
    .string()
    .min(1, 'Chunk content is required')
    .max(
      Math.ceil((CHUNKED_UPLOAD_MAX_CHUNK_BYTES * 4) / 3) + 16,
      `Chunk exceeds ${CHUNKED_UPLOAD_MAX_CHUNK_BYTES} bytes`,
    ),
});

export type UploadChunkDto = z.infer<typeof uploadChunkSchema>;
