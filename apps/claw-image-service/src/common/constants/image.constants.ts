export const IMAGE_PROVIDER_OPENAI = 'IMAGE_OPENAI';
export const IMAGE_PROVIDER_GEMINI = 'IMAGE_GEMINI';
export const IMAGE_PROVIDER_LOCAL = 'IMAGE_LOCAL';

export const IMAGE_MODEL_DALLE3 = 'dall-e-3';
export const IMAGE_MODEL_IMAGEN = 'gemini-2.5-flash-image';
export const IMAGE_MODEL_SD_LOCAL = 'sdxl-turbo';

export const IMAGE_FALLBACK_CHAIN: Array<{ provider: string; model: string }> = [
  { provider: IMAGE_PROVIDER_GEMINI, model: IMAGE_MODEL_IMAGEN },
  { provider: IMAGE_PROVIDER_OPENAI, model: IMAGE_MODEL_DALLE3 },
  { provider: IMAGE_PROVIDER_LOCAL, model: IMAGE_MODEL_SD_LOCAL },
];
