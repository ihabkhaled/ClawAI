import { Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { httpPost } from '@common/utilities';

import { AudioFailureCode } from '../../../common/enums';
import {
  AUDIO_MIME_WAV,
  AUDIO_REQUEST_TIMEOUT_MS,
  GEMINI_TTS_CHANNELS,
} from '../constants/audio-generation.constants';
import type {
  AudioProviderConfig,
  AudioProviderResult,
  AudioSynthesisRequest,
  GeminiSpeechResponse,
} from '../types/audio-generation.types';
import { audioFailure, toAudioProviderException } from '../utilities/audio-provider-error.utility';
import { audioPriceKey, geminiAuthHeaders, geminiBase } from '../utilities/audio-wire.utility';
import { pcm16ToWav, pcmDurationSeconds, pcmSampleRate } from '../utilities/audio-wav.utility';

const logger = new Logger('GeminiSpeechAdapter');

/**
 * Gemini TTS through `generateContent` with the AUDIO response modality. The answer is
 * base64 16-bit PCM (`audio/L16;codec=pcm;rate=24000`) plus `usageMetadata`; it is
 * wrapped in a WAV header so a browser and file-service accept it. The container is
 * always WAV whatever format was asked for, and the stored mime type says so.
 */
export const synthesizeGeminiSpeech = async (
  config: AudioProviderConfig,
  request: AudioSynthesisRequest,
): Promise<AudioProviderResult> => {
  const base = geminiBase(config);
  const model = audioPriceKey(request.model);
  logger.log(`synthesize: model=${model} characters=${String(request.prompt.length)}`);
  let response: GeminiSpeechResponse;
  try {
    response = await httpPost<GeminiSpeechResponse>(
      `${base}/models/${encodeURIComponent(model)}:generateContent`,
      {
        contents: [{ parts: [{ text: request.prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          ...(request.maxOutputTokens === undefined
            ? {}
            : { maxOutputTokens: request.maxOutputTokens }),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: request.voice } },
          },
        },
      },
      { headers: geminiAuthHeaders(config), timeout: AUDIO_REQUEST_TIMEOUT_MS },
      declaredHost(base),
    );
  } catch (error: unknown) {
    throw toAudioProviderException(error, 'Gemini');
  }
  const inline = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.data !== undefined && part.inlineData.data.length > 0,
  )?.inlineData;
  if (inline?.data === undefined) {
    const blocked = response.promptFeedback?.blockReason;
    throw audioFailure(
      blocked === undefined
        ? AudioFailureCode.NO_AUDIO_RETURNED
        : AudioFailureCode.CONTENT_REJECTED,
      blocked ?? 'Gemini returned no audio',
    );
  }
  const pcm = Buffer.from(inline.data, 'base64');
  const rate = pcmSampleRate(inline.mimeType ?? '');
  const usage = response.usageMetadata;
  return {
    bytes: pcm16ToWav(pcm, rate, GEMINI_TTS_CHANNELS),
    mimeType: AUDIO_MIME_WAV,
    durationSeconds: pcmDurationSeconds(pcm.length, rate, GEMINI_TTS_CHANNELS),
    usage:
      usage?.promptTokenCount === undefined || usage.candidatesTokenCount === undefined
        ? null
        : { promptTokens: usage.promptTokenCount, completionTokens: usage.candidatesTokenCount },
  };
};
