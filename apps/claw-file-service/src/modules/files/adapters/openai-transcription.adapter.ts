import { Logger } from '@nestjs/common';
import { declaredHost, httpPost } from '@claw/shared-utilities';
import { TRANSCRIPTION_PROVIDER_TIMEOUT_MS } from '../constants/transcription.constants';
import {
  type OpenAiTranscriptionResponse,
  type TranscriptionProviderResult,
} from '../types/transcription.types';
import {
  audioFilenameForMimeType,
  normalizeBaseUrl,
} from '../utilities/transcription-format.utility';

const logger = new Logger('OpenAiTranscriptionAdapter');

/**
 * Transcribes audio with OpenAI's `/audio/transcriptions` (Whisper).
 *
 * `model` is a parameter rather than a constant so the signature matches every
 * other adapter, but note what the caller passes: OPENAI_TRANSCRIPTION_MODEL,
 * not the routed modelKey. The connector snapshot only ever lists CHAT
 * deployments, and sending one of those to this endpoint is a 400.
 *
 * `response_format: verbose_json` rather than `json`: whisper reports no token
 * usage, and verbose_json's `duration` (seconds of input audio) is the MEASURED
 * unit the PAYG finalize settles on (rule 37 item 17). There is no output-token
 * parameter on this endpoint, so the hold's ceiling has nowhere to land.
 */
export const transcribeWithOpenAi = async (
  baseUrl: string,
  apiKey: string,
  base64: string,
  mimeType: string,
  model: string,
  signal?: AbortSignal,
): Promise<TranscriptionProviderResult> => {
  const base = normalizeBaseUrl(baseUrl);
  const url = `${base}/audio/transcriptions`;
  logger.debug(`transcribeWithOpenAi: model=${model} mimeType=${mimeType}`);

  const form = new FormData();
  const audio = new Blob([Buffer.from(base64, 'base64')], { type: mimeType });
  form.append('file', audio, audioFilenameForMimeType(mimeType));
  form.append('model', model);
  form.append('response_format', 'verbose_json');

  const response = await httpPost<OpenAiTranscriptionResponse>(
    url,
    form,
    {
      // No explicit Content-Type: axios must set the multipart boundary itself,
      // and a hand-written header without one makes the API reject the body.
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: TRANSCRIPTION_PROVIDER_TIMEOUT_MS,
      // A video cancel aborts the in-flight request (axios CanceledError).
      signal,
    },
    declaredHost(base),
  );

  const transcript = (response.text ?? '').trim();
  logger.debug(
    `transcribeWithOpenAi: received ${String(transcript.length)} characters, duration=${String(response.duration ?? 'absent')}`,
  );
  // verbose_json always carries `segments`; they are what gives a video's
  // transcript its timestamps. Seconds → whole ms, empty lines dropped.
  const segments = (response.segments ?? [])
    .map((segment) => ({
      startMs: Math.round((segment.start ?? 0) * 1000),
      endMs: Math.round((segment.end ?? segment.start ?? 0) * 1000),
      text: (segment.text ?? '').trim(),
    }))
    .filter((segment) => segment.text.length > 0);
  return {
    text: transcript,
    durationSeconds: response.duration,
    ...(segments.length > 0 ? { segments } : {}),
  };
};
