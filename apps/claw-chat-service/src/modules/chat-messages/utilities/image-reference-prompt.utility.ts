import {
  IMAGE_REFERENCE_DESCRIPTION_PREFIX,
  IMAGE_REFERENCE_INSTRUCTION_PREFIX,
} from '../constants/image-generation.constants';

/**
 * The prompt sent to image-service for a reference-image job: the user's
 * instruction first and verbatim, then the vision description as context.
 * When the vision rewrite failed (it returns the user's text unchanged) the
 * user's original prompt is sent as-is (pack §79).
 */
export function buildReferenceImagePrompt(userText: string, visionDescription: string): string {
  const description = visionDescription.trim();
  return description.length === 0 || description === userText.trim()
    ? userText
    : `${IMAGE_REFERENCE_INSTRUCTION_PREFIX}${userText.trim()}\n\n${IMAGE_REFERENCE_DESCRIPTION_PREFIX}${description}`;
}
