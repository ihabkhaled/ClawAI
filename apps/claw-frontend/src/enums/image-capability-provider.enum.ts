/**
 * Image-generation capabilities the composer can offer.
 *
 * Prefixed `IMAGE_` because chat-service routes any provider with that prefix
 * to image-service rather than to a chat completion.
 */
export enum ImageCapabilityProvider {
  OPENAI = 'IMAGE_OPENAI',
  GEMINI = 'IMAGE_GEMINI',
  LOCAL = 'IMAGE_LOCAL',
}
