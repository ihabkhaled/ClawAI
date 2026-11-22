import { ENHANCE_MODEL_ID_SEPARATOR } from '../constants/enhance.constants';
import type { ModelRef } from '../types/enhance.types';

/** `provider/model` split at the first slash, or the model alone with an explicit provider. Null when unusable. */
export function resolveModelRef(modelId: string, provider: string | undefined): ModelRef | null {
  if (provider !== undefined) return { provider, model: modelId };
  const at = modelId.indexOf(ENHANCE_MODEL_ID_SEPARATOR);
  return at <= 0 || at === modelId.length - 1
    ? null
    : { provider: modelId.slice(0, at), model: modelId.slice(at + 1) };
}
