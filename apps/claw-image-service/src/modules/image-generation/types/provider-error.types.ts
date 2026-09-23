/**
 * The parts of a thrown axios error that say why a provider refused.
 *
 * Declared rather than read off `unknown` with casts: `error.message` is a
 * nested object for OpenAI and Gemini and a bare string for xAI.
 */
export type ProviderErrorBody = {
  error?: { message?: string } | string;
  message?: string;
};

export type ProviderErrorShape = {
  code?: string;
  response?: {
    status?: number;
    data?: ProviderErrorBody;
  };
};
