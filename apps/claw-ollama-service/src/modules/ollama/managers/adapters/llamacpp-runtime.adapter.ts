import {
  type GenerateRequest,
  type GenerateResponse,
  type LocalModelInfo,
  type PullJobInfo,
  type RuntimeAdapter,
  type RuntimeHealth,
} from "../../types/ollama.types";

export class LlamaCppRuntimeAdapter implements RuntimeAdapter {
  async listModels(): Promise<LocalModelInfo[]> {
    throw new Error("LlamaCpp adapter not yet implemented");
  }

  async pullModel(_name: string): Promise<PullJobInfo> {
    throw new Error("LlamaCpp adapter not yet implemented");
  }

  async healthCheck(): Promise<RuntimeHealth> {
    return {
      runtime: "LLAMA_CPP",
      healthy: false,
      latencyMs: 0,
      errorMessage: "LlamaCpp adapter not yet implemented",
    };
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("LlamaCpp adapter not yet implemented");
  }
}
