import { Injectable, Logger } from '@nestjs/common';
import { declaredHost } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { httpGet } from '../../../common/utilities/http.utility';
import {
  ROUTING_MODEL_VISIBILITY_PATH,
  ROUTING_MODEL_VISIBILITY_TIMEOUT_MS,
} from '../constants/model-visibility.constants';
import { type RoutingModelVisibility } from '../types/connectors.types';

/**
 * Asks routing-service whether a model has a registry row, is router-only and
 * is priced. Admin diagnostic only, never on a hot path. Any failure is `null`
 * (the diagnostic shows those gates as UNKNOWN), never an error for the admin.
 */
@Injectable()
export class RoutingVisibilityManager {
  private readonly logger = new Logger(RoutingVisibilityManager.name);

  async fetch(provider: string, modelKey: string): Promise<RoutingModelVisibility | null> {
    const config = AppConfig.get();
    const query = new URLSearchParams({ provider, model: modelKey });
    const url = `${config.ROUTING_SERVICE_URL}${ROUTING_MODEL_VISIBILITY_PATH}?${query.toString()}`;
    try {
      const response = await httpGet<RoutingModelVisibility>({
        url,
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        timeoutMs: ROUTING_MODEL_VISIBILITY_TIMEOUT_MS,
        allowedHosts: declaredHost(config.ROUTING_SERVICE_URL),
      });
      if (!response.ok) {
        this.logger.warn(`fetch: routing-service returned ${String(response.status)}`);
        return null;
      }
      return response.data;
    } catch (error: unknown) {
      this.logger.warn(`fetch: routing-service unreachable - ${(error as Error).message}`);
      return null;
    }
  }
}
