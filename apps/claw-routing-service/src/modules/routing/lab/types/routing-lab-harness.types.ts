import type { RouterInferenceProvider } from '../../types/router-inference.types';

/**
 * One case's fault-injected stand-ins for the three providers
 * `CloudRouterManager` is wired to. Cast to the concrete adapter classes at
 * the construction boundary only — see `routing-lab-runner.manager.ts`.
 */
export interface RoutingLabProviderAdapters {
  readonly gemini: RouterInferenceProvider;
  readonly ollamaCloud: RouterInferenceProvider;
  readonly legacyLocal: RouterInferenceProvider;
}
