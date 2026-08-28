import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  CLOUD_VISION_ANNOTATE_URL,
  CLOUD_VISION_SAFE_SEARCH_FEATURE,
  IMAGE_SAFETY_SCAN_TIMEOUT_MS,
} from '../constants/image-safety.constants';
import type { SafeSearchAnnotation } from '../types/image-safety.types';

/**
 * Google Cloud Vision SafeSearch, used to moderate images in a published share.
 *
 * A purpose-built moderation control rather than a model asked to guess: what
 * hangs on the answer is whether ClawAI serves advertising beside the image, and
 * an ad account is not something to stake on a heuristic.
 *
 * Only SafeSearch is requested — no labels, no text detection, no face
 * detection. That is the narrowest question which answers "may this carry an
 * ad", so a user's shared image is not incidentally run through a
 * general-purpose analysis pipeline.
 */
@Injectable()
export class CloudVisionClient {
  private readonly logger = new Logger(CloudVisionClient.name);

  /** False when no key is configured, so callers can skip the fetch entirely. */
  isConfigured(): boolean {
    return AppConfig.get().GOOGLE_CLOUD_VISION_API_KEY.length > 0;
  }

  /**
   * Classifies one image.
   *
   * Returns null for every failure — no key, a transport error, a non-2xx, a
   * response that does not parse. Null is NOT an approval: the caller treats it
   * as "could not scan", which leaves the share readable and off the ad
   * surfaces. Distinguishing "safe" from "unknown" is the whole point.
   */
  async classify(imageBase64: string): Promise<SafeSearchAnnotation | null> {
    const apiKey = AppConfig.get().GOOGLE_CLOUD_VISION_API_KEY;
    if (apiKey.length === 0) {
      return null;
    }

    try {
      const response = await httpRequest<{
        responses?: Array<{ safeSearchAnnotation?: SafeSearchAnnotation }>;
      }>({
        // The key travels as a query parameter because that is the only form
        // the annotate endpoint accepts for an API key. It is never logged.
        url: `${CLOUD_VISION_ANNOTATE_URL}?key=${encodeURIComponent(apiKey)}`,
        method: 'POST',
        body: {
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: CLOUD_VISION_SAFE_SEARCH_FEATURE }],
            },
          ],
        },
        timeoutMs: IMAGE_SAFETY_SCAN_TIMEOUT_MS,
      });

      if (!response.ok) {
        this.logger.warn(`classify: Cloud Vision returned status ${String(response.status)}`);
        return null;
      }
      return response.data.responses?.[0]?.safeSearchAnnotation ?? null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`classify: Cloud Vision request failed — ${message}`);
      return null;
    }
  }
}
