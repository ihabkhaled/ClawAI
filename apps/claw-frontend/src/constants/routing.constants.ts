import { RoutingMode } from '@/enums';

export const ROUTING_MODE_OPTIONS = Object.values(RoutingMode);

export const RUNTIME_TYPE_LABELS: Record<string, string> = {
  ollama: 'Ollama',
  llamacpp: 'llama.cpp',
  vllm: 'vLLM',
  lmstudio: 'LM Studio',
};

export const MODEL_ROLE_LABELS: Record<string, string> = {
  ROUTER: 'Routing',
  FALLBACK: 'Chatting',
  REASONING: 'Reasoning',
  CODING: 'Coding',
  LOCAL_FALLBACK_CHAT: 'Chatting',
  LOCAL_REASONING: 'Reasoning',
  LOCAL_CODING: 'Coding',
  LOCAL_FILE_GENERATION: 'File generation',
  LOCAL_THINKING: 'Thinking',
  LOCAL_IMAGE_GENERATION: 'Image generation',
};

export const MODEL_ROLES = Object.keys(MODEL_ROLE_LABELS);

export const POLICY_FORM_DEFAULTS = {
  name: '',
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

export const POLICY_WEIGHT_DIMENSIONS = [
  'capability',
  'domain',
  'role',
  'modality',
  'cost',
  'latency',
  'health',
  'privacy',
  'learnedSuccess',
  'judgeTrust',
  'contextFit',
  'uncertaintyPenalty',
  'riskPenalty',
  'fallbackReliability',
] as const;

export const POLICY_WEIGHTS_SUM_TOLERANCE = 0.001;
