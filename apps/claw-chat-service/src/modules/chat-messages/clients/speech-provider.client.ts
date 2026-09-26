import { Injectable } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';

import { SpeechProvider } from '../../../common/enums';
import { SpeechProviderError } from '../../../common/errors';
import { httpPostBinary, httpRequest } from '../../../common/utilities';
import {
  GEMINI_TTS_BASE_URL,
  GEMINI_TTS_CHANNELS,
  GEMINI_TTS_RESPONSE_MODALITY,
  OPENAI_SPEECH_URL,
  OPENAI_TTS_RESPONSE_FORMAT,
  SPEECH_MIME_MP3,
  SPEECH_MIME_WAV,
} from '../constants/speech.constants';
import type {
  GeminiSpeechResponse,
  SpeechProviderRequest,
  SynthesizedAudio,
} from '../types/speech.types';
import {
  geminiRetryDelayMs,
  isGeminiRateLimited,
  isOpenAiRateLimited,
  parseRetryDelayMs,
} from '../utilities/speech-rate-limit.utility';
import { pcm16ToWav, pcmSampleRate } from '../utilities/wav-audio.utility';

/**
 * The two text-to-speech adapters (multimodal batch 9). Each returns audio a
 * browser plays, or throws `SpeechProviderError` carrying only the status,
 * whether the deadline fired, and whether it was a rate limit (Gemini 429 /
 * RESOURCE_EXHAUSTED, OpenAI 429 that is not `insufficient_quota`) with the
 * provider's retry hint — never the text, never the key. Metering is
 * the caller's (`SpeechSynthesisManager`); this class only speaks HTTP.
 *
 * A cancelled job aborts the LOCAL request through `request.signal` (an
 * `AbortError`, reported like the deadline); the provider may still finish
 * rendering upstream — nothing here claims it stopped.
 *
 * Fixed provider hosts, not the connector's base URL: the speech endpoints
 * are not the OpenAI-compatible chat paths a connector base URL points at.
 */
@Injectable()
export class SpeechProviderClient {
  async synthesize(request: SpeechProviderRequest): Promise<SynthesizedAudio> {
    return request.candidate.provider === SpeechProvider.OPENAI
      ? this.openAi(request)
      : this.gemini(request);
  }

  /** OpenAI `/audio/speech`: MP3 bytes, no usage (settled on characters sent). */
  private async openAi(request: SpeechProviderRequest): Promise<SynthesizedAudio> {
    const response = await this.guard(() =>
      httpPostBinary({
        url: OPENAI_SPEECH_URL,
        headers: { Authorization: `Bearer ${request.apiKey}` },
        body: {
          model: request.candidate.model,
          input: request.text,
          voice: request.voice,
          response_format: OPENAI_TTS_RESPONSE_FORMAT,
        },
        timeoutMs: request.candidate.timeoutMs,
        allowedHosts: declaredHost(OPENAI_SPEECH_URL),
        signal: request.signal,
      }),
    );
    if (!response.ok && isOpenAiRateLimited(response.status, response.body)) {
      throw new SpeechProviderError(
        'OpenAI speech rate limited',
        response.status,
        false,
        true,
        parseRetryDelayMs(response.retryAfter, Date.now()),
      );
    }
    if (!response.ok || response.body.length === 0) {
      throw new SpeechProviderError('OpenAI speech returned no audio', response.status, false);
    }
    return { bytes: response.body, mimeType: SPEECH_MIME_MP3, usage: null };
  }

  /** Gemini `generateContent` with AUDIO modality: base64 PCM + usageMetadata → WAV. */
  private async gemini(request: SpeechProviderRequest): Promise<SynthesizedAudio> {
    const url = `${GEMINI_TTS_BASE_URL}/models/${encodeURIComponent(request.candidate.model)}:generateContent`;
    const response = await this.guard(() =>
      httpRequest<GeminiSpeechResponse>({
        url,
        method: 'POST',
        headers: { 'x-goog-api-key': request.apiKey },
        body: {
          contents: [{ parts: [{ text: request.text }] }],
          generationConfig: {
            responseModalities: [GEMINI_TTS_RESPONSE_MODALITY],
            maxOutputTokens: request.maxOutputTokens,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: request.voice } } },
          },
        },
        timeoutMs: request.candidate.timeoutMs,
        allowedHosts: declaredHost(GEMINI_TTS_BASE_URL),
        signal: request.signal,
      }),
    );
    if (!response.ok && isGeminiRateLimited(response.status, response.data.error)) {
      throw new SpeechProviderError(
        'Gemini speech rate limited',
        response.status,
        false,
        true,
        geminiRetryDelayMs(response.data.error),
      );
    }
    const inline = response.ok
      ? response.data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)
          ?.inlineData
      : undefined;
    if (inline?.data === undefined || inline.data.length === 0) {
      throw new SpeechProviderError('Gemini speech returned no audio', response.status, false);
    }
    const pcm = Buffer.from(inline.data, 'base64');
    const usage = response.data.usageMetadata;
    return {
      bytes: pcm16ToWav(pcm, pcmSampleRate(inline.mimeType ?? ''), GEMINI_TTS_CHANNELS),
      mimeType: SPEECH_MIME_WAV,
      usage:
        usage?.promptTokenCount === undefined || usage.candidatesTokenCount === undefined
          ? null
          : {
              promptTokens: usage.promptTokenCount,
              completionTokens: usage.candidatesTokenCount,
            },
    };
  }

  /** A network failure or the deadline becomes a `SpeechProviderError`. */
  private async guard<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error: unknown) {
      if (error instanceof SpeechProviderError) {
        throw error;
      }
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new SpeechProviderError(
        timedOut ? 'speech provider deadline' : 'speech provider unreachable',
        null,
        timedOut,
      );
    }
  }
}
