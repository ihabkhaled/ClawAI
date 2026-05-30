import { Injectable, Logger } from '@nestjs/common';
import {
  RuntimeExecutionProfile,
  type RuntimeProbeCapabilities,
  type RuntimeProbeRecentEvent,
  type RuntimeProbeReport,
  RuntimeProbeStatus,
  RuntimeProvider,
} from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import { BinaryService } from '../../binary/services/binary.service';
import { type BinaryStatus } from '../../binary/types/binary.types';
import { ProcessSupervisorManager } from '../../models-lifecycle/managers/process-supervisor.manager';
import { LoadEventsRepository } from '../../models-lifecycle/repositories/load-events.repository';
import { type RecentLoadEvent } from '../../models-lifecycle/types/load-events.types';
import { RUNTIME_PROBE_RECENT_EVENTS_LIMIT } from '../constants/runtime-progress.constants';

@Injectable()
export class LlamacppProbeService {
  private readonly logger = new Logger(LlamacppProbeService.name);

  constructor(
    private readonly binaryService: BinaryService,
    private readonly supervisor: ProcessSupervisorManager,
    private readonly loadEvents: LoadEventsRepository,
  ) {}

  async probe(): Promise<RuntimeProbeReport> {
    this.logger.debug('probe: building runtime probe report');
    const probedAtMs = Date.now();
    const config = AppConfig.get();
    const binary = this.safeReadBinary();
    const current = this.safeReadCurrent();
    const recent = await this.safeReadRecentEvents();

    const status = this.deriveStatus(binary, current);
    const capabilities = this.buildCapabilities(config);
    const runtimeUrl = this.buildRuntimeUrl(config, current);

    const report: RuntimeProbeReport = {
      provider: RuntimeProvider.LLAMACPP,
      runtimeUrl,
      status,
      probedAtMs,
      capabilities,
      recentEvents: recent,
    };
    if (binary?.version) {
      report.version = binary.version;
    }
    if (binary?.platform) {
      report.executionProfile = this.mapExecutionProfile(binary.platform);
    }
    if (current) {
      report.activeModelId = current.modelId;
    }
    this.logger.log(
      `probe: status=${status} binaryInstalled=${String(Boolean(binary?.installed))} activeModelId=${report.activeModelId ?? '(none)'}`,
    );
    return report;
  }

  private safeReadBinary(): BinaryStatus | null {
    try {
      return this.binaryService.snapshot();
    } catch (error) {
      this.logger.error(`safeReadBinary: ${(error as Error).message}`);
      return null;
    }
  }

  private safeReadCurrent(): { modelId: string; port: number; pid: number } | null {
    try {
      const current = this.supervisor.getCurrent();
      if (!current) {
        return null;
      }
      return { modelId: current.modelId, port: current.port, pid: current.pid };
    } catch (error) {
      this.logger.error(`safeReadCurrent: ${(error as Error).message}`);
      return null;
    }
  }

  private async safeReadRecentEvents(): Promise<RuntimeProbeRecentEvent[]> {
    try {
      const rows = await this.loadEvents.findRecent(RUNTIME_PROBE_RECENT_EVENTS_LIMIT);
      return rows.map((row) => this.mapEvent(row));
    } catch (error) {
      this.logger.warn(`safeReadRecentEvents: ${(error as Error).message}`);
      return [];
    }
  }

  private mapEvent(row: RecentLoadEvent): RuntimeProbeRecentEvent {
    const event: RuntimeProbeRecentEvent = {
      atMs: row.occurredAt.getTime(),
      type: row.eventType,
      modelId: row.modelId,
      status: row.errorMessage ? 'FAILED' : 'OK',
    };
    if (row.errorMessage) {
      event.message = row.errorMessage;
    }
    return event;
  }

  private deriveStatus(
    binary: BinaryStatus | null,
    current: { modelId: string } | null,
  ): RuntimeProbeStatus {
    if (!binary?.installed) {
      return RuntimeProbeStatus.BINARY_MISSING;
    }
    if (!current) {
      return RuntimeProbeStatus.DEGRADED;
    }
    return RuntimeProbeStatus.REACHABLE;
  }

  private buildCapabilities(config: {
    LLAMACPP_REASONING_EXTRACTION_ENABLED: boolean;
  }): RuntimeProbeCapabilities {
    return {
      streamingText: true,
      thinking: config.LLAMACPP_REASONING_EXTRACTION_ENABLED,
      promptProgress: false,
      nodeProgress: false,
      stepProgress: false,
      cancel: true,
      metrics: false,
    };
  }

  private buildRuntimeUrl(
    config: { LLAMACPP_BIND_HOST: string; LLAMACPP_SERVICE_URL: string },
    current: { port: number } | null,
  ): string {
    if (current) {
      return `http://${config.LLAMACPP_BIND_HOST}:${current.port}`;
    }
    return config.LLAMACPP_SERVICE_URL;
  }

  private mapExecutionProfile(platformKey: string): RuntimeExecutionProfile {
    const lower = platformKey.toLowerCase();
    if (lower.includes('cuda')) {
      return RuntimeExecutionProfile.CUDA;
    }
    if (lower.includes('rocm')) {
      return RuntimeExecutionProfile.ROCM;
    }
    if (lower.includes('vulkan')) {
      return RuntimeExecutionProfile.VULKAN;
    }
    if (lower.includes('metal')) {
      return RuntimeExecutionProfile.METAL;
    }
    if (lower.includes('cpu')) {
      return RuntimeExecutionProfile.CPU;
    }
    return RuntimeExecutionProfile.UNKNOWN;
  }
}
