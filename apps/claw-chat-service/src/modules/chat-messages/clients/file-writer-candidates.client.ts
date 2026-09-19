import { Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  FILE_WRITER_CANDIDATES_PATH,
  FILE_WRITER_CANDIDATES_TIMEOUT_MS,
  FILE_WRITER_CANDIDATES_TTL_MS,
} from '../constants/file-writer.constants';
import type { CachedFileWriterCandidates, FileWriterCandidate } from '../types/file-writer.types';

/**
 * The admin's ordered FILE_WRITER models from routing-service, cached for a
 * minute. An unreachable routing-service reuses the last list rather than
 * failing every file request on a blip.
 */
export class FileWriterCandidatesClient {
  private readonly logger = new Logger(FileWriterCandidatesClient.name);
  private cached: CachedFileWriterCandidates | null = null;

  async resolve(now: () => number = Date.now): Promise<readonly FileWriterCandidate[]> {
    if (this.cached !== null && this.cached.expiresAt > now()) {
      return this.cached.candidates;
    }
    try {
      const response = await httpRequest<readonly FileWriterCandidate[]>({
        url: `${AppConfig.get().ROUTING_SERVICE_URL}${FILE_WRITER_CANDIDATES_PATH}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: FILE_WRITER_CANDIDATES_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`resolve: routing-service returned ${String(response.status)}`);
        return this.cached?.candidates ?? [];
      }
      this.cached = { candidates: response.data, expiresAt: now() + FILE_WRITER_CANDIDATES_TTL_MS };
      return response.data;
    } catch (error) {
      this.logger.warn(`resolve: ${(error as Error).message}`);
      return this.cached?.candidates ?? [];
    }
  }
}
