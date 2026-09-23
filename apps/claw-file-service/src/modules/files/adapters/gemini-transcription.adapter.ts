import { Logger } from '@nestjs/common';
import { declaredHost, httpPost } from '@claw/shared-utilities';
import {
  TRANSCRIPTION_INSTRUCTION,
  TRANSCRIPTION_PROVIDER_TIMEOUT_MS,
} from '../constants/transcription.constants';
import { type GeminiGenerateContentResponse } from '../types/transcription.types';
import {
  stripGeminiModelsPrefix,
  toGeminiNativeBaseUrl,
} from '../utilities/transcription-format.utility';

const logger = new Logger('GeminiTranscriptionAdapter');

/**
 * Transcribes audio with Gemini's native `generateContent`, sending the bytes
 * inline.
 *
 * Returns the transcript text; THROWS on a transport or shape failure rather
 * than returning something empty, so the caller records a real reason instead
 * of storing a provider's refusal as though it were the transcript.
 */
export const transcribeWithGemini = async (
  baseUrl: string,
  apiKey: string,
  base64: string,
  mimeType: string,
  model: string,
): Promise<string> => {
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
          { text: TRANSCRIPTION_INSTRUCTION },
          // snake_case is the native REST wire format. camelCase `inlineData`
          // is the SDK's spelling and is silently ignored over plain HTTP,
          // which reads back as "the model did not hear any audio".
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
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

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const transcript = parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  logger.debug(`transcribeWithGemini: received ${String(transcript.length)} characters`);
  return transcript;
};
