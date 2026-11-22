import { z } from 'zod';

import { LiveHighlightType } from '../../../generated/prisma';

/** file-service `POST /internal/files/transcribe-chunk` 200 body (TranscribeChunkResult). */
export const transcribeReplySchema = z.object({
  text: z.string(),
  language: z.string().nullable(),
  provider: z.string(),
  model: z.string().nullable(),
  durationSeconds: z.number(),
  costMicroUsd: z.number().int().min(0),
  costKnown: z.boolean(),
  noSpeech: z.boolean(),
});

const plainTitle = z.string().trim().min(1).max(120);
const plainText = z.string().trim().min(1).max(1200);

/** Strict summarizer reply (section 4). Anything else is rejected, never repaired. */
export const summaryReplySchema = z.object({
  topicShift: z.boolean(),
  current: z.object({
    title: plainTitle,
    summary: plainText,
    importance: z.number().int().min(1).max(3),
  }),
  highlights: z
    .array(
      z.object({
        type: z.enum(LiveHighlightType),
        title: plainTitle,
        summary: plainText,
        importance: z.number().int().min(1).max(3),
        quote: z.string().trim().max(300),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(5),
});

/** Final (ENDED) summary reply. */
export const finalReplySchema = z.object({
  title: plainTitle,
  summary: z.string().trim().min(1).max(3000),
});

/** Caption batch translation reply. */
export const captionTranslationReplySchema = z.object({
  items: z
    .array(z.object({ id: z.number().int(), text: z.string().trim().min(1).max(2000) }))
    .min(1),
});

/** Card translation reply. */
export const cardTranslationReplySchema = z.object({ title: plainTitle, text: plainText });

/** Vision reply: a frame description, or visible=false when nothing worth noting is shown. */
export const visionReplySchema = z.object({
  visible: z.boolean(),
  description: z.string().trim().max(400),
});

export const connectorConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().nullish(),
});

export const openAiReplySchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

export const ollamaReplySchema = z.object({ message: z.object({ content: z.string() }) });
