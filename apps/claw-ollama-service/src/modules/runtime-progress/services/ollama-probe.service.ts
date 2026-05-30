import { Injectable, Logger } from '@nestjs/common';
import {
  RuntimeExecutionProfile,
  type RuntimeProbeCapabilities,
  type RuntimeProbeModel,
  type RuntimeProbeReport,
  type RuntimeProbeSlot,
  RuntimeProbeStatus,
  RuntimeProvider,
  StreamingErrorType,
} from '@claw/shared-types';
import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { AppConfig } from '../../../app/config/app.config';
import { OLLAMA_API_TAGS, OLLAMA_API_VERSION } from '../../ollama/ollama.constants';
import { OLLAMA_API_PS, THINKING_MODEL_PREFIXES } from '../constants/runtime-probe.constants';
import { type RuntimeProbeQueryDto } from '../dto/runtime-probe-query.dto';
import {
  type OllamaPsModel,
  type OllamaPsResponse,
  type OllamaTagModel,
  type OllamaTagsResponse,
  type OllamaVersionResponse,
} from '../types/ollama-probe.types';

@Injectable()
export class OllamaProbeService {
  private readonly logger = new Logger(OllamaProbeService.name);
  private readonly runtimeUrl: string;

  constructor() {
    this.runtimeUrl = AppConfig.get().OLLAMA_BASE_URL;
  }

  async probe(query: RuntimeProbeQueryDto): Promise<RuntimeProbeReport> {
    this.logger.debug(
      `probe: probing runtime url=${this.runtimeUrl} includeModels=${String(query.includeModels)} timeoutMs=${String(query.timeoutMs)}`,
    );
    const client = this.createClient(query.timeoutMs);
    const probedAtMs = Date.now();
    const start = Date.now();
    const [versionResult, tagsResult, psResult] = await Promise.allSettled([
      this.fetchVersion(client),
      query.includeModels ? this.fetchTags(client) : Promise.resolve(null),
      this.fetchPs(client),
    ]);
    const latencyMs = Date.now() - start;
    const report = this.buildReport({
      versionResult,
      tagsResult,
      psResult,
      probedAtMs,
      latencyMs,
      includeModels: query.includeModels,
    });
    this.logger.log(
      `probe: completed status=${report.status} latencyMs=${String(latencyMs)} modelCount=${String(report.models?.length ?? 0)}`,
    );
    return report;
  }

  private createClient(timeoutMs: number): AxiosInstance {
    return createHttpClient({ baseURL: this.runtimeUrl, timeout: timeoutMs });
  }

  private async fetchVersion(client: AxiosInstance): Promise<OllamaVersionResponse> {
    const response = await client.get<OllamaVersionResponse>(OLLAMA_API_VERSION);
    return response.data;
  }

  private async fetchTags(client: AxiosInstance): Promise<OllamaTagsResponse> {
    const response = await client.get<OllamaTagsResponse>(OLLAMA_API_TAGS);
    return response.data;
  }

  private async fetchPs(client: AxiosInstance): Promise<OllamaPsResponse> {
    const response = await client.get<OllamaPsResponse>(OLLAMA_API_PS);
    return response.data;
  }

  private buildReport(params: {
    versionResult: PromiseSettledResult<OllamaVersionResponse>;
    tagsResult: PromiseSettledResult<OllamaTagsResponse | null>;
    psResult: PromiseSettledResult<OllamaPsResponse>;
    probedAtMs: number;
    latencyMs: number;
    includeModels: boolean;
  }): RuntimeProbeReport {
    const { versionResult, tagsResult, psResult, probedAtMs, latencyMs, includeModels } = params;
    const status = this.resolveStatus(versionResult, tagsResult, psResult, includeModels);
    const base: RuntimeProbeReport = {
      provider: RuntimeProvider.OLLAMA,
      runtimeUrl: this.runtimeUrl,
      status,
      probedAtMs,
      latencyMs,
      executionProfile: RuntimeExecutionProfile.UNKNOWN,
      capabilities: this.buildCapabilities(tagsResult, psResult),
    };
    if (status === RuntimeProbeStatus.UNREACHABLE) {
      return {
        ...base,
        errorType: StreamingErrorType.RUNTIME_UNREACHABLE,
        errorMessage: this.extractErrorMessage(versionResult),
      };
    }
    return {
      ...base,
      version: this.extractVersion(versionResult),
      models: this.extractModels(tagsResult),
      slots: this.extractSlots(psResult),
    };
  }

