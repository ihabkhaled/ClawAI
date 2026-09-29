import { imageEditModelFor, supportsImageEdit, supportsImageMask } from '@claw/shared-utilities';

import { ImageFailureCode } from '../../../common/enums';
import { imageFailure } from '../adapter.utilities/provider-error.utility';
import { type ExecuteImageInput } from '../types/image-generation.types';
import { imageEditRefusal } from './image-mask.utility';

/**
 * Refuses an attempt the provider cannot honour, BEFORE any hold or call
 * (capability table in `@claw/shared-utilities`, never a provider-name if):
 * a reference image on a provider that ignores it → `IMAGE_EDIT_UNAVAILABLE`
 * (it would draw an unrelated picture); a mask on a provider that cannot
 * apply one → 422 `IMAGE_MASK_NOT_SUPPORTED`.
 */
export function assertImageEditSupported(params: ExecuteImageInput): void {
  if (params.maskImageBase64 !== undefined && !supportsImageMask(params.provider)) {
    throw imageEditRefusal(ImageFailureCode.MASK_NOT_SUPPORTED, params.provider);
  }
  if (params.referenceImageBase64 !== undefined && !supportsImageEdit(params.provider)) {
    throw imageFailure(ImageFailureCode.EDIT_UNAVAILABLE, params.provider);
  }
}

/**
 * The model an attempt actually runs (and is metered) on: a reference job on
 * a model that cannot edit moves to the provider's edit model (dall-e-3 →
 * gpt-image-1); everything else keeps the picked model.
 */
export function imageExecutionModel(params: ExecuteImageInput): string {
  return params.referenceImageBase64 === undefined
    ? params.model
    : (imageEditModelFor(params.provider, params.model) ?? params.model);
}
