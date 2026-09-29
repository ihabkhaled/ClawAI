/** Pixel size read from an image header. */
export type ImageDimensions = {
  width: number;
  height: number;
};

/** One OpenAI edit call (`POST /v1/images/edits`). */
export type OpenAIImageEditRequest = {
  baseUrl: string;
  apiKey: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  quality?: string;
  imageBase64: string;
  imageMimeType?: string;
  maskBase64?: string;
};
