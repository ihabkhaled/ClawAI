import { z } from 'zod';
import { PullJobStatus } from '../../../common/enums';

export const InitiatePullSchema = z.object({
  overrideHardwareGate: z.boolean().optional().default(false),
});

export type InitiatePullDto = z.infer<typeof InitiatePullSchema>;

export const ListPullJobsQuerySchema = z.object({
  status: z.nativeEnum(PullJobStatus).optional(),
  modelId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().max(200).optional(),
});

export type ListPullJobsQueryDto = z.infer<typeof ListPullJobsQuerySchema>;
