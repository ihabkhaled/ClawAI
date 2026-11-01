import { MEDIA_GENERATIONS_METADATA_KEY } from '../constants/media-tools.constants';
import type { MediaKind } from '../enums/media-kind.enum';
import type { LlmResponse } from '../types/execution.types';
import type { MediaGenerationRef } from '../types/media-tools.types';
import { buildPluginMetaPart } from './plugin-metadata.utility';

/**
 * The assistant message's media part: `mediaGenerations`, the cards the answer shows under
 * its text. Empty when no media tool produced anything, so ordinary messages gain no key.
 * Spread by every store site that can carry a card (normal chat, Compare lanes).
 */
export function buildMediaMetaPart(source: {
  mediaGenerations?: readonly MediaGenerationRef[] | undefined;
}): Record<string, unknown> {
  const generations = source.mediaGenerations;
  return generations === undefined || generations.length === 0
    ? {}
    : { [MEDIA_GENERATIONS_METADATA_KEY]: generations };
}

/** The image generations of a response, for the owner link (image-service fills the message id). */
export function imageGenerationIds(
  generations: readonly MediaGenerationRef[] | undefined,
): string[] {
  return (generations ?? []).filter((ref) => ref.kind === 'image').map((ref) => ref.id);
}

/** `{ mediaGenerations }` when the response made media, else nothing: carries it onto a lane result. */
export function mediaGenerationsField(source: {
  mediaGenerations?: readonly MediaGenerationRef[] | undefined;
}): { mediaGenerations?: readonly MediaGenerationRef[] } {
  return source.mediaGenerations === undefined ? {} : { mediaGenerations: source.mediaGenerations };
}

/** What the tool loops add to an assistant message: the plugins used and the media made. */
export function buildToolMetaPart(llmResponse: LlmResponse): Record<string, unknown> {
  return { ...buildPluginMetaPart(llmResponse), ...buildMediaMetaPart(llmResponse) };
}

/** The ids of one kind of generation a response made, for the owner link. */
export function mediaGenerationIds(
  generations: readonly MediaGenerationRef[] | undefined,
  kind: MediaKind,
): string[] {
  return (generations ?? []).filter((ref) => ref.kind === kind).map((ref) => ref.id);
}

/** Whether Stop has aborted the run (read through a function so narrowing does not freeze it). */
export function isAbortedSignal(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}
