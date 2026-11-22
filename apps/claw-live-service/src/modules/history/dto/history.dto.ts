import { z } from 'zod';

import { LiveExportFormat } from '../../../common/enums/live-export-format.enum';
import { HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT } from '../constants/history.constants';

const idSchema = z.string().min(1).max(64);

export const historyListQuerySchema = z.object({
  cursor: z.string().min(1).max(256).optional(),
  limit: z.coerce.number().int().min(1).max(HISTORY_MAX_LIMIT).default(HISTORY_DEFAULT_LIMIT),
});

export const historyEventsQuerySchema = historyListQuerySchema.extend({
  language: z
    .string()
    .min(2)
    .max(16)
    .regex(/^[a-zA-Z0-9-]+$/)
    .optional(),
});

export const historyIdParamSchema = idSchema;

export const exportBodySchema = z.object({ format: z.nativeEnum(LiveExportFormat) });

export type HistoryListQuery = z.infer<typeof historyListQuerySchema>;
export type HistoryEventsQuery = z.infer<typeof historyEventsQuerySchema>;
export type ExportBody = z.infer<typeof exportBodySchema>;