  private resolveStatus(
    versionResult: PromiseSettledResult<OllamaVersionResponse>,
    tagsResult: PromiseSettledResult<OllamaTagsResponse | null>,
    psResult: PromiseSettledResult<OllamaPsResponse>,
    includeModels: boolean,
  ): RuntimeProbeStatus {
    const versionOk = versionResult.status === 'fulfilled';
    const tagsOk = !includeModels || tagsResult.status === 'fulfilled';
    const psOk = psResult.status === 'fulfilled';
    if (!versionOk && !tagsOk && !psOk) {
      return RuntimeProbeStatus.UNREACHABLE;
    }
    if (!versionOk) {
      return RuntimeProbeStatus.UNREACHABLE;
    }
    if (!tagsOk || !psOk) {
      return RuntimeProbeStatus.DEGRADED;
    }
    return RuntimeProbeStatus.REACHABLE;
  }

  private buildCapabilities(
    tagsResult: PromiseSettledResult<OllamaTagsResponse | null>,
    psResult: PromiseSettledResult<OllamaPsResponse>,
  ): RuntimeProbeCapabilities {
    const thinking = this.hasThinkingCapableModel(tagsResult, psResult);
    return {
      streamingText: true,
      thinking,
      promptProgress: false,
      nodeProgress: false,
      stepProgress: false,
      cancel: false,
      metrics: false,
    };
  }

  private hasThinkingCapableModel(
    tagsResult: PromiseSettledResult<OllamaTagsResponse | null>,
    psResult: PromiseSettledResult<OllamaPsResponse>,
  ): boolean {
    const names: string[] = [];
    if (tagsResult.status === 'fulfilled' && tagsResult.value !== null) {
      for (const model of tagsResult.value.models ?? []) {
        names.push(model.name);
      }
    }
    if (psResult.status === 'fulfilled') {
      for (const model of psResult.value.models ?? []) {
        names.push(model.name);
      }
    }
    return names.some((name) => this.isThinkingModelName(name));
  }

  private isThinkingModelName(name: string): boolean {
    const lower = name.toLowerCase();
    return THINKING_MODEL_PREFIXES.some((prefix) => lower.startsWith(prefix));
  }

  private extractVersion(result: PromiseSettledResult<OllamaVersionResponse>): string | undefined {
    if (result.status !== 'fulfilled') {
      return undefined;
    }
    return result.value.version;
  }

  private extractModels(
    result: PromiseSettledResult<OllamaTagsResponse | null>,
  ): RuntimeProbeModel[] | undefined {
    if (result.status !== 'fulfilled' || result.value === null) {
      return undefined;
    }
    return (result.value.models ?? []).map((model) => this.mapTagModel(model));
  }

  private mapTagModel(model: OllamaTagModel): RuntimeProbeModel {
    const entry: RuntimeProbeModel = { id: model.name };
    if (typeof model.size === 'number') {
      entry.sizeBytes = model.size;
    }
    if (model.details?.quantization_level !== undefined) {
      entry.quantization = model.details.quantization_level;
    }
    if (model.details?.family !== undefined) {
      entry.family = model.details.family;
    }
    return entry;
  }

  private extractSlots(
    result: PromiseSettledResult<OllamaPsResponse>,
  ): RuntimeProbeSlot[] | undefined {
    if (result.status !== 'fulfilled') {
      return undefined;
    }
    const models = result.value.models ?? [];
    return models.map((model, index) => this.mapPsSlot(model, index));
  }

  private mapPsSlot(model: OllamaPsModel, index: number): RuntimeProbeSlot {
    return { index, modelId: model.name, busy: true };
  }

  private extractErrorMessage(
    result: PromiseSettledResult<OllamaVersionResponse>,
  ): string | undefined {
    if (result.status !== 'rejected') {
      return undefined;
    }
    const reason = result.reason;
    if (reason instanceof Error) {
      return reason.message;
    }
    if (typeof reason === 'string') {
      return reason;
    }
    return 'Runtime unreachable';
  }
}
