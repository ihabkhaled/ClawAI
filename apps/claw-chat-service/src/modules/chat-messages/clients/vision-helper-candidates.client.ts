import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  VISION_HELPER_CANDIDATES_PATH,
  VISION_HELPER_CANDIDATES_TIMEOUT_MS,
  VISION_HELPER_CANDIDATES_TTL_MS,
} from '../constants/vision-helper.constants';
import type {
  CachedVisionHelperCandidates,
  VisionHelperCandidateWire,
} from '../types/vision-helper.types';

/**
 * The admin's ordered VISION_HELPER models from routing-service, cached for a
 * minute (same shape as `FileWriterCandidatesClient`). An unreachable
 * routing-service reuses the last list; one that was never reachable yields an
 * empty list, which means "no helper" — the lane keeps the OCR text and the
 * honest note it had before helper vision existed.
 */
@Injectable()
export class VisionHelperCandidatesClient {
  private readonly logger = new Logger(VisionHelperCandidatesClient.name);
  private cached: CachedVisionHelperCandidates | null = null;

  async resolve(now: () => number = Date.now): Promise<readonly VisionHelperCandidateWire[]> {
    if (this.cached !== null && this.cached.expiresAt > now()) {
      return this.cached.candidates;
    }
    try {
      const response = await httpRequest<readonly VisionHelperCandidateWire[]>({
        url: `${AppConfig.get().ROUTING_SERVICE_URL}${VISION_HELPER_CANDIDATES_PATH}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: VISION_HELPER_CANDIDATES_TIMEOUT_MS,
      });
      if (!response.ok || !Array.isArray(response.data)) {
        this.logger.warn(`resolve: routing-service returned ${String(response.status)}`);
        return this.cached?.candidates ?? [];
      }
      this.cached = {
        candidates: response.data,
        expiresAt: now() + VISION_HELPER_CANDIDATES_TTL_MS,
      };
      return response.data;
    } catch (error) {
      this.logger.warn(`resolve: ${(error as Error).message}`);
      return this.cached?.candidates ?? [];
    }
  }
}
