import {
  ANTHROPIC_MODEL_FAMILY_SEPARATOR,
  ANTHROPIC_MODEL_SNAPSHOT_SUFFIX,
  ANTHROPIC_MODEL_VENDOR_PREFIX,
  ANTHROPIC_MODELS_WITHOUT_SAMPLING,
} from '../constants/anthropic-sampling.constants';

// Whether sending `temperature` (or any sampling control) to this model would
// be rejected. Keyed on the model id rather than the provider, because the same
// Claude model is reachable through both the native Messages route and the
// OpenAI-compatible one and is equally strict on either.
//
// An entry matches its whole family: `claude-opus-5` covers `claude-opus-5-5`
// and `claude-opus-5-20260101`, but never `claude-opus-50`.
export function modelRejectsSamplingParams(model: string): boolean {
  const normalized = model
    .trim()
    .toLowerCase()
    .replace(ANTHROPIC_MODEL_VENDOR_PREFIX, '')
    .replace(ANTHROPIC_MODEL_SNAPSHOT_SUFFIX, '');
  return ANTHROPIC_MODELS_WITHOUT_SAMPLING.some(
    (family) =>
      normalized === family || normalized.startsWith(`${family}${ANTHROPIC_MODEL_FAMILY_SEPARATOR}`),
  );
}
