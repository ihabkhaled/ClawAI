import type { ImageProviderResponse } from '../types/image-generation.types';

/**
 * The MEASURED `imageUnits` for a finalize: how many images the provider
 * actually handed back.
 *
 * Every adapter returns at most one image per call, as either base64 or a URL.
 * A response carrying neither produced nothing billable, so it counts zero —
 * and settles at $0 on a per-image rate rather than charging for an empty
 * answer. (In practice the adapters throw on that case first, and the hold is
 * released instead.)
 */
export function countReturnedImages(response: ImageProviderResponse): number {
  const hasImage = Boolean(response.imageBase64) || Boolean(response.imageUrl);
  return hasImage ? 1 : 0;
}
