import {
  type GenerateRequest,
  type GenerateResponse,
  type LocalModelInfo,
  type PullJobInfo,
  type RuntimeAdapter,
  type RuntimeHealth,
} from "../../types/ollama.types";

export class VllmRuntimeAdapter implements RuntimeAdapter {
  async listModels(): Promise<LocalModelInfo[]> {
    throw new Error("VLLM adapter not yet implemented");
  }

  async pullModel(_name: string): Promise<PullJobInfo> {
    throw new Error("VLLM adapter not yet implemented");
  }

  async healthCheck(): Promise<RuntimeHealth> {
    return {
      runtime: "VLLM",
      healthy: false,
      latencyMs: 0,
      errorMessage: "VLLM adapter not yet implemented",
    };
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error("VLLM adapter not yet implemented");
  }
}
