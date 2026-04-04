import { RoutingMode } from "@/enums";

export const ROUTING_MODE_OPTIONS = Object.values(RoutingMode);

export const RUNTIME_TYPE_LABELS: Record<string, string> = {
  ollama: "Ollama",
  llamacpp: "llama.cpp",
  vllm: "vLLM",
  lmstudio: "LM Studio",
};

export const MODEL_ROLE_LABELS: Record<string, string> = {
  ROUTER: "Router",
  FALLBACK: "Fallback",
  REASONING: "Reasoning",
  CODING: "Coding",
};

export const MODEL_ROLES = Object.keys(MODEL_ROLE_LABELS);

export const POLICY_FORM_DEFAULTS = {
  name: "",
  routingMode: RoutingMode.AUTO,
  priority: 0,
  isActive: true,
  config: {} as Record<string, unknown>,
};

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0,
};
