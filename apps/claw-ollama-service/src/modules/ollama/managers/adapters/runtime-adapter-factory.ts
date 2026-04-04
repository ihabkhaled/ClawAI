import { RuntimeType } from "../../../../generated/prisma";
import { type RuntimeAdapter } from "../../types/ollama.types";
import { OllamaRuntimeAdapter } from "./ollama-runtime.adapter";
import { VllmRuntimeAdapter } from "./vllm-runtime.adapter";
import { LlamaCppRuntimeAdapter } from "./llamacpp-runtime.adapter";
import { LocalAIRuntimeAdapter } from "./localai-runtime.adapter";

const adapters: Record<string, RuntimeAdapter> = {
  [RuntimeType.OLLAMA]: new OllamaRuntimeAdapter(),
  [RuntimeType.VLLM]: new VllmRuntimeAdapter(),
  [RuntimeType.LLAMA_CPP]: new LlamaCppRuntimeAdapter(),
  [RuntimeType.LOCAL_AI]: new LocalAIRuntimeAdapter(),
};

export function getRuntimeAdapter(runtime: RuntimeType): RuntimeAdapter {
  const adapter = adapters[runtime];
  if (!adapter) {
    throw new Error(`No adapter registered for runtime: ${runtime}`);
  }
  return adapter;
}
