import { z } from 'zod';
import { CostClass, DomainTag, ModelLifecycle, QualityTier } from '../../../generated/prisma';

export const listRouterModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  provider: z.string().min(1).max(64).optional(),
  lifecycle: z.nativeEnum(ModelLifecycle).optional(),
  isLocal: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isRouterOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  isExecutionCapable: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  domain: z.nativeEnum(DomainTag).optional(),
  costClass: z.nativeEnum(CostClass).optional(),
  qualityTier: z.nativeEnum(QualityTier).optional(),
  search: z.string().min(1).max(200).optional(),
});

export type ListRouterModelsQueryDto = z.infer<typeof listRouterModelsQuerySchema>;
