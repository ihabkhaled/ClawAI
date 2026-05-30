import { type OllamaChatMessage } from './execution.types';

// Reason codes for an image part that could not be transformed into a native
// Ollama `images: string[]` entry; surfaced to the caller for logging/warnings.
export type OllamaMessageShapeWarningReason =
  | 'MALFORMED_DATA_URL'
  | 'NON_DATA_URL_IMAGE'
  | 'EMPTY_IMAGE_PAYLOAD';

export type OllamaMessageShapeWarning = {
  reason: OllamaMessageShapeWarningReason;
  detail: string;
};

export type OllamaMessageShapeResult = {
  messages: OllamaChatMessage[];
  imageCount: number;
  warnings: OllamaMessageShapeWarning[];
};

// Internal per-message transform result used by transformSingleMessage().
export type OllamaSingleMessageTransformResult = {
  message: OllamaChatMessage;
  imageCount: number;
};
