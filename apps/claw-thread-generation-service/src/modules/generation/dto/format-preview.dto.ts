import { z } from 'zod';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { authorDraftSchema } from '../types/generation-pipeline.types';

/** One owner-asked typesetting pass over an existing article (ADR-189). Strict: no extra keys. */
export const formatPreviewSchema = z
  .object({
    ownerId: z.string().min(1).max(64),
    idempotencyKey: z.string().min(1).max(160),
    correlationId: z.string().min(1).max(200),
    contentLocale: z.nativeEnum(Locale),
    publicationType: z.nativeEnum(ThreadPublicationType),
    title: z.string().min(1).max(300),
    draft: authorDraftSchema,
    /** The generation the article came from: its Judge model and plan pool pick the cheap model. */
    parentJobId: z.string().min(1).max(64),
  })
  .strict();

export type FormatPreviewDto = z.infer<typeof formatPreviewSchema>;

export type FormatPreviewResult = {
  status: 'FORMATTED' | 'SKIPPED';
  /** A `FORMAT_*` code when SKIPPED. */
  code: string | null;
  markdown: string;
  citations: Array<{ evidenceId: string; url: string }>;
};
