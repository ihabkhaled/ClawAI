import { knownContextWindow } from '@claw/shared-utilities';
import type { NormalizedModel } from '../types/connectors.types';

/**
 * Fills a missing window from the known-family table. A window the provider
 * reported is never overwritten: the provider knows its own models better
 * than a table does.
 */
export function withKnownContextWindows(
  provider: string,
  models: readonly NormalizedModel[],
): NormalizedModel[] {
  return models.map((model) => {
    if (model.capabilities.maxContextTokens !== undefined) {
      return model;
    }
    const tokens = knownContextWindow(provider, model.modelKey);
    return tokens === undefined
      ? model
      : { ...model, capabilities: { ...model.capabilities, maxContextTokens: tokens } };
  });
}

/** Google's native API base for the OpenAI-compatible base a connector stores. */
export function geminiNativeBaseUrl(openAiCompatibleBase: string): string {
  return openAiCompatibleBase.replace(/\/+$/u, '').replace(/\/openai$/u, '');
}
