import { z } from 'zod';

import { AUDIO_PROVIDER_CONNECTORS, AUDIO_PROVIDER_GEMINI } from '../../../common/constants';
import {
  AUDIO_FORMATS,
  AUDIO_MUSIC_MAX_CHARACTERS,
  AUDIO_SPEECH_MAX_CHARACTERS,
} from '../constants/audio-generation.constants';

const LYRIA_MARKER = 'lyria';

export const generateAudioSchema = z
  .object({
    userId: z.string().min(1).max(100),
    workspaceId: z.string().max(100).nullish(),
    threadId: z.string().max(100).nullish(),
    messageId: z.string().max(100).nullish(),
    kind: z.enum(['SPEECH', 'MUSIC']),
    provider: z.string().refine((value) => AUDIO_PROVIDER_CONNECTORS.has(value), {
      message: 'Unsupported audio provider',
    }),
    /** Omitted: the default model for the kind and provider. */
    model: z.string().trim().min(1).max(200).nullish(),
    /** The text to speak, or the music brief. */
    prompt: z.string().trim().min(1).max(AUDIO_SPEECH_MAX_CHARACTERS),
    voice: z.string().trim().min(1).max(64).nullish(),
    format: z.enum(AUDIO_FORMATS).nullish(),
  })
  .superRefine((value, ctx) => {
    const isLyria = value.model?.toLowerCase().includes(LYRIA_MARKER) === true;
    if (value.kind === 'MUSIC') {
      if (value.provider !== AUDIO_PROVIDER_GEMINI) {
        ctx.addIssue({ code: 'custom', path: ['provider'], message: 'Music needs AUDIO_GEMINI' });
      }
      if (value.model !== null && value.model !== undefined && !isLyria) {
        ctx.addIssue({ code: 'custom', path: ['model'], message: 'Not a music model' });
      }
      if (value.prompt.length > AUDIO_MUSIC_MAX_CHARACTERS) {
        ctx.addIssue({
          code: 'too_big',
          maximum: AUDIO_MUSIC_MAX_CHARACTERS,
          origin: 'string',
          path: ['prompt'],
        });
      }
    } else if (isLyria) {
      ctx.addIssue({ code: 'custom', path: ['model'], message: 'Not a speech model' });
    }
  });

export type GenerateAudioDto = z.infer<typeof generateAudioSchema>;

/** Body of the internal cancel route: the owner the row must belong to. */
export const cancelAudioSchema = z.object({ userId: z.string().min(1).max(100) });

export type CancelAudioDto = z.infer<typeof cancelAudioSchema>;

export const linkAudioAssistantMessageSchema = z.object({
  userId: z.string().min(1).max(100),
  assistantMessageId: z.string().min(1).max(100),
});

export type LinkAudioAssistantMessageDto = z.infer<typeof linkAudioAssistantMessageSchema>;
