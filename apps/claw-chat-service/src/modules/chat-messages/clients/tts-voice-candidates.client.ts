import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  TTS_VOICE_CANDIDATES_PATH,
  TTS_VOICE_CANDIDATES_TIMEOUT_MS,
  TTS_VOICE_CANDIDATES_TTL_MS,
} from '../constants/speech.constants';
import type { CachedTtsVoiceCandidates, TtsVoiceCandidateWire } from '../types/speech.types';

/**
 * The admin's ordered TTS_VOICE models from routing-service ("Read aloud",
 * multimodal batch 9), cached for a minute — the same shape as
 * `VisionHelperCandidatesClient`. An unreachable routing-service reuses the
 * last list; one never reached yields an empty list, which means "no voice":
 * the control is dimmed and the endpoint answers 503 TTS_UNAVAILABLE.
 */
@Injectable()
export class TtsVoiceCandidatesClient {
  private readonly logger = new Logger(TtsVoiceCandidatesClient.name);
  private cached: CachedTtsVoiceCandidates | null = null;

  async resolve(now: () => number = Date.now): Promise<readonly TtsVoiceCandidateWire[]> {
    if (this.cached !== null && this.cached.expiresAt > now()) {
      return this.cached.candidates;
    }
    try {
      const response = await httpRequest<readonly TtsVoiceCandidateWire[]>({
        url: `${AppConfig.get().ROUTING_SERVICE_URL}${TTS_VOICE_CANDIDATES_PATH}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: TTS_VOICE_CANDIDATES_TIMEOUT_MS,
      });
      if (!response.ok || !Array.isArray(response.data)) {
        this.logger.warn(`resolve: routing-service returned ${String(response.status)}`);
        return this.cached?.candidates ?? [];
      }
      this.cached = { candidates: response.data, expiresAt: now() + TTS_VOICE_CANDIDATES_TTL_MS };
      return response.data;
    } catch (error: unknown) {
      this.logger.warn(`resolve: ${error instanceof Error ? error.message : String(error)}`);
      return this.cached?.candidates ?? [];
    }
  }
}
