import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { AudioFailureCode } from '../../../common/enums';
import {
  AUDIO_MIME_MP3,
  AUDIO_MIME_WAV,
  AUDIO_REQUEST_TIMEOUT_MS,
  LYRIA_CLIP_MODEL_MARKER,
  LYRIA_CLIP_SECONDS,
} from '../constants/audio-generation.constants';
import type {
  AudioProviderConfig,
  AudioProviderResult,
  AudioSynthesisRequest,
  LyriaInteractionResponse,
} from '../types/audio-generation.types';
import { audioFailure, toAudioProviderException } from '../utilities/audio-provider-error.utility';
import { audioPriceKey, geminiAuthHeaders, geminiBase } from '../utilities/audio-wire.utility';
import { looksLikeWav } from '../utilities/audio-wav.utility';

const logger = new Logger('GeminiLyriaAdapter');

/**
 * Lyria 3 music through the Gemini API Interactions endpoint (`POST /interactions`,
 * https://ai.google.dev/gemini-api/docs/music-generation). Not `generateContent`.
 * The reply is `steps[]`; the audio is the base64 `data` of a `type: audio` block in a
 * `model_output` step. Default container MP3 at 44.1 kHz stereo; `lyria-3.5` can return
 * WAV when `response_format.type` is `audio`. Lyria 3 Clip is always 30 seconds. The
 * docs do not state the audio mime type, so the container is read from the bytes.
 */
export const synthesizeLyria = async (
  config: AudioProviderConfig,
  request: AudioSynthesisRequest,
): Promise<AudioProviderResult> => {
  const base = geminiBase(config);
  const model = audioPriceKey(request.model);
  const clip = model.includes(LYRIA_CLIP_MODEL_MARKER);
  logger.log(`synthesize: model=${model} characters=${String(request.prompt.length)}`);
  let response: LyriaInteractionResponse;
  try {
    response = await httpPost<LyriaInteractionResponse>(
      `${base}/interactions`,
      {
        model,
        input: request.prompt,
        ...(!clip && request.format === 'wav' ? { response_format: { type: 'audio' } } : {}),
      },
      { headers: geminiAuthHeaders(config), timeout: AUDIO_REQUEST_TIMEOUT_MS },
      declaredHost(base),
    );
  } catch (error: unknown) {
    throw toAudioProviderException(error, 'Gemini');
  }
  const block = (response.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .find((part) => part.type === 'audio' && part.data !== undefined && part.data.length > 0);
  if (block?.data === undefined) {
    throw audioFailure(AudioFailureCode.NO_AUDIO_RETURNED, 'Gemini returned no music');
  }
  const bytes = Buffer.from(block.data, 'base64');
  return {
    bytes,
    mimeType: looksLikeWav(bytes) ? AUDIO_MIME_WAV : AUDIO_MIME_MP3,
    durationSeconds: clip ? LYRIA_CLIP_SECONDS : null,
    usage: null,
  };
};
