import { z } from 'zod';

const MAX_FILE_SIZE_BYTES = 52428800;

export const uploadFileSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be at most 255 characters'),
  mimeType: z
    .string()
    .min(1, 'MIME type is required')
    .max(100, 'MIME type must be at most 100 characters'),
  sizeBytes: z
    .number()
    .min(1, 'File must not be empty')
    .max(MAX_FILE_SIZE_BYTES, 'File must be at most 50 MB'),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
