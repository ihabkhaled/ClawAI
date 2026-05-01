import { z } from 'zod';
import { ModelCategory, QualityTier } from '../../../common/enums';

export const CatalogQuerySchema = z.object({
  category: z.nativeEnum(ModelCategory).optional(),
  qualityTier: z.nativeEnum(QualityTier).optional(),
  compatibleOnly: z
    .string()
    .optional()
    .transform((value) => value?.toLowerCase() === 'true'),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  cursor: z.string().max(200).optional(),
});

export type CatalogQueryDto = z.infer<typeof CatalogQuerySchema>;
