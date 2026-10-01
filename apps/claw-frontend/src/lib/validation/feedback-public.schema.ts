import { FEEDBACK_MAX_CONTENT_LENGTH, FEEDBACK_MAX_TITLE_LENGTH } from '@claw/shared-constants';
import { FeedbackType } from '@claw/shared-types';
import { z } from 'zod';

import {
  PUBLIC_FEEDBACK_MAX_EMAIL_LENGTH,
  PUBLIC_FEEDBACK_MAX_NAME_LENGTH,
} from '@/constants/feedback.constants';

// Feedback from a visitor who is not signed in. `website` is the honeypot: a
// person never sees it, so it has to stay empty.
export const publicFeedbackFormSchema = z.object({
  type: z.nativeEnum(FeedbackType),
  title: z.string().max(FEEDBACK_MAX_TITLE_LENGTH).optional(),
  contentMarkdown: z.string().min(1).max(FEEDBACK_MAX_CONTENT_LENGTH),
  name: z.string().trim().min(1).max(PUBLIC_FEEDBACK_MAX_NAME_LENGTH),
  email: z.string().trim().email().max(PUBLIC_FEEDBACK_MAX_EMAIL_LENGTH),
  website: z.string(),
});

export type PublicFeedbackFormValues = z.infer<typeof publicFeedbackFormSchema>;
