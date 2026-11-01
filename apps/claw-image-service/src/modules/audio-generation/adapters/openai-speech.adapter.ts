import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { AudioFailureCode } from '../../../common/enums';
import {
  AUDIO_MIME_MP3,
  AUDIO_MIME_WAV,
  AUDIO_REQUEST_TIMEOUT_MS,
} from '../constants/audio-generation.constants';
import type {
  AudioProviderConfig,
  AudioProviderResult,
  AudioSynthesisRequest,
} from '../types/audio-generation.types';
import { audioFailure, toAudioProviderException } from '../utilities/audio-provider-error.utility';
import { audioPriceKey, openAiAuthHeaders, openAiBase } from '../utilities/audio-wire.utility';

const logger = new Logger('OpenAiSpeechAdapter');

/**
 * OpenAI `POST /audio/speech`: one synchronous call that answers with the audio bytes
 * and no usage, so the caller settles on the characters it sent. mp3 or wav only,
 * the two containers file-service stores.
 */
export const synthesizeOpenAiSpeech = async (
  config: AudioProviderConfig,
  request: AudioSynthesisRequest,
): Promise<AudioProviderResult> => {
  const base = openAiBase(config);
  const model = audioPriceKey(request.model);
  const wav = request.format === 'wav';
  logger.log(`synthesize: model=${model} characters=${String(request.prompt.length)}`);
  try {
    const data = await httpPost<ArrayBuffer>(
      `${base}/audio/speech`,
      {
        model,
        input: request.prompt,
        voice: request.voice,
        response_format: wav ? 'wav' : 'mp3',
      },
      {
        headers: openAiAuthHeaders(config),
        timeout: AUDIO_REQUEST_TIMEOUT_MS,
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
      },
      declaredHost(base),
    );
    const bytes = Buffer.from(data);
    if (bytes.length === 0) {
      throw audioFailure(AudioFailureCode.NO_AUDIO_RETURNED, 'OpenAI returned an empty file');
    }
    return {
      bytes,
      mimeType: wav ? AUDIO_MIME_WAV : AUDIO_MIME_MP3,
      durationSeconds: null,
      usage: null,
    };
  } catch (error: unknown) {
    throw toAudioProviderException(error, 'OpenAI');
  }
};
