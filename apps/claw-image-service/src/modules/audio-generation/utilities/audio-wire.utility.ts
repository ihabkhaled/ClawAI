import { OPENAI_DEFAULT_BASE_URL } from '../constants/audio-generation.constants';
import type { AudioProviderConfig } from '../types/audio-generation.types';

/** The Gemini API base: the connector may store the OpenAI-compat address (`.../openai`). */
export function geminiBase(config: AudioProviderConfig): string {
  return config.baseUrl.replace(/\/+$/u, '').replace(/\/openai$/u, '');
}

export function openAiBase(config: AudioProviderConfig): string {
  const base = config.baseUrl.replace(/\/+$/u, '');
  return base.length === 0 ? OPENAI_DEFAULT_BASE_URL : base;
}

export function geminiAuthHeaders(config: AudioProviderConfig): Record<string, string> {
  return { 'x-goog-api-key': config.apiKey };
}

export function openAiAuthHeaders(config: AudioProviderConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiKey}` };
}

/** The bare model id the routing seed prices by: no Gemini `models/` catalog prefix. */
export function audioPriceKey(model: string): string {
  return model.trim().replace(/^models\//u, '');
}
