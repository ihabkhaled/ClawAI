import { RuntimeProgressStage } from '@claw/shared-types';

import { ImageCapabilityProvider } from '@/enums/image-capability-provider.enum';

export const IMAGE_MODEL_OPTIONS = [
  { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { provider: 'IMAGE_OPENAI', model: 'gpt-image-1', label: 'GPT Image 1 (OpenAI)' },
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
    // Not dall-e-3: OpenAI retired DALL-E for new keys ("The model 'dall-e-3'
    // does not exist"). Must match image-service's IMAGE_MODEL_OPENAI.
    model: 'gpt-image-1',
    displayName: 'GPT Image 1',
    requiresConnector: 'OPENAI',
  },
  {
    provider: ImageCapabilityProvider.LOCAL,
    model: 'sdxl-turbo',
    displayName: 'SDXL Turbo (Local)',
    requiresConnector: 'local-ollama',
  },
] as const;

/**
 * How many `supersededById` links one card follows. image-service resolves up
 * to eight links per read, so this bounds the card at 64 rows of chain.
 */
export const IMAGE_GENERATION_MAX_FOLLOW_HOPS = 8;

/** Status polls after the stream is refused (2 s apart): about five minutes. */
export const IMAGE_GENERATION_MAX_POLLS = 150;

/**
 * The translated line a card shows for each runtime stage a local image
 * runtime (ComfyUI, SD WebUI) reports. A stage not listed shows the fallback.
 */
export const IMAGE_RUNTIME_STAGE_LABEL_KEYS: ReadonlyMap<RuntimeProgressStage, string> = new Map([
  [RuntimeProgressStage.QUEUED, 'chat.imageStage.queued'],
  [RuntimeProgressStage.IDLE, 'chat.imageStage.queued'],
  [RuntimeProgressStage.CONNECTING, 'chat.imageStage.connecting'],
  [RuntimeProgressStage.HEALTH_CHECK, 'chat.imageStage.connecting'],
  [RuntimeProgressStage.MODEL_LOADING, 'chat.imageStage.loadingModel'],
  [RuntimeProgressStage.MODEL_WARMING_UP, 'chat.imageStage.warmingUp'],
  [RuntimeProgressStage.GENERATING, 'chat.imageStage.generating'],
  [RuntimeProgressStage.SAMPLING, 'chat.imageStage.generating'],
  [RuntimeProgressStage.EXECUTING_NODE, 'chat.imageStage.runningWorkflow'],
  [RuntimeProgressStage.NODE_COMPLETED, 'chat.imageStage.runningWorkflow'],
  [RuntimeProgressStage.DECODING, 'chat.imageStage.postProcessing'],
  [RuntimeProgressStage.POST_PROCESSING, 'chat.imageStage.postProcessing'],
  [RuntimeProgressStage.FINALIZING, 'chat.imageStage.saving'],
  [RuntimeProgressStage.SAVING, 'chat.imageStage.saving'],
  [RuntimeProgressStage.DONE, 'chat.imageStage.saving'],
]);

export const IMAGE_RUNTIME_STAGE_FALLBACK_KEY = 'chat.imageStage.working';
