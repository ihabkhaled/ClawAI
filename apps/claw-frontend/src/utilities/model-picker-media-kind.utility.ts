import { MODEL_MEDIA_KIND_LABEL_KEYS } from '@/constants/model-capability-badge.constants';
import type { ModelSelection, TranslateFunction } from '@/types';

const MEDIA_KIND_ORDER = [...MODEL_MEDIA_KIND_LABEL_KEYS.keys()];

/** Index in Image, Video, Audio order of the row's media kind; -1 for a chat model. */
function mediaKindIndex(model: ModelSelection): number {
  return MEDIA_KIND_ORDER.findIndex((badge) => model.capabilities?.includes(badge) === true);
}

/**
 * One provider's models with the media-generation ones typed and grouped: chat
 * models first (order kept), then Image, Video and Audio models, each tagged
 * with its translated kind word.
 */
export function typeModelsByMediaKind(
  models: readonly ModelSelection[],
  t: TranslateFunction,
): ModelSelection[] {
  const rank = (model: ModelSelection): number => {
    const index = mediaKindIndex(model);
    return index < 0 ? 0 : index + 1;
  };
  return models
    .map((model) => {
      const badge = MEDIA_KIND_ORDER[mediaKindIndex(model)];
      const key = badge === undefined ? undefined : MODEL_MEDIA_KIND_LABEL_KEYS.get(badge);
      return key === undefined
        ? model
        : { ...model, specifications: [...(model.specifications ?? []), t(key)] };
    })
    .toSorted((a, b) => rank(a) - rank(b));
}
