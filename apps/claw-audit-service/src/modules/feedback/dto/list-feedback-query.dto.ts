import { z } from 'zod';
import { FeedbackStatus, FeedbackType } from '@claw/shared-types';
import {
  FEEDBACK_DEFAULT_PAGE_SIZE,
  FEEDBACK_MAX_PAGE_SIZE,
  FEEDBACK_MAX_SEARCH_LENGTH,
} from '@claw/shared-constants';

export const listFeedbackQuerySchema = z.object({
  status: z.nativeEnum(FeedbackStatus).optional(),
  type: z.nativeEnum(FeedbackType).optional(),
  search: z.string().max(FEEDBACK_MAX_SEARCH_LENGTH).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(FEEDBACK_MAX_PAGE_SIZE)
    .default(FEEDBACK_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt', 'ticketNumber']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type ListFeedbackQueryDto = z.infer<typeof listFeedbackQuerySchema>;
