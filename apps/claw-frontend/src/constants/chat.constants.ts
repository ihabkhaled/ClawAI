import { RoutingMode, MessageRole } from '@/enums';

export const ROUTING_MODE_LABELS: Record<RoutingMode, string> = {
  [RoutingMode.AUTO]: 'Auto',
  [RoutingMode.MANUAL_MODEL]: 'Manual',
  [RoutingMode.LOCAL_ONLY]: 'Local Only',
  [RoutingMode.PRIVACY_FIRST]: 'Privacy First',
  [RoutingMode.LOW_LATENCY]: 'Low Latency',
  [RoutingMode.HIGH_REASONING]: 'High Reasoning',
  [RoutingMode.COST_SAVER]: 'Cost Saver',
};

export const MESSAGE_ROLE_LABELS: Record<MessageRole, string> = {
  [MessageRole.SYSTEM]: 'System',
  [MessageRole.USER]: 'You',
  [MessageRole.ASSISTANT]: 'Assistant',
  [MessageRole.TOOL]: 'Tool',
};

export const THINKING_INDICATOR_LABEL = 'AI is thinking...';
export const POLLING_INTERVAL_MS = 2000;

/**
 * Rough per-token cost estimates (USD) for common providers.
 * Used only for display — not billing.
 */
export const ESTIMATED_COST_PER_INPUT_TOKEN: Record<string, number> = {
  openai: 0.000003,
  anthropic: 0.000003,
  gemini: 0.0000005,
  deepseek: 0.0000014,
  ollama: 0,
};

export const ESTIMATED_COST_PER_OUTPUT_TOKEN: Record<string, number> = {
  openai: 0.000015,
  anthropic: 0.000015,
  gemini: 0.0000015,
  deepseek: 0.0000028,
  ollama: 0,
};
