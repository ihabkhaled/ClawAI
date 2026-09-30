import { MAX_FILE_SIZE } from '../types/files.types';

/** What image-service stores after a Veo or Grok Imagine Video generation (ADR-137). */
export const GENERATED_VIDEO_MIME_TYPES = ['video/mp4'] as const;

/** The base64 length of a file at the size cap (4 characters per 3 bytes). */
export const GENERATED_VIDEO_MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE / 3) * 4;

export const GENERATED_VIDEO_FILENAME_MAX_LENGTH = 200;
