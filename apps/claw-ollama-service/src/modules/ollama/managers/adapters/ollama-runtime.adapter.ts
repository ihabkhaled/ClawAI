import { type AxiosInstance, createHttpClient } from "@common/utilities";
import { AppConfig } from "../../../../app/config/app.config";
import {
  OLLAMA_API_GENERATE,
  OLLAMA_API_PULL,
  OLLAMA_API_TAGS,
} from "../../ollama.constants";
import type {
  GenerateRequest,
  GenerateResponse,
  LocalModelInfo,
  PullJobInfo,
  RuntimeAdapter,
  RuntimeHealth,
} from "../../types/ollama.types";
import type {
  OllamaGenerateResponse,
  OllamaModelDetail,
  OllamaPullResponse,
  OllamaTagsResponse,
} from "../../types/ollama-adapters.types";

export class OllamaRuntimeAdapter implements RuntimeAdapter {
  private readonly client: AxiosInstance;

  constructor() {
    const config = AppConfig.get();
    this.client = createHttpClient({
      baseURL: config.OLLAMA_BASE_URL,
      timeout: 120_000,
    });
  }

  async listModels(): Promise<LocalModelInfo[]> {
    const response = await this.client.get<OllamaTagsResponse>(OLLAMA_API_TAGS);
    return response.data.models.map((m) => this.mapModel(m));
  }

  async pullModel(name: string): Promise<PullJobInfo> {
    const response = await this.client.post<OllamaPullResponse>(OLLAMA_API_PULL, {
      name,
      stream: false,
    });
    return response.data;
  }

  async healthCheck(): Promise<RuntimeHealth> {
    const start = Date.now();
    try {
      await this.client.get<OllamaTagsResponse>(OLLAMA_API_TAGS, { timeout: 5000 });
      return {
        runtime: "OLLAMA",
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        runtime: "OLLAMA",
        healthy: false,
        latencyMs: Date.now() - start,
        errorMessage: message,
      };
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.client.post<OllamaGenerateResponse>(OLLAMA_API_GENERATE, {
      model: request.model,
      prompt: request.prompt,
      stream: false,
      options: request.options,
    });
    const data = response.data;
    return {
      model: data.model,
      createdAt: data.created_at,
      response: data.response,
      done: data.done,
      totalDuration: data.total_duration,
      loadDuration: data.load_duration,
      promptEvalCount: data.prompt_eval_count,
      evalCount: data.eval_count,
      evalDuration: data.eval_duration,
    };
  }

  private mapModel(m: OllamaModelDetail): LocalModelInfo {
    const parts = m.name.split(":");
    const name = parts[0] ?? m.name;
    const tag = parts[1] ?? "latest";
    return {
      name,
      tag,
      sizeBytes: BigInt(m.size),
      family: m.details.family,
      parameters: m.details.parameter_size,
      quantization: m.details.quantization_level,
    };
  }
}
