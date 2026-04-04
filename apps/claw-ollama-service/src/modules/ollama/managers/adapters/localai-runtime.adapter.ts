import {
  type RuntimeAdapter,
  type LocalModelInfo,
  type PullJobInfo,
  type RuntimeHealth,
  type GenerateRequest,
  type GenerateResponse,
} from "../../types/ollama.types";

export class LocalAIRuntimeAdapter implements RuntimeAdapter {
  async listModels(): Promise<LocalModelInfo[]> {
    throw new Error("LocalAI adapter not yet implemented");
  }

  async pullModel(_name: string): Promise<PullJobInfo> {
    throw new Error("LocalAI adapter not yet implemented");
  }

  async healthCheck(): Promise<RuntimeHealth> {
    return {
      runtime: "LOCAL_AI",
      healthy: false,
      latencyMs: 0,
      errorMessage: "LocalAI adapter not yet implemented",
    };
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("LocalAI adapter not yet implemented");
  }
}
