import { Injectable, Logger } from '@nestjs/common';

import { httpGet } from '../../../../common/utilities/http.utility';
import { ConnectorStatus, ModelLifecycle } from '../../../../generated/prisma';
import {
  LLAMACPP_CATALOG_PATH,
  LLAMACPP_DEFAULT_BASE_URL,
  LLAMACPP_HEALTH_PATH,
  LLAMACPP_SYNC_PAGE_LIMIT,
} from '../../constants/llamacpp.constants';
import { type HealthCheckResult, type NormalizedModel } from '../../types/connectors.types';
import {
  type LlamacppCatalogEntryDto,
  type LlamacppCatalogResponse,
  type LlamacppHealthResponse,
} from '../../types/llamacpp-api.types';
import {
  type ConnectorConfig,
  type ProviderAdapter,
  type ProviderCapabilities,
} from '../provider-adapter.interface';

@Injectable()
export class LlamacppAdapter implements ProviderAdapter {
  private readonly logger = new Logger(LlamacppAdapter.name);

  async healthCheck(config: ConnectorConfig): Promise<HealthCheckResult> {
    const baseUrl = this.resolveBaseUrl(config.baseUrl);
    this.logger.debug(`healthCheck: probing ${baseUrl}${LLAMACPP_HEALTH_PATH}`);
    const start = Date.now();
    try {
      const response = await httpGet<LlamacppHealthResponse>({
        url: `${baseUrl}${LLAMACPP_HEALTH_PATH}`,
      });
      const latencyMs = Date.now() - start;
      if (!response.ok) {
        return {
          status: ConnectorStatus.DOWN,
          latencyMs,
          errorMessage: `llamacpp returned status ${String(response.status)}`,
        };
      }
      if (response.data.binary?.installed !== true) {
        return {
          status: ConnectorStatus.DEGRADED,
          latencyMs,
          errorMessage: 'llamacpp binary not yet installed',
        };
      }
      return { status: ConnectorStatus.HEALTHY, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`healthCheck: failed — ${errorMessage}`);
      return { status: ConnectorStatus.DOWN, latencyMs, errorMessage };
    }
  }

  async syncModels(config: ConnectorConfig): Promise<NormalizedModel[]> {
    const baseUrl = this.resolveBaseUrl(config.baseUrl);
    this.logger.log(`syncModels: fetching frontier catalog from ${baseUrl}`);
    try {
      const response = await httpGet<LlamacppCatalogResponse>({
        url: `${baseUrl}${LLAMACPP_CATALOG_PATH}?limit=${String(LLAMACPP_SYNC_PAGE_LIMIT)}&downloadStatus=READY`,
      });
      if (!response.ok) {
        this.logger.warn(`syncModels: status=${String(response.status)} — empty result`);
        return [];
      }
      const rows = response.data.rows ?? [];
      return rows.map((entry) => this.toNormalizedModel(entry));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`syncModels: failed — ${msg}`);
      return [];
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsTools: false,
      supportsVision: false,
    };
  }

  private resolveBaseUrl(configured: string | undefined): string {
    const trimmed = configured?.trim();
    if (trimmed === undefined || trimmed.length === 0) {
      return LLAMACPP_DEFAULT_BASE_URL;
    }
    return trimmed.replace(/\/+$/, '');
  }

  private toNormalizedModel(entry: LlamacppCatalogEntryDto): NormalizedModel {
    const modelKey = `${entry.name}:${entry.tag}`;
    const supportsVision = (entry.capabilities ?? []).some(
      (capability) => capability.toLowerCase() === 'vision',
    );
    const supportsTools = (entry.capabilities ?? []).some(
      (capability) => capability.toLowerCase() === 'tool_use' || capability.toLowerCase() === 'tools',
    );
    return {
      modelKey,
      displayName: entry.displayName,
      lifecycle: ModelLifecycle.ACTIVE,
      capabilities: {
        supportsStreaming: true,
        supportsTools,
        supportsVision,
        supportsAudio: false,
        supportsStructuredOutput: false,
        maxContextTokens: entry.contextLength,
      },
    };
  }
}
