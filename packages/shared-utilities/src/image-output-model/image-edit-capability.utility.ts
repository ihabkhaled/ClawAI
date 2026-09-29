import { IMAGE_EDIT_CAPABILITIES } from './image-edit-capability.constants';
import { type ImageEditCapability } from './image-edit-capability.types';

/** The provider's row, or undefined for a provider the table does not know. */
export function imageEditCapabilityOf(provider: string): ImageEditCapability | undefined {
  const key = provider.trim().toUpperCase();
  return IMAGE_EDIT_CAPABILITIES.find((entry) => entry.provider === key);
}

/** True when the provider really uses an attached reference image. */
export function supportsImageEdit(provider: string): boolean {
  return imageEditCapabilityOf(provider)?.reference === true;
}

/** True when the provider accepts an alpha mask with the reference. */
export function supportsImageMask(provider: string): boolean {
  return imageEditCapabilityOf(provider)?.mask === true;
}

/**
 * The model an edit runs on for this provider: the picked one when it can
 * edit, else the provider's edit model. Undefined when the provider cannot
 * edit at all.
 */
export function imageEditModelFor(provider: string, model: string): string | undefined {
  const capability = imageEditCapabilityOf(provider);
  if (capability?.reference !== true) return undefined;
  const pattern = capability.editModelPattern;
  return pattern === undefined || pattern.test(model.trim()) ? model : capability.editModel;
}

/**
 * The providers that can edit (optionally: with a mask), in preference order,
 * with the model each would run. Callers filter by their own health view.
 */
export function imageEditProviders(requireMask = false): readonly ImageEditCapability[] {
  return IMAGE_EDIT_CAPABILITIES.filter((entry) => entry.reference && (!requireMask || entry.mask));
}
