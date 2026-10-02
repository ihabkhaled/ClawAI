import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  PROVIDER_MODEL_UNAVAILABLE_RECORD_PATH,
  PROVIDER_MODEL_UNAVAILABLE_RECORD_TIMEOUT_MS,
} from '../constants/provider-model-unavailable.constants';

/**
 * Tells connector-service a provider answered "this model does not exist"
 * (ADR-151). connector-service counts consecutive reports and retires the row
 * after a few, so a model the provider still lists but no longer serves stops
 * being offered to users. Best effort: a failed report is logged, never thrown.
 */
@Injectable()
export class ModelUnavailableClient {
  private readonly logger = new Logger(ModelUnavailableClient.name);

  async record(provider: string, model: string): Promise<void> {
    try {
      await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${PROVIDER_MODEL_UNAVAILABLE_RECORD_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { provider, model },
        timeoutMs: PROVIDER_MODEL_UNAVAILABLE_RECORD_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`record: ${provider}/${model} unavailability not reported (${reason})`);
    }
  }
}
