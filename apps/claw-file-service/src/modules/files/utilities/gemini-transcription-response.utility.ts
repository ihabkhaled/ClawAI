import { TranscriptionResponseIssue } from '../../../common/enums';
import { TranscriptionResponseError } from '../../../common/errors';
import {
  GEMINI_BLOCKED_FINISH_REASONS,
  GEMINI_FINISH_REASON_MAX_TOKENS,
  GEMINI_THINKING_BUDGET_OFF,
  GEMINI_THINKING_OFF_MODEL_PREFIXES,
  GEMINI_TRANSCRIPTION_TEMPERATURE,
  TRANSCRIPTION_BLOCKED_ERROR_PREFIX,
  TRANSCRIPTION_THOUGHT_ONLY_ERROR,
  TRANSCRIPTION_TRUNCATED_ERROR,
} from '../constants/transcription.constants';
import {
  type GeminiGenerateContentResponse,
  type GeminiGenerationConfig,
  type GeminiResponseReading,
} from '../types/transcription.types';
import { stripGeminiModelsPrefix } from './transcription-format.utility';

/**
 * Whether `model` accepts `thinkingBudget: 0`. Allow-list, not deny-list: 2.5
 * Pro 400s on 0, and a model we do not know must not be sent a setting we
 * guessed at. Accepts the catalog's `models/`-prefixed key or a bare id.
 */
export function supportsGeminiThinkingOff(model: string): boolean {
  const bare = stripGeminiModelsPrefix(model).toLowerCase();
  return GEMINI_THINKING_OFF_MODEL_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

/**
 * The one `generationConfig` for a transcription call: temperature 0 always,
 * the GRANTED hold ceiling when there is one (rule 37 item 2), and thinking
 * off where the model allows it — so no output budget goes on reasoning.
 */
export function buildGeminiGenerationConfig(
  model: string,
  maxOutputTokens?: number,
): GeminiGenerationConfig {
  return {
    temperature: GEMINI_TRANSCRIPTION_TEMPERATURE,
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(supportsGeminiThinkingOff(model)
      ? { thinkingConfig: { thinkingBudget: GEMINI_THINKING_BUDGET_OFF } }
      : {}),
  };
}

/**
 * Reads the first candidate: joins the `text` of every part that is NOT a
 * `thought: true` part, in order, and counts (never keeps) thought text.
 */
export function readGeminiResponse(response: GeminiGenerateContentResponse): GeminiResponseReading {
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  let text = '';
  let thoughtCharacters = 0;
  for (const part of parts) {
    const partText = part.text ?? '';
    if (part.thought === true) {
      thoughtCharacters += partText.length;
    } else {
      text += partText;
    }
  }
  return {
    text: text.trim(),
    thoughtCharacters,
    ...(candidate?.finishReason === undefined ? {} : { finishReason: candidate.finishReason }),
    ...(response.promptFeedback?.blockReason === undefined
      ? {}
      : { blockReason: response.promptFeedback.blockReason }),
  };
}

/**
 * Why this 200 is NOT a transcript, or null when it is (or is plainly empty —
 * the manager owns the empty check for every provider). A block beats a
 * truncation, which beats thought-only: the most specific reason wins.
 */
export function geminiResponseFailure(
  reading: GeminiResponseReading,
): TranscriptionResponseError | null {
  const blockedBy =
    reading.blockReason ??
    (reading.finishReason !== undefined &&
    GEMINI_BLOCKED_FINISH_REASONS.includes(reading.finishReason)
      ? reading.finishReason
      : undefined);
  if (blockedBy !== undefined) {
    return new TranscriptionResponseError(
      TranscriptionResponseIssue.BLOCKED,
      `${TRANSCRIPTION_BLOCKED_ERROR_PREFIX} (${blockedBy}).`,
    );
  }
  if (reading.finishReason === GEMINI_FINISH_REASON_MAX_TOKENS) {
    return new TranscriptionResponseError(
      TranscriptionResponseIssue.TRUNCATED,
      TRANSCRIPTION_TRUNCATED_ERROR,
    );
  }
  const thoughtOnly = reading.text.length === 0 && reading.thoughtCharacters > 0;
  return thoughtOnly
    ? new TranscriptionResponseError(
        TranscriptionResponseIssue.THOUGHT_ONLY,
        TRANSCRIPTION_THOUGHT_ONLY_ERROR,
      )
    : null;
}
