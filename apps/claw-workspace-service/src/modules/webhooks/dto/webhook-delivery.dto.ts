import { z } from 'zod';

import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const listWebhookDeliveriesQuerySchema = z
  .object({
    provider: z.nativeEnum(WorkspaceProvider).optional(),
    signatureValid: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    connectorId: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().min(1).max(256).optional(),
  })
  .strict();

export type ListWebhookDeliveriesQueryDto = z.infer<typeof listWebhookDeliveriesQuerySchema>;
