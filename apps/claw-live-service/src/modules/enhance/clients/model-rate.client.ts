import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { declaredHost, httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { MODEL_RATE_PATH_PREFIX, MODEL_RATE_TIMEOUT_MS } from '../constants/enhance.constants';
import { rateResponseSchema } from '../schemas/enhance.schema';
import type { ModelRates, ModelRef } from '../types/enhance.types';
import { routingServiceUrl } from '../utilities/enhance-config.utility';

/**
 * Token rates of the model the user picked, from routing-service. FAILS CLOSED: an unreachable
 * routing-service, a bad shape or an unpriced model is `null`, and the caller refuses the call.
 */
@Injectable()
export class ModelRateClient {
  private readonly logger = new Logger(ModelRateClient.name);

  async findRates(ref: ModelRef): Promise<ModelRates | null> {
    const base = routingServiceUrl();
    if (base === null) {
      this.logger.error('findRates: ROUTING_SERVICE_URL is not configured - failing closed');
      return null;
    }
    const url = `${base}${MODEL_RATE_PATH_PREFIX}/${encodeURIComponent(ref.provider)}/${encodeURIComponent(ref.model)}`;
    try {
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: MODEL_RATE_TIMEOUT_MS,
        allowedHosts: declaredHost(base),
      });
      const parsed = rateResponseSchema.safeParse(response.data);
      return !response.ok || !parsed.success || !parsed.data.isPriced ? null : parsed.data;
    } catch (error) {
      this.logger.warn(`findRates: routing unreachable - ${(error as Error).message}`);
      return null;
    }
  }
}
