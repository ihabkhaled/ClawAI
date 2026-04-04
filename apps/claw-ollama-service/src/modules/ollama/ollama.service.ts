import { Injectable, Logger } from "@nestjs/common";
import axios, { type AxiosInstance } from "axios";
import { AppConfig } from "../../app/config/app.config";
import {
  OLLAMA_API_GENERATE,
  OLLAMA_API_PULL,
  OLLAMA_API_TAGS,
  OLLAMA_API_VERSION,
} from "./ollama.constants";
import {
  GenerateRequest,
  GenerateResponse,
  OllamaModelsResponse,
  OllamaStatusResponse,
  PullModelRequest,
  PullModelResponse,
} from "./ollama.types";

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;

  constructor() {
    const config = AppConfig.get();
    this.client = axios.create({
      baseURL: config.OLLAMA_BASE_URL,
      timeout: 120_000,
    });
  }

  async listModels(): Promise<OllamaModelsResponse> {
    const response = await this.client.get<OllamaModelsResponse>(OLLAMA_API_TAGS);
    return response.data;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.client.post<GenerateResponse>(OLLAMA_API_GENERATE, {
      ...request,
      stream: false,
    });
    return response.data;
  }

  async pullModel(request: PullModelRequest): Promise<PullModelResponse> {
    const response = await this.client.post<PullModelResponse>(OLLAMA_API_PULL, {
      ...request,
      stream: false,
    });
    return response.data;
  }

  async checkStatus(): Promise<OllamaStatusResponse> {
    try {
      const response = await this.client.get<{ version: string }>(OLLAMA_API_VERSION, {
        timeout: 3000,
      });
      return { connected: true, version: response.data.version };
    } catch (error) {
      this.logger.warn(`Ollama connectivity check failed: ${String(error)}`);
      return { connected: false };
    }
  }
}
