import {
  type GenerateRequest,
  type GenerateResponse,
  type LocalModelInfo,
  type PullJobInfo,
  type RuntimeAdapter,
  type RuntimeHealth,
} from '../../types/ollama.types';

export class ComfyUIRuntimeAdapter implements RuntimeAdapter {
  async listModels(): Promise<LocalModelInfo[]> {
    throw new Error(
      'ComfyUI models are managed externally — use ComfyUI Manager to install models',
    );
  }

  async pullModel(_name: string): Promise<PullJobInfo> {
    throw new Error(
      'ComfyUI models cannot be pulled through the Ollama service — use ComfyUI Manager',
    );
  }

  async healthCheck(): Promise<RuntimeHealth> {
    return {
      runtime: 'COMFYUI',
      healthy: false,
      latencyMs: 0,
      errorMessage: 'ComfyUI runtime not yet integrated for health checks',
    };
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error('ComfyUI does not support text generation — use the image service instead');
  }
}
