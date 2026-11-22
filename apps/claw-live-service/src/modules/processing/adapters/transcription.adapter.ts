import { Injectable, Logger } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import {
  AUDIO_CHUNK_MIME,
  TRANSCRIBE_CHUNK_PATH,
  TRANSCRIBE_RETRY_DELAYS_MS,
  TRANSCRIBE_TIMEOUT_MS,
} from '../constants/processing.constants';
import { transcribeReplySchema } from '../schemas/processing.schemas';
import type { TranscribeReply } from '../types/processing.types';

/**
 * file-service `POST /api/v1/internal/files/transcribe-chunk` (platform-paid, Service
 * auth). 20 s timeout, two retries with backoff; null after the last failure so the
 * worker records a gap instead of inventing text.
 */
@Injectable()
export class TranscriptionAdapter {
  private readonly logger = new Logger(TranscriptionAdapter.name);

  async transcribe(wav: Buffer, requestId: string): Promise<TranscribeReply | null> {
    const attempts = [0, ...TRANSCRIBE_RETRY_DELAYS_MS];
    for (const [index, delay] of attempts.entries()) {
      if (delay > 0) await new Promise((done) => setTimeout(done, delay));
      const reply = await this.attempt(wav, requestId);
      if (reply) return reply;
      this.logger.warn(`transcribe-chunk attempt ${String(index + 1)} failed for ${requestId}`);
    }
    return null;
  }

  private async attempt(wav: Buffer, requestId: string): Promise<TranscribeReply | null> {
    const app = AppConfig.get();
    const url = `${app.FILE_SERVICE_URL}${TRANSCRIBE_CHUNK_PATH}`;
    assertSafeRequestUrl(url, declaredHost(app.FILE_SERVICE_URL));
    try {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'content-type': 'application/json',
          Authorization: `Service ${app.INTER_SERVICE_AUTH_TOKEN}`,
          'x-request-id': requestId,
        },
        body: JSON.stringify({
          contentBase64: wav.toString('base64'),
          mimeType: AUDIO_CHUNK_MIME,
          requestId,
        }),
        signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const parsed = transcribeReplySchema.safeParse(await response.json().catch(() => null));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
