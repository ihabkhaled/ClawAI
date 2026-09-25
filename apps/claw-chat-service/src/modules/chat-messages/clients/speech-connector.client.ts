import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  SPEECH_CONNECTOR_CONFIG_PATH,
  SPEECH_CONNECTOR_STATUS_TTL_MS,
  SPEECH_CONNECTOR_TIMEOUT_MS,
} from '../constants/speech.constants';
import type { SpeechProvider } from '../../../common/enums';
import type { CachedConnectorStatus, ConnectorKeyResponse } from '../types/speech.types';

/**
 * The provider key a voice call needs, from connector-service (same endpoint
 * `ChatExecutionManager` reads). The KEY is fetched fresh per synthesis and
 * never cached; only the yes/no "is this provider configured" answer is kept
 * for a minute, because the availability endpoint is read by every chat page.
 * Never throws: an unreachable connector-service means "not configured".
 */
@Injectable()
export class SpeechConnectorClient {
  private readonly logger = new Logger(SpeechConnectorClient.name);
  private readonly status = new Map<SpeechProvider, CachedConnectorStatus>();

  async resolveApiKey(provider: SpeechProvider): Promise<string | null> {
    try {
      const response = await httpRequest<ConnectorKeyResponse>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${SPEECH_CONNECTOR_CONFIG_PATH}?provider=${encodeURIComponent(provider)}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SPEECH_CONNECTOR_TIMEOUT_MS,
      });
      const apiKey = response.ok ? response.data.apiKey?.trim() : undefined;
      return apiKey !== undefined && apiKey.length > 0 ? apiKey : null;
    } catch (error: unknown) {
      this.logger.warn(
        `resolveApiKey: provider=${provider} unreachable — ${error instanceof Error ? error.name : 'error'}`,
      );
      return null;
    }
  }

  async isConfigured(provider: SpeechProvider, now: () => number = Date.now): Promise<boolean> {
    const hit = this.status.get(provider);
    if (hit !== undefined && hit.expiresAt > now()) {
      return hit.configured;
    }
    const configured = (await this.resolveApiKey(provider)) !== null;
    this.status.set(provider, { configured, expiresAt: now() + SPEECH_CONNECTOR_STATUS_TTL_MS });
    return configured;
  }
}
