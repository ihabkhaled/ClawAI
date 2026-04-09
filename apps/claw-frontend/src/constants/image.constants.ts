export const IMAGE_MODEL_OPTIONS = [
  { provider: 'IMAGE_GEMINI', model: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { provider: 'IMAGE_OPENAI', model: 'dall-e-3', label: 'DALL-E 3 (OpenAI)' },
  { provider: 'IMAGE_LOCAL', model: 'sdxl-turbo', label: 'SDXL Turbo (Local)' },
] as const;
