import { type ImageEditCapability, imageEditProviders } from '@claw/shared-utilities';

/**
 * The provider an attachment edit runs on: the first edit-capable one, or the
 * first that can also apply a drawn mask when the turn carries one (Gemini and
 * Stable Diffusion cannot, and would answer a masked edit with a 422).
 */
export function selectImageEditor(hasMask: boolean): ImageEditCapability | undefined {
  return imageEditProviders(hasMask)[0];
}
