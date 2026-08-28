import { ImageCapabilityProvider } from '@/enums/image-capability-provider.enum';

export const IMAGE_MODEL_OPTIONS = [
  { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { provider: 'IMAGE_OPENAI', model: 'dall-e-3', label: 'DALL-E 3 (OpenAI)' },
  { provider: 'IMAGE_LOCAL', model: 'sdxl-turbo', label: 'SDXL Turbo (Local)' },
] as const;

/**
 * Image generation, and the chat connector whose credentials each one borrows.
 *
 * Image capabilities are not connector deployments of their own:
 * image-service resolves the OpenAI or Google connector config at call time and
 * uses that API key. So a capability is offerable exactly when the connector it
 * borrows from has models — the same credential the request will resolve.
 *
 * `IMAGE_LOCAL` is Stable Diffusion (SDXL), which runs in the opt-in `local-ai`
 * compose profile alongside Ollama and llama.cpp. It is keyed off the local
 * Ollama group for the same reason: that group is non-empty only when the
 * local-ai profile is actually running, so a cloud-only install never sees it.
 */
export const IMAGE_CAPABILITIES = [
  {
    provider: ImageCapabilityProvider.GEMINI,
    model: 'gemini-2.5-flash-image',
    displayName: 'Gemini 2.5 Flash Image',
    requiresConnector: 'GEMINI',
  },
  {
    provider: ImageCapabilityProvider.OPENAI,
    model: 'dall-e-3',
    displayName: 'DALL-E 3',
    requiresConnector: 'OPENAI',
  },
  {
    provider: ImageCapabilityProvider.LOCAL,
    model: 'sdxl-turbo',
    displayName: 'SDXL Turbo (Local)',
    requiresConnector: 'local-ollama',
  },
] as const;
