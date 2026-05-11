import { z } from 'zod';
import { FeedbackSignal } from '../../../common/enums';
import { DomainTag } from '../../../generated/prisma';

export const recordFeedbackSchema = z.object({
  profileKey: z.string().min(1).max(200),
  domain: z.nativeEnum(DomainTag),
  taskFamily: z.string().min(1).max(200),
  signal: z.nativeEnum(FeedbackSignal),
});

export type RecordFeedbackDto = z.infer<typeof recordFeedbackSchema>;
