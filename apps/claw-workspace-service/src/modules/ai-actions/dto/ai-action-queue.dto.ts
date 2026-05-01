import { z } from 'zod';

import { AiActionQueueStatus } from '../../../common/enums/ai-action-queue-status.enum';
import { AiActionRiskLabel } from '../../../common/enums/ai-action-risk-label.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const queueListQuerySchema = z
  .object({
    status: z.nativeEnum(AiActionQueueStatus).optional(),
    provider: z.nativeEnum(WorkspaceProvider).optional(),
    actionKind: z.string().min(1).max(64).optional(),
    riskLabel: z.nativeEnum(AiActionRiskLabel).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().min(1).max(256).optional(),
  })
  .strict();

export type QueueListQueryDto = z.infer<typeof queueListQuerySchema>;

export const rejectQueueSchema = z
  .object({
    reason: z.string().min(10, 'reason must be at least 10 characters').max(1000),
  })
  .strict();

export type RejectQueueDto = z.infer<typeof rejectQueueSchema>;

export const editAndApproveQueueSchema = z
  .object({
    editedPayload: z.record(z.string(), z.unknown()),
  })
  .strict();

export type EditAndApproveQueueDto = z.infer<typeof editAndApproveQueueSchema>;

export const bulkApproveQueueSchema = z
  .object({
    queueIds: z.array(z.string().min(1)).min(1).max(50),
  })
  .strict();

export type BulkApproveQueueDto = z.infer<typeof bulkApproveQueueSchema>;
