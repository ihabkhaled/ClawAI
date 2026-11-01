import {
  AUDIO_OUTPUT_MODEL_PATTERN,
  IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR,
} from '@/constants/image.constants';

/** Whether a chat-connector model id is an image-output model (drives the picker badge). */
export function isImageOutputModel(connectorProvider: string, modelKey: string): boolean {
  const pattern = IMAGE_OUTPUT_MODEL_PATTERNS_BY_CONNECTOR.get(connectorProvider.toUpperCase());
  return pattern !== undefined && pattern.test(modelKey);
}

/** Whether a model id is an audio-output model (speech or music), whatever the connector. */
export function isAudioOutputModel(modelKey: string): boolean {
  return AUDIO_OUTPUT_MODEL_PATTERN.test(modelKey);
}
