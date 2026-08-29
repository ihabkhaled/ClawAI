export const IMAGE_PROVIDER_OPENAI = 'IMAGE_OPENAI';
export const IMAGE_PROVIDER_GEMINI = 'IMAGE_GEMINI';
export const IMAGE_PROVIDER_LOCAL = 'IMAGE_LOCAL';
export const IMAGE_PROVIDER_LOCAL_COMFYUI = 'IMAGE_LOCAL_COMFYUI';

export const IMAGE_MODEL_DALLE3 = 'dall-e-3';
export const IMAGE_MODEL_IMAGEN = 'gemini-2.5-flash-image';
export const IMAGE_MODEL_SD_LOCAL = 'sdxl-turbo';
export const IMAGE_MODEL_COMFYUI_SD15 = 'sd_v1-5';

export const IMAGE_FALLBACK_CHAIN: Array<{ provider: string; model: string }> = [
  { provider: IMAGE_PROVIDER_GEMINI, model: IMAGE_MODEL_IMAGEN },
  { provider: IMAGE_PROVIDER_OPENAI, model: IMAGE_MODEL_DALLE3 },
  { provider: IMAGE_PROVIDER_LOCAL, model: IMAGE_MODEL_SD_LOCAL },
  { provider: IMAGE_PROVIDER_LOCAL_COMFYUI, model: IMAGE_MODEL_COMFYUI_SD15 },
];

/**
 * Image providers that run on hardware the operator already owns, so a
 * generation costs no marginal money and is never metered.
 *
 * Kept as a set rather than "everything that is not OpenAI/Gemini" so that
 * adding a new CLOUD provider fails closed: an unlisted provider is treated as
 * paid and goes through the meter, which is the safe direction to be wrong in.
 */
export const IMAGE_LOCAL_PROVIDERS: readonly string[] = [
  IMAGE_PROVIDER_LOCAL,
  IMAGE_PROVIDER_LOCAL_COMFYUI,
];
