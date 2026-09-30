import type { VideoProviderConfig } from '../types/video-generation.types';

/**
 * The Gemini API base: the connector may store the OpenAI-compat address
 * (`.../v1beta/openai`), which is not where Veo lives.
 */
export function veoBase(config: VideoProviderConfig): string {
  return config.baseUrl.replace(/\/+$/u, '').replace(/\/openai$/u, '');
}

export function veoBareModel(model: string): string {
  return model.replace(/^models\//u, '');
}

export function veoAuthHeaders(config: VideoProviderConfig): Record<string, string> {
  return { 'x-goog-api-key': config.apiKey };
}

export function xaiBase(config: VideoProviderConfig): string {
  return config.baseUrl.replace(/\/+$/u, '');
}

export function xaiAuthHeaders(config: VideoProviderConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.apiKey}` };
}
