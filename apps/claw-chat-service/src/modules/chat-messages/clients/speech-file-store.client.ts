import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import type { HttpResponse } from '../../../common/types';
import { BusinessException } from '../../../common/errors';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  SPEECH_FILE_STATE_PATH,
  SPEECH_FILE_STATE_TIMEOUT_MS,
  SPEECH_FILE_STORE_PATH,
  TTS_FAILED_CODE,
  TTS_FAILED_MESSAGE,
} from '../constants/speech.constants';
import type { StoreSpeechFileInput } from '../types/speech.types';

/**
 * Where a synthesised reply lives: an ordinary file owned by the message's
 * owner in file-service (`POST /internal/files/store-generated-audio`), so a
 * replay is free and a download follows file ownership. Stored COMPLETED with
 * the spoken text; file-service never transcribes it.
 */
@Injectable()
export class SpeechFileStoreClient {
  private readonly logger = new Logger(SpeechFileStoreClient.name);

  /**
   * Called AFTER a paid synthesis whose hold is already finalized. Every
   * failure, including running out of `input.timeoutMs` (cut from the
   * request's end-to-end deadline), is the service's own TTS_FAILED: 504 for
   * the timeout, 502 otherwise. Never a raw error, never nginx's 504.
   */
  async store(input: StoreSpeechFileInput): Promise<string> {
    const response = await this.post(input);
    const fileId = response.ok ? response.data.fileId : undefined;
    if (fileId === undefined || fileId.length === 0) {
      this.logger.error(
        `store: file-service refused the audio — status ${String(response.status)}`,
      );
      throw new BusinessException(TTS_FAILED_MESSAGE, TTS_FAILED_CODE, HttpStatus.BAD_GATEWAY);
    }
    return fileId;
  }

  private async post(input: StoreSpeechFileInput): Promise<HttpResponse<{ fileId?: string }>> {
    try {
      return await httpRequest<{ fileId?: string }>({
        url: `${AppConfig.get().FILE_SERVICE_URL}${SPEECH_FILE_STORE_PATH}`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: {
          userId: input.userId,
          filename: input.filename,
          mimeType: input.mimeType,
          base64Data: input.bytes.toString('base64'),
          transcript: input.transcript,
        },
        timeoutMs: input.timeoutMs,
      });
    } catch (error: unknown) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      this.logger.error(
        `store: file-service ${timedOut ? 'timed out' : 'unreachable'} after a paid synthesis (timeoutMs=${String(input.timeoutMs)})`,
      );
      throw new BusinessException(
        TTS_FAILED_MESSAGE,
        TTS_FAILED_CODE,
        timedOut ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Whether a stored reply is still there for its owner: true / false, or
   * null when file-service could not say. The caller replays on null — an
   * outage must not turn a free replay into a second charge.
   */
  async exists(fileId: string, userId: string): Promise<boolean | null> {
    try {
      const path = SPEECH_FILE_STATE_PATH.replace('{FILE_ID}', encodeURIComponent(fileId));
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().FILE_SERVICE_URL}${path}?userId=${encodeURIComponent(userId)}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SPEECH_FILE_STATE_TIMEOUT_MS,
      });
      if (response.ok) {
        return true;
      }
      return response.status === 404 ? false : null;
    } catch {
      return null;
    }
  }
}
