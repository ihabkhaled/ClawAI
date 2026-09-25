import { Logger } from '@nestjs/common';
import { declaredHost, extractGeminiUsage, httpPost } from '@claw/shared-utilities';
import {
  TRANSCRIPTION_INSTRUCTION,
  TRANSCRIPTION_PROVIDER_TIMEOUT_MS,
} from '../constants/transcription.constants';
import {
  type GeminiGenerateContentResponse,
  type TranscriptionProviderResult,
} from '../types/transcription.types';
import {
  stripGeminiModelsPrefix,
  toGeminiNativeBaseUrl,
} from '../utilities/transcription-format.utility';
import {
  buildGeminiGenerationConfig,
  geminiResponseFailure,
  readGeminiResponse,
} from '../utilities/gemini-transcription-response.utility';

const logger = new Logger('GeminiTranscriptionAdapter');

/**
 * Transcribes audio with Gemini's native `generateContent`, sending the bytes
 * inline.
 *
 * Returns the transcript text and the token usage Gemini REPORTED in
 * `usageMetadata` — the measured quantity the PAYG finalize settles on (rule 37
 * item 17). `usage` is left undefined when Gemini sent no `usageMetadata`, so
 * the caller falls back to the reserved estimate rather than to $0.
 *
 * `maxOutputTokens` is the GRANTED ceiling from the PAYG hold (rule 37 item 2),
 * never the one the caller asked for. It rides in one `generationConfig` with
 * `temperature: 0` and, for models that accept it, `thinkingBudget: 0`
 * (`buildGeminiGenerationConfig`) — Gemini 2.5 counts thinking tokens inside
 * the ceiling, and thinking buys nothing for a verbatim transcript.
 *
 * Only non-`thought` parts are transcript text. THROWS a
 * `TranscriptionResponseError` when the 200 is not a transcript — blocked
 * (SAFETY, RECITATION, promptFeedback.blockReason, …), cut off at MAX_TOKENS,
 * or reasoning-only — so the caller records the precise reason instead of
 * "empty transcript". A plainly empty answer is returned as '' and the
 * manager's own empty check handles it. Never logs transcript text.
 */
export const transcribeWithGemini = async (
  baseUrl: string,
  apiKey: string,
  base64: string,
  mimeType: string,
  model: string,
  maxOutputTokens?: number,
  instruction: string = TRANSCRIPTION_INSTRUCTION,
): Promise<TranscriptionProviderResult> => {
  const nativeBase = toGeminiNativeBaseUrl(baseUrl);
  // `model` is the connector catalog's key, which already carries a `models/`
  // prefix — the URL below has its own literal `/models/` segment, so the
  // prefix must come off here or the request 400s. See
  // stripGeminiModelsPrefix's doc comment for the live repro.
  const url = `${nativeBase}/models/${encodeURIComponent(stripGeminiModelsPrefix(model))}:generateContent`;
  logger.debug(`transcribeWithGemini: model=${model} mimeType=${mimeType}`);

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          // Plain text for an audio upload; `[mm:ss]` lines for a video's
          // track (VIDEO_TRANSCRIPTION_INSTRUCTION), parsed by the caller.
          { text: instruction },
          // snake_case is the native REST wire format. camelCase `inlineData`
          // is the SDK's spelling and is silently ignored over plain HTTP,
          // which reads back as "the model did not hear any audio".
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: buildGeminiGenerationConfig(model, maxOutputTokens),
  };

  const response = await httpPost<GeminiGenerateContentResponse>(
    url,
    body,
    {
      // Header, never a query parameter: a key in the URL lands in every access
      // log and proxy trace between here and Google.
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: TRANSCRIPTION_PROVIDER_TIMEOUT_MS,
    },
    declaredHost(nativeBase),
  );

  const reading = readGeminiResponse(response);
  const reported = response.usageMetadata === undefined ? undefined : extractGeminiUsage(response);
  const usageText =
    reported === undefined
      ? 'no usageMetadata'
      : `prompt=${String(reported.promptTokens)} completion=${String(reported.completionTokens)} reasoning=${String(reported.reasoningTokens)}`;
  const finishReason = reading.finishReason ?? 'none';
  // Counts and reasons only — the transcript itself never reaches a log line.
  logger.debug(
    `transcribeWithGemini: model=${model} received ${String(reading.text.length)} characters finishReason=${finishReason} thoughtChars=${String(reading.thoughtCharacters)} ${usageText}`,
  );
  const failure = geminiResponseFailure(reading);
  if (failure !== null) {
    logger.warn(
      `transcribeWithGemini: model=${model} issue=${failure.issue} finishReason=${finishReason} blockReason=${reading.blockReason ?? 'none'} — ${failure.message}`,
    );
    throw failure;
  }
  return reported === undefined
    ? { text: reading.text }
    : {
        text: reading.text,
        usage: {
          promptTokens: reported.promptTokens,
          completionTokens: reported.completionTokens,
          cachedPromptTokens: reported.cachedPromptTokens,
          reasoningTokens: reported.reasoningTokens,
        },
      };
};
