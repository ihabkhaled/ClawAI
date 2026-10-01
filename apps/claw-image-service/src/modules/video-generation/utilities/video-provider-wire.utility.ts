import type {
  VeoInstance,
  VideoProviderConfig,
  VideoStartRequest,
} from '../types/video-generation.types';

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

/**
 * One Veo instance: the prompt, plus the source image as `image.inlineData`
 * (the Gemini API shape; `bytesBase64Encoded` is the Vertex one) when given.
 */
export function veoInstance(request: VideoStartRequest): VeoInstance {
  return request.sourceImage === undefined
    ? { prompt: request.prompt }
    : {
        prompt: request.prompt,
        image: {
          inlineData: { mimeType: request.sourceImage.mimeType, data: request.sourceImage.base64 },
        },
      };
}

/** xAI takes the source image as `image: {url}`; a base64 data URI is accepted there. */
export function xaiImageField(request: VideoStartRequest): { image?: { url: string } } {
  return request.sourceImage === undefined
    ? {}
    : {
        image: {
          url: `data:${request.sourceImage.mimeType};base64,${request.sourceImage.base64}`,
        },
      };
}
