import { z } from 'zod';
import {
  CandidateStatus,
  DiscoveryRunStatus,
  DownloadStatus,
  ModelCategory,
} from '../../../generated/prisma';

export const listCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(CandidateStatus).optional(),
  runId: z.string().trim().max(64).optional(),
  category: z.nativeEnum(ModelCategory).optional(),
  downloadStatus: z.nativeEnum(DownloadStatus).optional(),
  search: z.string().trim().max(120).optional(),
});
export type ListCandidatesQueryDto = z.infer<typeof listCandidatesQuerySchema>;

export const listRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sourceId: z.string().trim().max(64).optional(),
  status: z.nativeEnum(DiscoveryRunStatus).optional(),
});
export type ListRunsQueryDto = z.infer<typeof listRunsQuerySchema>;
