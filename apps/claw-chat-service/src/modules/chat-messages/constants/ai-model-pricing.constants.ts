import { type ModelPriceEntry } from '../types/pricing.types';

// Provider strings whose models run locally and incur no API cost. Cost for
// these is reported as $0 (available), never "unavailable".
export const LOCAL_FREE_PROVIDERS = ['local-ollama', 'ollama', 'local-llamacpp', 'llamacpp'] as const;

// Approximate USD-per-1M-token list prices, keyed by a lowercase substring of
// the model name (longest match wins). Unknown models report cost as
// unavailable rather than $0. Prices are indicative for ESTIMATED display only
// and should be reviewed periodically.
export const MODEL_PRICING: Readonly<Record<string, ModelPriceEntry>> = {
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10 },
  'gpt-4.1-mini': { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  'gpt-4.1': { inputPerMillion: 2, outputPerMillion: 8 },
  o1: { inputPerMillion: 15, outputPerMillion: 60 },
  'claude-3-5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4 },
  'claude-3-5-sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-opus': { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-haiku': { inputPerMillion: 0.8, outputPerMillion: 4 },
  'gemini-2.5-flash': { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10 },
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },
  'deepseek-chat': { inputPerMillion: 0.27, outputPerMillion: 1.1 },
  'grok-2': { inputPerMillion: 2, outputPerMillion: 10 },
  'grok-beta': { inputPerMillion: 5, outputPerMillion: 15 },
};
