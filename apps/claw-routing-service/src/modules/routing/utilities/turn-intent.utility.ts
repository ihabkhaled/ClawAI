import { createHash } from 'node:crypto';
import type { TurnIntentPayload, TurnIntentSource } from '@claw/shared-types';
import { FILE_GENERATION_PROVIDER } from '../constants/routing.constants';
import {
  PREVIOUS_TURN_KINDS,
  TURN_INTENT_HEAD_CHARS,
  TURN_INTENT_INSTRUCTION,
  TURN_INTENT_MAX_ATTACHMENT_TYPES,
  TURN_INTENT_MAX_RAW_LENGTH,
  TURN_INTENT_MESSAGE_CLOSE,
  TURN_INTENT_MESSAGE_OPEN,
  TURN_INTENT_OMITTED_PREFIX,
  TURN_INTENT_OMITTED_SUFFIX,
  TURN_INTENT_PREFERRED_MODEL_IDS,
  TURN_INTENT_REJECTION_OVERSIZED,
  TURN_INTENT_REPAIR_INSTRUCTION,
  TURN_INTENT_TAIL_CHARS,
  turnIntentAnswerSchema,
} from '../constants/turn-intent.constants';
import {
  DECISION_REJECTION_NO_JSON,
  DECISION_REJECTION_SCHEMA,
  DECISION_REJECTION_UNPARSABLE,
  REPAIR_HINT_RAW_LIMIT,
} from '../constants/router-decision-schema.constants';
import type {
  AnswerValidationResult,
  RouterAnswerValidator,
  RouterChainEntryInput,
} from '../types/router-inference.types';
import type { RoutingDecisionResult } from '../types/routing.types';
import type {
  PreviousTurnKind,
  TurnIntentAnswer,
  TurnIntentRequest,
} from '../types/turn-intent.types';
import { extractJsonObject } from './router-decision-validation.utility';

/**
 * Head + tail of a long message with a marker in between. The request is
 * nearly always at one end of a pasted document, and the excerpt keeps the
 * classifier inside the router's input budget.
 */
export function excerptTurnMessage(
  message: string,
  headChars: number = TURN_INTENT_HEAD_CHARS,
  tailChars: number = TURN_INTENT_TAIL_CHARS,
): string {
  if (message.length <= headChars + tailChars) return message;
  const omitted = message.length - headChars - tailChars;
  return [
    message.slice(0, headChars),
    `${TURN_INTENT_OMITTED_PREFIX}${String(omitted)}${TURN_INTENT_OMITTED_SUFFIX}`,
    message.slice(message.length - tailChars),
  ].join('\n');
}

/** The full classifier prompt: instruction, turn facts, then the delimited message. */
export function buildTurnIntentPrompt(request: TurnIntentRequest): string {
  const attachments = (request.attachmentMimeTypes ?? []).slice(
    0,
    TURN_INTENT_MAX_ATTACHMENT_TYPES,
  );
  return [
    TURN_INTENT_INSTRUCTION,
    '',
    `PREVIOUS_ASSISTANT_TURN_KIND: ${request.previousTurnKind ?? 'UNKNOWN'}`,
    `ATTACHMENTS: ${attachments.length === 0 ? 'none' : attachments.join(', ')}`,
    `PICKED_MODEL_KIND: ${request.pickedModelKind ?? 'AUTO'}`,
    TURN_INTENT_MESSAGE_OPEN,
    excerptTurnMessage(request.message),
    TURN_INTENT_MESSAGE_CLOSE,
  ].join('\n');
}

