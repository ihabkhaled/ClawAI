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
 * One Veo instance: the prompt, plus the source image as
 * `image.{bytesBase64Encoded, mimeType}` when given. `predictLongRunning`
 * rejects `inlineData` ("isn't supported by this model"): that is the
 * generateContent shape, not the Veo one.
 */
export function veoInstance(request: VideoStartRequest): VeoInstance {
  return request.sourceImage === undefined
    ? { prompt: request.prompt }
    : {
        prompt: request.prompt,
        image: {
          bytesBase64Encoded: request.sourceImage.base64,
          mimeType: request.sourceImage.mimeType,
        },
      };
}

/**
 * The Gemini Omni `input`: the prompt as text, or `[image, text]` for image-to-video.
 * Omni has no duration field, so the wanted length rides in the prompt.
 */
export function omniInput(
  request: VideoStartRequest,
): string | Array<{ type: string; text?: string; data?: string; mime_type?: string }> {
  const text = `${request.prompt}\n\nClip length: about ${String(request.durationSeconds)} seconds.`;
  return request.sourceImage === undefined
    ? text
    : [
        {
          type: 'image',
          data: request.sourceImage.base64,
          mime_type: request.sourceImage.mimeType,
        },
        { type: 'text', text },
      ];
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
