import { z } from "zod";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "../types/files.types";

export const uploadFileSchema = z.object({
  filename: z.string().min(1, "Filename is required").max(255, "Filename must be at most 255 characters"),
  mimeType: z
    .string()
    .min(1, "MIME type is required")
    .max(100, "MIME type must be at most 100 characters")
    .refine(
      (val) => (ALLOWED_MIME_TYPES as readonly string[]).includes(val),
      { message: `MIME type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}` },
    ),
  sizeBytes: z
    .number()
    .int()
    .min(1, "File size must be at least 1 byte")
    .max(MAX_FILE_SIZE, `File size must be at most ${MAX_FILE_SIZE} bytes (50MB)`),
  content: z.string().max(70000000, "Content must be at most 70000000 characters").optional(),
});

export type UploadFileDto = z.infer<typeof uploadFileSchema>;