/** Parses one raw classifier answer against the strict schema. */
export function validateTurnIntentAnswer(raw: string): AnswerValidationResult<TurnIntentAnswer> {
  if (raw.length > TURN_INTENT_MAX_RAW_LENGTH) {
    return { valid: false, rejection: TURN_INTENT_REJECTION_OVERSIZED };
  }
  const candidate = extractJsonObject(raw);
  if (candidate === null) return { valid: false, rejection: DECISION_REJECTION_NO_JSON };
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { valid: false, rejection: DECISION_REJECTION_UNPARSABLE };
  }
  const result = turnIntentAnswerSchema.safeParse(parsed);
  return result.success
    ? { valid: true, decision: result.data }
    : { valid: false, rejection: DECISION_REJECTION_SCHEMA };
}

/** The coordinator validator for the turn-intent answer shape. */
export function turnIntentValidator(): RouterAnswerValidator<TurnIntentAnswer> {
  return {
    validate: validateTurnIntentAnswer,
    confidenceOf: (answer) => answer.confidence,
    repairHint: (raw) =>
      `${TURN_INTENT_REPAIR_INSTRUCTION}\n\nYour previous answer:\n${raw.slice(0, REPAIR_HINT_RAW_LIMIT)}`,
  };
}

/**
 * Cache key for one turn. The message is hashed so the cache never holds user
 * text; every fact the prompt carries is part of the key, so a changed
 * attachment or pick is a different question.
 */
export function turnIntentCacheKey(request: TurnIntentRequest): string {
  const digest = createHash('sha256').update(request.message).digest('hex');
  return [
    request.userId ?? '-',
    request.threadId ?? '-',
    request.previousTurnKind ?? '-',
    request.pickedModelKind ?? '-',
    (request.attachmentMimeTypes ?? []).join(','),
    digest,
  ].join('|');
}

/** `previousTurnKind` off an untrusted payload: a known value or undefined. */
export function parsePreviousTurnKind(value: unknown): PreviousTurnKind | undefined {
  return PREVIOUS_TURN_KINDS.find((kind) => kind === value);
}

/**
 * The published payload for a classifier answer. IMAGE_EDIT without an attached
 * image cannot be an edit, so it is published as the generation it becomes.
 */
export function modelTurnIntentPayload(
  answer: TurnIntentAnswer,
  hasAttachedImage: boolean,
): TurnIntentPayload {
  const kind =
    answer.intent === 'IMAGE_EDIT' && !hasAttachedImage ? 'IMAGE_GENERATE' : answer.intent;
  return {
    kind,
    confidence: answer.confidence,
    source: 'MODEL',
    ...(kind === 'FILE' && answer.fileFormat !== null ? { fileFormat: answer.fileFormat } : {}),
  };
}

/**
 * The payload for a decision the keyword detectors made. Undefined when the
 * decision is no generation, so chat-service keeps its legacy behaviour.
 */
export function heuristicTurnIntentPayload(
  decision: RoutingDecisionResult,
): TurnIntentPayload | undefined {
  const source: TurnIntentSource = 'HEURISTIC';
  if (decision.selectedProvider === FILE_GENERATION_PROVIDER) {
    return { kind: 'FILE', confidence: decision.confidence, source };
  }
  if (!decision.selectedProvider.startsWith('IMAGE_')) return undefined;
  const kind = decision.reasonTags.includes('image_edit') ? 'IMAGE_EDIT' : 'IMAGE_GENERATE';
  return { kind, confidence: decision.confidence, source };
}

/**
 * The published chain with the classifier's measured-best models first (relative order
 * otherwise kept). `order` is renumbered because the coordinator walks by it.
 */
export function preferTurnIntentModels(
  chain: readonly RouterChainEntryInput[],
  preferred: readonly string[] = TURN_INTENT_PREFERRED_MODEL_IDS,
): RouterChainEntryInput[] {
  const rank = (entry: RouterChainEntryInput): number => {
    const index = preferred.indexOf(entry.providerModelId);
    return index === -1 ? preferred.length : index;
  };
  return [...chain]
    .sort((left, right) => rank(left) - rank(right) || left.order - right.order)
    .map((entry, index) => ({ ...entry, order: index + 1 }));
}
