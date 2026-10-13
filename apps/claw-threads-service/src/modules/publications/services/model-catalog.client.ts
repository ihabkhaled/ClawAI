import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { MODEL_CATALOG_LOOKUP_TIMEOUT_MS } from '../constants/generation-preflight.constants';
import type { ModelRef } from '../types/generation-preflight.types';

const catalogAnswerSchema = z.object({ known: z.boolean() });

/**
 * Asks the routing service whether a provider/model exists, using the same internal lookup the
 * generation service uses for context windows. Reading the catalog never calls a model.
 */
@Injectable()
export class ModelCatalogClient {
  async isKnown({ provider, model }: ModelRef): Promise<boolean> {
    const config = AppConfig.get();
    const url = `${config.ROUTING_SERVICE_URL}/api/v1/internal/router-models/context-window/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
    assertSafeRequestUrl(url, declaredHost(config.ROUTING_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_LOOKUP_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Model catalog is unavailable');
    }
    if (!response.ok) throw new ServiceUnavailableException('Model catalog is unavailable');
    const parsed = catalogAnswerSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new ServiceUnavailableException('Model catalog response is invalid');
    return parsed.data.known;
  }
}
