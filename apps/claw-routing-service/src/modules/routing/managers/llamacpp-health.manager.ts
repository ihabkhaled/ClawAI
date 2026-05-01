import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import {
  LLAMACPP_HEALTH_POLL_INTERVAL_MS,
  LLAMACPP_HEALTH_TIMEOUT_MS,
} from '../constants/llamacpp.constants';
import {
  type LlamacppHealthResponse,
  type LlamacppHealthState,
} from '../types/llamacpp-health.types';

@Injectable()
export class LlamacppHealthManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LlamacppHealthManager.name);
  private readonly serviceUrl: string =
    process.env['LLAMACPP_SERVICE_URL'] ?? 'http://llamacpp-service:4017';
  private state: LlamacppHealthState = {
    binaryReady: false,
    loadedModel: null,
    reachable: false,
    lastProbedAt: new Date(0).toISOString(),
  };
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.logger.log(`onModuleInit: starting LLAMACPP health probe → ${this.serviceUrl}`);
    void this.probe();
    this.timer = setInterval(() => {
      void this.probe();
    }, LLAMACPP_HEALTH_POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getState(): LlamacppHealthState {
    return { ...this.state };
  }

  isFrontierAvailable(): boolean {
    return this.state.reachable && this.state.loadedModel !== null;
  }

  async probe(): Promise<void> {
    this.logger.debug(`probe: ${this.serviceUrl}/api/v1/health`);
    try {
      const response = await httpRequest<LlamacppHealthResponse>({
        url: `${this.serviceUrl}/api/v1/health`,
        method: 'GET',
        timeoutMs: LLAMACPP_HEALTH_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.markUnreachable(`HTTP ${String(response.status)}`);
        return;
      }
      const body = response.data;
      this.state = {
        binaryReady: body.binary?.installed === true,
        loadedModel: body.activeModel
          ? {
              id: body.activeModel.id ?? '',
              name: body.activeModel.name ?? '',
              tag: body.activeModel.tag ?? '',
              loadStatus: body.activeModel.loadStatus ?? 'UNKNOWN',
              port: body.activeModel.port ?? null,
            }
          : null,
        reachable: true,
        lastProbedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.markUnreachable((error as Error).message);
    }
  }

  private markUnreachable(reason: string): void {
    this.logger.warn(`markUnreachable: ${reason}`);
    this.state = {
      binaryReady: false,
      loadedModel: null,
      reachable: false,
      lastProbedAt: new Date().toISOString(),
    };
  }
}
