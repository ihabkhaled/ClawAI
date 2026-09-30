import { z } from 'zod';

import { VIDEO_PROVIDER_CONNECTORS } from '../../../common/constants';

const VIDEO_PROMPT_MAX_CHARACTERS = 4_000;

export const generateVideoSchema = z.object({
  prompt: z.string().trim().min(1).max(VIDEO_PROMPT_MAX_CHARACTERS),
  provider: z.string().refine((value) => VIDEO_PROVIDER_CONNECTORS.has(value), {
    message: 'Unsupported video provider',
  }),
  model: z.string().trim().min(1).max(200),
  userId: z.string().min(1).max(100),
  threadId: z.string().max(100).nullish(),
  userMessageId: z.string().max(100).nullish(),
  assistantMessageId: z.string().max(100).nullish(),
  originalPrompt: z.string().max(VIDEO_PROMPT_MAX_CHARACTERS).nullish(),
  durationSeconds: z.number().int().min(4).max(8).default(4),
  aspectRatio: z.enum(['16:9', '9:16']).default('16:9'),
  isAutoMode: z.boolean().default(false),
});

export type GenerateVideoDto = z.infer<typeof generateVideoSchema>;

export const linkVideoAssistantMessageSchema = z.object({
  userId: z.string().min(1).max(100),
  assistantMessageId: z.string().min(1).max(100),
});

export type LinkVideoAssistantMessageDto = z.infer<typeof linkVideoAssistantMessageSchema>;
