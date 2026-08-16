import {
  MODEL_ID_PATH_PREFIXES,
  OLLAMA_CLOUD_PROVIDER,
  OLLAMA_CLOUD_SUFFIXES,
} from '../constants/model-discovery.constants';
import type { AliasMatchCandidate } from '../types/model-discovery.types';

/**
 * Reduces a provider model id to a comparable form.
 *
 * Providers disagree on decoration, not identity: Gemini returns
 * `models/gemini-2.5-flash` where a chain entry is written
 * `gemini-2.5-flash`. Comparing raw strings would fail to match a model that
 * plainly exists.
 *
 * Only decoration is removed. Anything that changes WHICH model is meant — an
 * Ollama `:cloud` suffix, a dated snapshot suffix, a size marker — is left
 * alone, because `glm-4.7:cloud` and `glm-4.7` are not interchangeable and
 * collapsing them would resolve an alias to a different endpoint.
 */
export function normalizeModelId(raw: string, provider?: string): string {
  const trimmed = raw.trim().toLowerCase();
  const prefix = MODEL_ID_PATH_PREFIXES.find((candidate) => trimmed.startsWith(candidate));
  const withoutPrefix = prefix ? trimmed.slice(prefix.length) : trimmed;

  // The cloud marker is decoration for OLLAMA_CLOUD and only there: that
  // connector is the hosted ollama.com endpoint, so `gpt-oss:120b-cloud` and
  // `gpt-oss:120b` are the same model written two ways. Stripping it for any
  // other provider — or for local OLLAMA — would erase a real distinction.
  if (provider === OLLAMA_CLOUD_PROVIDER) {
    const marker = OLLAMA_CLOUD_SUFFIXES.find((candidate) => withoutPrefix.endsWith(candidate));
    return marker ? withoutPrefix.slice(0, -marker.length) : withoutPrefix;
  }

  return withoutPrefix;
}

/**
 * Finds the deployment a chain alias refers to.
 *
 * Matching is deliberately exact-after-normalization. There is no family or
 * prefix fallback: substituting `gemini-2.5-flash` for a configured
 * `gemini-3.5-flash-lite` would mean the admin page shows a chain that is not
 * the one running, and an operator would have no way to notice.
 *
 * An alias that matches nothing returns null and stays visibly unresolved.
 */
export function matchAliasToDeployment(
  alias: string,
  provider: string,
  candidates: readonly AliasMatchCandidate[],
): AliasMatchCandidate | null {
  const target = normalizeModelId(alias, provider);

  return (
    candidates.find(
      (candidate) =>
        candidate.provider === provider &&
        normalizeModelId(candidate.providerModelId, provider) === target,
    ) ?? null
  );
}
