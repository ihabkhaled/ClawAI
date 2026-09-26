import { Injectable, Logger } from '@nestjs/common';
import { isSupportedTtsVoice } from '@claw/shared-constants';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  SPEECH_PREFERENCES_PATH,
  SPEECH_PREFERENCES_TIMEOUT_MS,
} from '../constants/speech.constants';
import type { SpeechPreferencesResponse, SpeechVoiceLookup } from '../types/speech.types';

/**
 * The user's "Read aloud" voice from auth-service (service token). One call
 * per read-aloud POST — never per poll. A voice that is not in the shared
 * catalog (a renamed or retired voice) reads as null: the provider defaults.
 * Unreachable → `available: false`, and the caller keeps the voice the stored
 * reading was made with, so an outage never forces a second paid reading.
 */
@Injectable()
export class SpeechPreferencesClient {
  private readonly logger = new Logger(SpeechPreferencesClient.name);

  async voiceFor(userId: string): Promise<SpeechVoiceLookup> {
    try {
      const response = await httpRequest<SpeechPreferencesResponse>({
        url: `${AppConfig.get().AUTH_SERVICE_URL}${SPEECH_PREFERENCES_PATH.replace('{USER_ID}', encodeURIComponent(userId))}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SPEECH_PREFERENCES_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`voiceFor: auth-service returned ${String(response.status)}`);
        return { voice: null, available: false };
      }
      const voice = response.data.ttsVoice ?? null;
      return {
        voice: voice !== null && isSupportedTtsVoice(voice) ? voice : null,
        available: true,
      };
    } catch (error: unknown) {
      this.logger.warn(`voiceFor: ${error instanceof Error ? error.message : String(error)}`);
      return { voice: null, available: false };
    }
  }
}
