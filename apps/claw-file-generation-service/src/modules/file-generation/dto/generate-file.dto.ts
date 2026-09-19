import { z } from 'zod';

import { FileFormat } from '../../../generated/prisma';
import {
  EXPORT_MAX_CONTENT_CHARS,
  GENERATE_MAX_CONTENT_CHARS,
  GENERATE_MAX_PROMPT_CHARS,
} from '../constants/file-asset.constants';

export const generateFileSchema = z.object({
  prompt: z.string().min(1).max(GENERATE_MAX_PROMPT_CHARS),
  content: z.string().min(1).max(GENERATE_MAX_CONTENT_CHARS),
  // A free string here reached Prisma and failed there as a 500.
  format: z.nativeEnum(FileFormat),
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(100),
  userId: z.string().min(1).max(100),
  threadId: z.string().max(100).optional(),
  userMessageId: z.string().max(100).optional(),
  assistantMessageId: z.string().max(100).optional(),
  filename: z.string().max(255).optional(),
});

export type GenerateFileDto = z.infer<typeof generateFileSchema>;

export const listFileGenerationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFileGenerationsQueryDto = z.infer<typeof listFileGenerationsQuerySchema>;

/**
 * Export of text the user already has (an AI answer) as a file (F2). No model
 * is called. Capped at 200k characters; the format must be a real format,
 * never a free string that Prisma would reject.
 */
export const exportFileSchema = z.object({
  content: z.string().min(1).max(EXPORT_MAX_CONTENT_CHARS),
  format: z.nativeEnum(FileFormat),
  title: z.string().trim().max(120).optional(),
});

export type ExportFileDto = z.infer<typeof exportFileSchema>;
