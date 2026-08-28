import {
  ANTHROPIC_MODEL_SNAPSHOT_SUFFIX,
  ANTHROPIC_MODELS_WITHOUT_SAMPLING,
} from '../constants/anthropic-sampling.constants';

// Whether sending `temperature` (or any sampling control) to this model would
// be rejected. Keyed on the model id rather than the provider, because the same
// Claude model is reachable through both the native Messages route and the
// OpenAI-compatible one and is equally strict on either.
export function modelRejectsSamplingParams(model: string): boolean {
  const normalized = model.trim().toLowerCase().replace(ANTHROPIC_MODEL_SNAPSHOT_SUFFIX, '');
  return ANTHROPIC_MODELS_WITHOUT_SAMPLING.includes(normalized);
}
