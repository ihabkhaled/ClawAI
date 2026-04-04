import { z } from "zod";
import { FileIngestionStatus } from "../../../generated/prisma";

export const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ingestionStatus: z.nativeEnum(FileIngestionStatus).optional(),
  search: z.string().max(255, "Search must be at most 255 characters").optional(),
});

export type ListFilesQueryDto = z.infer<typeof listFilesQuerySchema>;
