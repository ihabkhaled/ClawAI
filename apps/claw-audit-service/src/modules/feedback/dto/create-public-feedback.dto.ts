import { z } from 'zod';
import { FeedbackType } from '@claw/shared-types';
import { FEEDBACK_MAX_CONTENT_LENGTH, FEEDBACK_MAX_TITLE_LENGTH } from '@claw/shared-constants';
import {
  FEEDBACK_PUBLIC_EMAIL_MAX_LENGTH,
  FEEDBACK_PUBLIC_HONEYPOT_MAX_LENGTH,
  FEEDBACK_PUBLIC_LOCALE_MAX_LENGTH,
  FEEDBACK_PUBLIC_NAME_MAX_LENGTH,
  FEEDBACK_PUBLIC_PAGE_URL_MAX_LENGTH,
  FEEDBACK_PUBLIC_RAW_SLACK,
} from '../constants/feedback-public.constants';
import { cleanEmail, cleanMultiLine, cleanSingleLine } from '../utilities/feedback-text.utility';

// The public body is deliberately NOT the guarded one. There is no
// `attachments` field: a screenshot upload needs an authenticated file-service
// owner, and an anonymous upload surface is the cheapest abuse vector there is.
// Unknown keys (userId, role, source ...) are dropped by zod and never read.
//
// Every string is cleaned (control characters and NUL stripped, trimmed) FIRST
// and held to its real limit AFTER, so padding with invisible characters can
// neither dodge a minimum nor smuggle bytes past a maximum.

const single = (min: number, max: number): z.ZodType<string, string> =>
  z
    .string()
    .max(max * FEEDBACK_PUBLIC_RAW_SLACK)
    .transform(cleanSingleLine)
    .pipe(z.string().min(min).max(max));

export const createPublicFeedbackSchema = z.object({
  type: z.nativeEnum(FeedbackType),
  // Blank is allowed: the manager derives a title from the message.
  title: single(0, FEEDBACK_MAX_TITLE_LENGTH).optional(),
  message: z
    .string()
    .max(FEEDBACK_MAX_CONTENT_LENGTH * FEEDBACK_PUBLIC_RAW_SLACK)
    .transform(cleanMultiLine)
    .pipe(z.string().min(1).max(FEEDBACK_MAX_CONTENT_LENGTH)),
  name: single(1, FEEDBACK_PUBLIC_NAME_MAX_LENGTH),
  email: z
    .string()
    .max(FEEDBACK_PUBLIC_EMAIL_MAX_LENGTH * FEEDBACK_PUBLIC_RAW_SLACK)
    .transform(cleanEmail)
    .pipe(z.email().max(FEEDBACK_PUBLIC_EMAIL_MAX_LENGTH)),
  pageUrl: z
    .string()
    .max(FEEDBACK_PUBLIC_PAGE_URL_MAX_LENGTH)
    .refine((value) => /^https?:\/\//i.test(value.trim()), {
      message: 'pageUrl must be an http(s) URL',
    })
    .transform(cleanSingleLine)
    .optional(),
  locale: z.string().max(FEEDBACK_PUBLIC_LOCALE_MAX_LENGTH).transform(cleanSingleLine).optional(),
  // Honeypot. A human never sees this field. Not validated as "must be empty":
  // a bot that fills it must get the same 201 as everyone, not a 400 that
  // teaches it which field gave it away. The manager checks it.
  website: z
    .string()
    .transform((value) => value.slice(0, FEEDBACK_PUBLIC_HONEYPOT_MAX_LENGTH))
    .optional(),
});

export type CreatePublicFeedbackDto = z.infer<typeof createPublicFeedbackSchema>;
