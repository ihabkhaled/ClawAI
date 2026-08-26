import {
  FEEDBACK_MAX_TITLE_LENGTH,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MAX_CONTENT_LENGTH,
} from '@claw/shared-constants';
import { FeedbackType } from '@claw/shared-types';
import { z } from 'zod';

export const feedbackFormSchema = z.object({
  type: z.nativeEnum(FeedbackType),
  title: z.string().min(1).max(FEEDBACK_MAX_TITLE_LENGTH),
  subject: z.string().max(FEEDBACK_MAX_SUBJECT_LENGTH).optional(),
  contentMarkdown: z.string().min(1).max(FEEDBACK_MAX_CONTENT_LENGTH),
});

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;
