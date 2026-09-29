import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  SPEECH_CONNECTOR_CONFIG_PATH,
  SPEECH_CONNECTOR_STATUS_TTL_MS,
  SPEECH_CONNECTOR_TIMEOUT_MS,
} from '../constants/speech.constants';
import type { SpeechProvider } from '../../../common/enums';
import type {
  CachedConnectorStatus,
  ConnectorKeyResponse,
  SpeechProviderCredentials,
} from '../types/speech.types';

/**
 * The provider key (and configured base URL) a voice call needs, from connector-service (same endpoint
 * `ChatExecutionManager` reads). The KEY is fetched fresh per synthesis and
 * never cached; only the yes/no "is this provider configured" answer is kept
 * for a minute, because the availability endpoint is read by every chat page.
 * Never throws: an unreachable connector-service means "not configured".
 */
@Injectable()
export class SpeechConnectorClient {
  private readonly logger = new Logger(SpeechConnectorClient.name);
  private readonly status = new Map<SpeechProvider, CachedConnectorStatus>();

  /** The key and the connector's configured base URL (null when blank), or null when unusable. */
  async resolveCredentials(provider: SpeechProvider): Promise<SpeechProviderCredentials | null> {
    try {
      const response = await httpRequest<ConnectorKeyResponse>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${SPEECH_CONNECTOR_CONFIG_PATH}?provider=${encodeURIComponent(provider)}`,
        method: 'GET',
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: SPEECH_CONNECTOR_TIMEOUT_MS,
      });
      if (!response.ok) {
        return null;
      }
      const apiKey = response.data.apiKey?.trim() ?? '';
      if (apiKey.length === 0) {
        return null;
      }
      const baseUrl = response.data.baseUrl?.trim() ?? '';
      return { apiKey, baseUrl: baseUrl.length > 0 ? baseUrl : null };
    } catch (error: unknown) {
      this.logger.warn(
        `resolveCredentials: provider=${provider} unreachable — ${error instanceof Error ? error.name : 'error'}`,
      );
      return null;
    }
  }

  async resolveApiKey(provider: SpeechProvider): Promise<string | null> {
    return (await this.resolveCredentials(provider))?.apiKey ?? null;
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
