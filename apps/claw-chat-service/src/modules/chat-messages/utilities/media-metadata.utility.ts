import { MEDIA_GENERATIONS_METADATA_KEY } from '../constants/media-tools.constants';
import { MediaGenerationState } from '../enums/media-generation-state.enum';
import { MediaKind } from '../enums/media-kind.enum';
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

/**
 * The media a stored assistant message carries (`metadata.mediaGenerations`), read defensively.
 * Repair and Verify rewrite text; the rewritten message keeps these cards, never drops or invents.
 */
export function readStoredMediaGenerations(metadata: unknown): MediaGenerationRef[] {
  if (typeof metadata !== 'object' || metadata === null) return [];
  const raw: unknown = Reflect.get(metadata, MEDIA_GENERATIONS_METADATA_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): MediaGenerationRef[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const kind: unknown = Reflect.get(entry, 'kind');
    const id: unknown = Reflect.get(entry, 'id');
    const status: unknown = Reflect.get(entry, 'status');
    const prompt: unknown = Reflect.get(entry, 'prompt');
    const known = Object.values(MediaKind).find((candidate) => candidate === kind);
    const state = Object.values(MediaGenerationState).find((candidate) => candidate === status);
    return known === undefined || state === undefined || typeof id !== 'string' || id.length === 0
      ? []
      : [{ kind: known, id, status: state, prompt: typeof prompt === 'string' ? prompt : '' }];
  });
}
