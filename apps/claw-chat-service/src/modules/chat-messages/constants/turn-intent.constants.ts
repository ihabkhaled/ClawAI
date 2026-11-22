import type { TurnIntentKind, TurnIntentSource } from '@claw/shared-types';
import { z } from 'zod';

import { MediaKind } from '../enums/media-kind.enum';
import type { PreviousTurnKind } from '../types/turn-intent.types';

/** Every intent kind routing can send (ADR-218); anything else on the wire is ignored. */
export const TURN_INTENT_KINDS = [
  'TEXT',
  'IMAGE_GENERATE',
  'IMAGE_EDIT',
  'VIDEO',
  'AUDIO_SPEECH',
  'AUDIO_MUSIC',
  'FILE',
] as const satisfies readonly TurnIntentKind[];

export const TURN_INTENT_SOURCES = [
  'MODEL',
  'HEURISTIC',
] as const satisfies readonly TurnIntentSource[];

/** The wire shape of message.routed `turnIntent`; anything else is dropped (legacy rules then). */
export const turnIntentSchema = z.object({
  kind: z.enum(TURN_INTENT_KINDS),
  fileFormat: z.string().min(1).max(16).optional(),
  confidence: z.number().min(0).max(1),
  source: z.enum(TURN_INTENT_SOURCES),
  pickOverridden: z.object({ provider: z.string().min(1), model: z.string().min(1) }).optional(),
});

/** Only a model's reading of the turn overrides the keyword rules; HEURISTIC keeps them. */
export const AUTHORITATIVE_TURN_INTENT_SOURCE: TurnIntentSource = 'MODEL';

/** The media a chat model may be offered a tool for, per intent. TEXT and FILE offer none. */
export const MEDIA_KIND_BY_TURN_INTENT: Readonly<Partial<Record<TurnIntentKind, MediaKind>>> = {
  IMAGE_GENERATE: MediaKind.IMAGE,
  IMAGE_EDIT: MediaKind.IMAGE,
  VIDEO: MediaKind.VIDEO,
  AUDIO_SPEECH: MediaKind.AUDIO,
  AUDIO_MUSIC: MediaKind.AUDIO,
};

/** The audio sub-kind the media tool loop takes, per intent. */
export const AUDIO_KIND_BY_TURN_INTENT: Readonly<
  Partial<Record<TurnIntentKind, 'SPEECH' | 'MUSIC'>>
> = {
  AUDIO_SPEECH: 'SPEECH',
  AUDIO_MUSIC: 'MUSIC',
};

/** Intents that let an image follow-up or an attachment edit re-route to an image provider. */
export const IMAGE_TURN_INTENTS: ReadonlySet<TurnIntentKind> = new Set([
  'IMAGE_GENERATE',
  'IMAGE_EDIT',
]);

/** The previous answer's kind, from the assistant metadata `type` its generator wrote. */
export const PREVIOUS_TURN_KIND_BY_METADATA_TYPE: ReadonlyMap<string, PreviousTurnKind> = new Map([
  ['image_generation', 'IMAGE'],
  ['video_generation', 'VIDEO'],
  ['file_generation', 'FILE'],
]);

/** The previous answer's kind, from a media card a chat model's tool produced. */
export const PREVIOUS_TURN_KIND_BY_MEDIA_KIND: ReadonlyMap<unknown, PreviousTurnKind> = new Map([
  [MediaKind.IMAGE, 'IMAGE'],
  [MediaKind.VIDEO, 'VIDEO'],
  [MediaKind.AUDIO, 'AUDIO'],
]);

/** How many recent rows are read to find the previous assistant answer. */
export const PREVIOUS_TURN_LOOKBACK = 6;

/** Assistant metadata: the intent the turn was answered under (observability). */
export const TURN_INTENT_METADATA_KEY = 'turnIntent';

/** Assistant metadata: the generation model the user picked that a chat model replaced. */
export const INTENT_PICK_OVERRIDDEN_METADATA_KEY = 'intentPickOverridden';
