import { type InstalledModelInfo } from '../../routing/types/installed-model.types';
import { ROUTER_MODEL_PREFERENCE_ORDER } from '../constants/router-model-resolver.constants';

/**
 * Which Ollama model should plan the route, right now.
 *
 * `OLLAMA_ROUTER_MODEL` used to be the answer on its own — a single hardcoded
 * name. That breaks in both directions: pin a model the deployment has not
 * pulled and every route plan fails until someone notices the env var, and pin
 * a small one and it silently stays the planner long after better models are
 * available on the connector.
 *
 * So the configured value becomes a PREFERENCE, not a requirement:
 *
 *   1. Use the configured model if the connector actually has it. An operator
 *      who pinned a model meant it.
 *   2. Otherwise take the first name in the preference order that is present.
 *   3. Otherwise take any installed model at all — a worse planner still beats
 *      no planner, because a failed plan falls back to deterministic routing.
 *   4. With nothing installed, return the configured name unchanged and let the
 *      call fail honestly rather than inventing a model name.
 *
 * Matching is on the bare name, so `deepseek-v4-pro` matches whether the
 * connector reports it as `deepseek-v4-pro`, `deepseek-v4-pro:cloud` or
 * `deepseek-v4-pro:latest` — the tag is a deployment detail, not a different
 * model.
 */
export function resolveRouterModel(
  configuredModel: string,
  installed: readonly InstalledModelInfo[],
): string {
  if (installed.length === 0) {
    return configuredModel;
  }
  const names = installed.map((model) => model.name);

  const configuredMatch = findByBaseName(names, configuredModel);
  if (configuredMatch !== null) {
    return configuredMatch;
  }
  for (const preferred of ROUTER_MODEL_PREFERENCE_ORDER) {
    const match = findByBaseName(names, preferred);
    if (match !== null) {
      return match;
    }
  }
  return names[0] ?? configuredModel;
}

function findByBaseName(names: readonly string[], wanted: string): string | null {
  const target = baseName(wanted);
  return names.find((name) => baseName(name) === target) ?? null;
}

/** `kimi-k2.7-code:cloud` and `kimi-k2.7-code:latest` are the same model. */
function baseName(model: string): string {
  return model.split(':')[0]?.toLowerCase() ?? model.toLowerCase();
}
