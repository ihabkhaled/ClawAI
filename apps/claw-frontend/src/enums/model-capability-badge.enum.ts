/**
 * A capability indicator on a model-picker row. Derived ONLY from that row's
 * own catalog flags (`supportsVision`, `supportsAudio`, `supportsVideoInput`)
 * or, for the image-generation entries, from being an image model — never
 * from the provider. A vision-capable provider's text-only model shows none.
 */
export enum ModelCapabilityBadge {
  Vision = 'VISION',
  AudioInput = 'AUDIO_INPUT',
  VideoInput = 'VIDEO_INPUT',
  ImageOutput = 'IMAGE_OUTPUT',
}
