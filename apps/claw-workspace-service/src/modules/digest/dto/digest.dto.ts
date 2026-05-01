import { z } from 'zod';

import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

export const updateDigestPreferenceSchema = z
  .object({
    dailyEnabled: z.boolean().optional(),
    weeklyEnabled: z.boolean().optional(),
    dailyHourLocal: z.number().int().min(0).max(23).optional(),
    weeklyDayOfWeek: z.number().int().min(0).max(6).optional(),
    weeklyHourLocal: z.number().int().min(0).max(23).optional(),
    timezone: z.string().min(1).max(64).optional(),
    providers: z.array(z.nativeEnum(WorkspaceProvider)).max(20).optional(),
  })
  .strict();

export type UpdateDigestPreferenceDto = z.infer<typeof updateDigestPreferenceSchema>;

export const regenerateDigestSchema = z
  .object({
    userId: z.string().min(1).max(128),
    scope: z.enum(['DAILY', 'WEEKLY']),
    date: z.string().datetime().optional(),
  })
  .strict();

export type RegenerateDigestDto = z.infer<typeof regenerateDigestSchema>;
