import { z } from 'zod';
import { FeedbackType } from '@claw/shared-types';
import {
  FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_CONTENT_LENGTH,
  FEEDBACK_MAX_FILENAME_LENGTH,
  FEEDBACK_MAX_SUBJECT_LENGTH,
  FEEDBACK_MAX_TITLE_LENGTH,
  FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES,
} from '@claw/shared-constants';

const attachmentSchema = z.object({
  fileId: z.string().min(1),
  filename: z.string().min(1).max(FEEDBACK_MAX_FILENAME_LENGTH),
  mimeType: z
    .string()
    .refine((val) => (FEEDBACK_ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(val), {
      message: 'Attachment type is not allowed',
    }),
  sizeBytes: z.number().int().min(1).max(FEEDBACK_MAX_ATTACHMENT_BYTES),
  isScreenshot: z.boolean(),
});

const pageContextSchema = z.object({
  route: z.string().max(1000).optional(),
  url: z.string().max(2048).optional(),
  appVersion: z.string().max(100).optional(),
  userAgent: z.string().max(1000).optional(),
  locale: z.string().max(50).optional(),
  viewportWidth: z.number().int().positive().max(20000).optional(),
  viewportHeight: z.number().int().positive().max(20000).optional(),
});

export const createFeedbackSchema = z
  .object({
    type: z.nativeEnum(FeedbackType),
    title: z.string().min(1).max(FEEDBACK_MAX_TITLE_LENGTH),
    subject: z.string().max(FEEDBACK_MAX_SUBJECT_LENGTH).optional(),
    contentMarkdown: z.string().min(1).max(FEEDBACK_MAX_CONTENT_LENGTH),
    attachments: z.array(attachmentSchema).max(FEEDBACK_MAX_ATTACHMENTS).optional(),
    pageContext: pageContextSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const total = (data.attachments ?? []).reduce((sum, item) => sum + item.sizeBytes, 0);
    if (total > FEEDBACK_MAX_TOTAL_ATTACHMENT_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: 'Total attachment size exceeds the allowed limit',
        path: ['attachments'],
      });
    }
  });

export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
