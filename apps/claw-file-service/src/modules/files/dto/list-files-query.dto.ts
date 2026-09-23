import { z } from 'zod';
import { FileIngestionStatus } from '../../../generated/prisma';

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ingestionStatus: z.nativeEnum(FileIngestionStatus).optional(),
  search: z.string().max(255, 'Search must be at most 255 characters').optional(),
  // An archive's id: list the files extracted from it instead of top-level files.
  parentId: z.string().min(1).max(64).optional(),
});

export type ListFilesQueryDto = z.infer<typeof listFilesQuerySchema>;
