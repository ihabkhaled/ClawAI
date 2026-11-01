import { ChatSurface } from '../../../common/enums/chat-surface.enum';
import {
  classifyImageIntent,
  classifyVideoIntent,
  modelCanCallMediaTools,
  MultimodalImageIntent,
} from '@claw/shared-utilities';

import { MediaKind } from '../enums/media-kind.enum';
import {
  MEDIA_AUDIO_WORDS,
  MEDIA_CREATE_VERBS,
  MEDIA_DISCUSSION_LEADS,
  MEDIA_ECHO_LEADS,
  MEDIA_ECHO_PHRASES,
  MEDIA_EVERY_CALL_SURFACES,
  MEDIA_IMAGE_WORDS,
  MEDIA_MUSIC_WORDS,
  MEDIA_POLITE_WORDS,
  MEDIA_TOOL_CUE_STEMS,
  MEDIA_TOOL_CUE_WORD_SPLIT,
  MEDIA_TOOL_CUE_WORDS,
  MEDIA_TOOL_SURFACES,
} from '../constants/media-tools.constants';
import type { AssembledContext } from '../types/context.types';
import type { ExecutionOptions } from '../types/execution-options.types';
import { isGenerationProvider } from './generation-provider.utility';
import { latestUserTurnText } from './quoted-turn.utility';

/**
 * True when this model call should be offered the media tools. Pure and synchronous, so the
 * streaming decision (tool calls need a whole response) and the chokepoint read ONE answer.
 *
 * All must hold: the surface can show a media card, the context is not already a media-tool
 * round, nothing else owns the tool slot (a plugin round or a Runtime V2 run), the provider
 * speaks a native tool dialect, and the latest user turn talks about media at all.
 * Plan and credit are checked later, asynchronously, by the loop itself.
 */
export function wantsMediaTools(
  context: AssembledContext | undefined,
  provider: string,
  model: string,
  options?: ExecutionOptions,
): boolean {
  if (context === undefined || context.mediaToolsHandled === true) return false;
  // Normal chat never sets a surface; absent means CHAT (like the plugin tool loop).
  const surface = context.platformSurface ?? ChatSurface.CHAT;
  if (!MEDIA_TOOL_SURFACES.has(surface)) return false;
  // A many-candidate surface offers the tools only on its one final-answer call.
  if (!MEDIA_EVERY_CALL_SURFACES.has(surface) && context.mediaFinalStep !== true) return false;
  if ((options?.toolCatalog?.length ?? 0) > 0 || (context.toolTurns?.length ?? 0) > 0) return false;
  if (isGenerationProvider(provider)) return false;
  // The ONE shared predicate (A1, shared-utilities): provider dialect AND a chat model id; the
  // registry supports_tools column is deliberately not consulted (unpopulated for most models).
  if (!modelCanCallMediaTools(provider, model)) return false;
  const text = latestUserTurnText(context.threadMessages);
  return text !== undefined && asksToCreateMedia(text);
}

/** Whether the text names media at all: a whole cue word, or a cue stem anywhere in it. */
export function mentionsMedia(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.split(MEDIA_TOOL_CUE_WORD_SPLIT).some((word) => MEDIA_TOOL_CUE_WORDS.has(word)) ||
    MEDIA_TOOL_CUE_STEMS.some((stem) => lower.includes(stem))
  );
}

/**
 * Whether the user asks to CREATE new media (not to discuss it, quote it or echo words). A
 * discussion lead or an echo request vetoes; then the shared image/video intent classifiers or
 * a create verb beside a media word allow it.
 */
export function asksToCreateMedia(text: string): boolean {
  if (!mentionsMedia(text)) return false;
  const lower = text.toLowerCase();
  const words = lower.split(MEDIA_TOOL_CUE_WORD_SPLIT).filter(Boolean);
  const lead = words.find((word) => !MEDIA_POLITE_WORDS.has(word)) ?? '';
  const vetoed =
    MEDIA_DISCUSSION_LEADS.has(lead) ||
    MEDIA_ECHO_LEADS.has(lead) ||
    MEDIA_ECHO_PHRASES.some((phrase) => lower.includes(phrase));
  return vetoed
    ? false
    : classifyImageIntent(text, false) === MultimodalImageIntent.GENERATE ||
        classifyVideoIntent(text) ||
        words.some((word) => MEDIA_CREATE_VERBS.has(word));
}

/**
 * Which media a create-intent message asks for, with the shared classifiers (video, then image) and
 * the audio words. Undefined when it asks for none (a discussion, an echo, plain text).
 */
export function detectMediaKind(text: string): MediaKind | undefined {
  if (!asksToCreateMedia(text)) return undefined;
  if (classifyVideoIntent(text)) return MediaKind.VIDEO;
  if (classifyImageIntent(text, false) === MultimodalImageIntent.GENERATE) return MediaKind.IMAGE;
  const words = text.toLowerCase().split(MEDIA_TOOL_CUE_WORD_SPLIT).filter(Boolean);
  if (words.some((word) => MEDIA_AUDIO_WORDS.has(word))) return MediaKind.AUDIO;
  return words.some((word) => MEDIA_IMAGE_WORDS.has(word)) ? MediaKind.IMAGE : undefined;
}

/** Music for a song or tune request, otherwise the text is read aloud. */
export function detectAudioKind(text: string): 'SPEECH' | 'MUSIC' {
  const words = text.toLowerCase().split(MEDIA_TOOL_CUE_WORD_SPLIT).filter(Boolean);
  return words.some((word) => MEDIA_MUSIC_WORDS.has(word)) ? 'MUSIC' : 'SPEECH';
}
