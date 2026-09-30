import {
  type ImageEditCapability,
  imageEditProviders,
  supportsImageMask,
} from '@claw/shared-utilities';

/**
 * The provider an attachment edit runs on: the first edit-capable one, or the
 * first that can also apply a drawn mask when the turn carries one (Gemini and
 * Stable Diffusion cannot, and would answer a masked edit with a 422).
 */
export function selectImageEditor(hasMask: boolean): ImageEditCapability | undefined {
  return imageEditProviders(hasMask)[0];
}

/**
 * True when routing already chose an image-output provider (`IMAGE_*`) that can
 * take the turn as it is. A masked turn on one that cannot apply a mask (Gemini,
 * Stable Diffusion) must still be moved to a mask-capable editor.
 */
export function keepsRoutedImageProvider(selectedProvider: string, hasMask: boolean): boolean {
  return !selectedProvider.startsWith('IMAGE_') ? false : !hasMask || supportsImageMask(selectedProvider);
}
