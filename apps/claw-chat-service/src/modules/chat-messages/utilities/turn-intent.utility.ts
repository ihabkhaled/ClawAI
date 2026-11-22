import type { TurnIntentPayload } from '@claw/shared-types';

import { FILE_FORMAT_KEYWORDS } from '../constants/file-writer.constants';
import {
  AUTHORITATIVE_TURN_INTENT_SOURCE,
  INTENT_PICK_OVERRIDDEN_METADATA_KEY,
  PREVIOUS_TURN_KIND_BY_MEDIA_KIND,
  PREVIOUS_TURN_KIND_BY_METADATA_TYPE,
  TURN_INTENT_METADATA_KEY,
  turnIntentSchema,
} from '../constants/turn-intent.constants';
import { MEDIA_GENERATIONS_METADATA_KEY } from '../constants/media-tools.constants';
import type { AssembledContext } from '../types/context.types';
import type { PreviousTurnKind, TurnRow } from '../types/turn-intent.types';

/** `{ turnIntent }` from a message.routed payload; `{}` when absent or malformed (legacy rules then). */
export function turnIntentField(raw: unknown): { turnIntent?: TurnIntentPayload } {
  const parsed = turnIntentSchema.safeParse(raw);
  if (!parsed.success) return {};
  const { kind, fileFormat, confidence, source, pickOverridden } = parsed.data;
  return {
    turnIntent: {
      kind,
      confidence,
      source,
      ...(fileFormat === undefined ? {} : { fileFormat }),
      ...(pickOverridden === undefined ? {} : { pickOverridden }),
    },
  };
}

/**
 * The intent when a model decided it, else undefined. A HEURISTIC intent is the
 * same keywords chat-service already runs, so it must not override them (ADR-218).
 */
export function authoritativeTurnIntent(
  intent: TurnIntentPayload | undefined,
): TurnIntentPayload | undefined {
  return intent?.source === AUTHORITATIVE_TURN_INTENT_SOURCE ? intent : undefined;
}

/** The context carrying the routed intent, so the chokepoint's media-tool decision can read it. */
export function withTurnIntent(
  context: AssembledContext,
  intent: TurnIntentPayload | undefined,
): AssembledContext {
  return intent === undefined ? context : { ...context, turnIntent: intent };
}

/** The file format a MODEL FILE intent named, upper-cased, when the file path can write it. */
export function intentFileFormat(intent: TurnIntentPayload | undefined): string | undefined {
  const authoritative = authoritativeTurnIntent(intent);
  if (authoritative?.kind !== 'FILE' || authoritative.fileFormat === undefined) return undefined;
  const format = authoritative.fileFormat.replace(/^\./u, '').toUpperCase();
  return FILE_FORMAT_KEYWORDS.some(([known]) => known === format) ? format : undefined;
}

/**
 * The assistant metadata part: the intent the turn ran under, and the picked generation
 * model a chat model replaced (the bubble explains it). `{}` without an intent.
 */
export function buildTurnIntentMetaPart(
  intent: TurnIntentPayload | undefined,
): Record<string, unknown> {
  if (intent === undefined) return {};
  return {
    [TURN_INTENT_METADATA_KEY]: {
      kind: intent.kind,
      source: intent.source,
      confidence: intent.confidence,
    },
    ...(intent.pickOverridden === undefined
      ? {}
      : { [INTENT_PICK_OVERRIDDEN_METADATA_KEY]: intent.pickOverridden }),
  };
}

/**
 * What the latest assistant answer was, for routing's `previousTurnKind`: a follow-up such
 * as "make it blue" means something else after a picture than after a paragraph. TEXT when
 * the thread has no answer yet or the answer was ordinary text.
 */
export function previousTurnKind(rows: readonly TurnRow[]): PreviousTurnKind {
  const lastAssistant = [...rows].reverse().find((row) => row.role === 'ASSISTANT');
  const metadata = lastAssistant?.metadata;
  if (typeof metadata !== 'object' || metadata === null) return 'TEXT';
  const type: unknown = Reflect.get(metadata, 'type');
  const fromType =
    typeof type === 'string' ? PREVIOUS_TURN_KIND_BY_METADATA_TYPE.get(type) : undefined;
  return (
    fromType ?? lastMediaCardKind(Reflect.get(metadata, MEDIA_GENERATIONS_METADATA_KEY)) ?? 'TEXT'
  );
}

// A chat model's media tool stores its cards as `mediaGenerations`; the last card wins.
function lastMediaCardKind(raw: unknown): PreviousTurnKind | undefined {
  if (!Array.isArray(raw)) return undefined;
  const last: unknown = raw.at(-1);
  return typeof last === 'object' && last !== null
    ? PREVIOUS_TURN_KIND_BY_MEDIA_KIND.get(Reflect.get(last, 'kind'))
    : undefined;
}
